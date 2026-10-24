import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from users.auth.utils import cryptography, email_service

from .models import PatientAccessGrant, PatientGrantChallenge, PatientIdentity


CHALLENGE_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(seconds=60)


class IdentityAlreadyLinkedError(Exception):
    pass


class GrantRateLimitedError(Exception):
    pass


def normalize_email(email):
    return email.strip().casefold()


def email_fingerprint(email):
    return hmac.new(settings.SECRET_KEY.encode(), normalize_email(email).encode(), hashlib.sha256).hexdigest()


def mask_email(email):
    local, domain = normalize_email(email).split("@", 1)
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}{'*' * max(3, len(local) - len(visible))}@{domain}"


def generate_code():
    return f"{secrets.randbelow(1_000_000):06d}"


@transaction.atomic
def prepare_email_grant(*, patient, institution, requested_by, email):
    normalized = normalize_email(email)
    fingerprint = email_fingerprint(normalized)
    identity, _ = PatientIdentity.objects.get_or_create(
        email_fingerprint=fingerprint,
        defaults={"email_ciphertext": cryptography.encrypt(normalized)},
    )
    existing_grant = PatientAccessGrant.objects.select_for_update().filter(
        institution=institution,
        tenant_patient_id=patient.id,
    ).first()
    if existing_grant and existing_grant.status == PatientAccessGrant.Status.ACTIVE:
        raise IdentityAlreadyLinkedError("Patient identity is already verified")

    now = timezone.now()
    if existing_grant:
        latest_challenge = existing_grant.challenges.order_by("-created_at").first()
        if latest_challenge and latest_challenge.created_at > now - RESEND_COOLDOWN:
            raise GrantRateLimitedError("A verification code was sent recently")

    if existing_grant:
        grant = existing_grant
        grant.identity = identity
        grant.requested_by = requested_by
        grant.status = PatientAccessGrant.Status.PENDING
        grant.verified_at = None
        grant.revoked_at = None
        grant.save(update_fields=("identity", "requested_by", "status", "verified_at", "revoked_at"))
    else:
        grant = PatientAccessGrant.objects.create(
            institution=institution,
            tenant_patient_id=patient.id,
            identity=identity,
            requested_by=requested_by,
        )
    grant.challenges.filter(consumed_at__isnull=True).update(consumed_at=now)
    code = generate_code()
    challenge = PatientGrantChallenge.objects.create(
        grant=grant,
        identity=identity,
        code_hash=make_password(code),
        expires_at=now + CHALLENGE_TTL,
    )
    return challenge, mask_email(normalized), normalized, code


def start_email_grant(*, patient, institution, requested_by, email):
    """Persist the challenge, commit it, then perform the external email call."""
    challenge, masked_email, normalized, code = prepare_email_grant(
        patient=patient,
        institution=institution,
        requested_by=requested_by,
        email=email,
    )
    sent = email_service.send(
        normalized,
        "Verify patient identity access",
        f"Your NeuroVision verification code is {code}. It expires in 10 minutes.",
    )
    if not sent:
        challenge.delete()
        raise RuntimeError("Verification email could not be delivered")
    return challenge, masked_email


@transaction.atomic
def verify_email_grant(*, patient, institution, challenge_id, code):
    challenge = PatientGrantChallenge.objects.select_for_update().select_related("grant", "identity").filter(
        id=challenge_id,
        grant__institution=institution,
        grant__tenant_patient_id=patient.id,
    ).first()
    if challenge is None or challenge.consumed_at or challenge.expires_at <= timezone.now():
        return None
    if challenge.grant.identity_id != challenge.identity_id:
        return None
    if challenge.attempts >= MAX_ATTEMPTS:
        return None
    challenge.attempts += 1
    if not check_password(code, challenge.code_hash):
        challenge.save(update_fields=("attempts",))
        return None

    now = timezone.now()
    challenge.consumed_at = now
    challenge.save(update_fields=("attempts", "consumed_at"))
    grant = challenge.grant
    grant.status = PatientAccessGrant.Status.ACTIVE
    grant.verified_at = now
    grant.revoked_at = None
    grant.save(update_fields=("status", "verified_at", "revoked_at"))
    identity = challenge.identity
    identity.email_verified_at = now
    identity.save(update_fields=("email_verified_at", "updated_at"))
    patient.global_identity_id = identity.id
    patient.save(update_fields=("global_identity_id", "updated_at"))
    return grant


def get_grant_status(*, patient, institution):
    grant = PatientAccessGrant.objects.select_related("identity").filter(
        institution=institution,
        tenant_patient_id=patient.id,
    ).first()
    if grant is None:
        return {"status": "UNLINKED", "verified_at": None}
    return {
        "status": grant.status,
        "verified_at": grant.verified_at,
    }
