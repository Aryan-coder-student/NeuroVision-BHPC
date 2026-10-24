"""Patient registration orchestration; leave OTP lifecycle to patient_identity."""
from django.db import transaction

from patient_identity.models import (
    PatientAccessGrant,
    PatientGrantChallenge,
    PatientIdentity,
)
from patient_identity.services import start_email_grant

from .models import Patient


def register_patient(*, institution, requested_by, display_name, date_of_birth, email):
    """Create a patient, then send OTP without holding an open DB transaction."""
    with transaction.atomic():
        patient = Patient.objects.create(
            display_name=display_name,
            date_of_birth=date_of_birth,
        )
    try:
        challenge, masked_email = start_email_grant(
            patient=patient,
            institution=institution,
            requested_by=requested_by,
            email=email,
        )
    except RuntimeError:
        _remove_patient_and_grant(patient=patient, institution=institution)
        raise
    return patient, challenge, masked_email


@transaction.atomic
def _remove_patient_and_grant(*, patient, institution):
    grants = PatientAccessGrant.objects.filter(
        institution=institution,
        tenant_patient_id=patient.id,
    )
    identity_ids = set(grants.values_list("identity_id", flat=True))
    identity_ids.update(
        PatientGrantChallenge.objects.filter(grant__in=grants).values_list(
            "identity_id",
            flat=True,
        )
    )
    grants.delete()
    patient.delete()
    PatientIdentity.objects.filter(id__in=identity_ids, grants__isnull=True).delete()


def delete_patient(*, patient, institution):
    _remove_patient_and_grant(patient=patient, institution=institution)
