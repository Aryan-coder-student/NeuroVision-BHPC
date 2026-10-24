"""Patient registration orchestration; leave OTP lifecycle to patient_identity."""
from django.db import transaction

from patient_identity.models import (
    PatientAccessGrant,
    PatientGrantChallenge,
    PatientIdentity,
)
from patient_identity.services import start_email_grant

from .models import Patient, PatientDemographicChange


class PatientVersionConflict(Exception):
    def __init__(self, current_patient):
        self.current_patient = current_patient
        super().__init__("The patient record changed after it was loaded.")


@transaction.atomic
def correct_patient_demographics(*, patient, expected_version, actor, changes):
    """Apply a version-checked correction and append its audit event atomically."""
    current_patient = Patient.objects.select_for_update().get(pk=patient.pk)
    if current_patient.version != expected_version:
        raise PatientVersionConflict(current_patient)

    previous_display_name = current_patient.display_name
    previous_date_of_birth = current_patient.date_of_birth
    changed_fields = [
        field
        for field, new_value in changes.items()
        if getattr(current_patient, field) != new_value
    ]
    if not changed_fields:
        return current_patient

    for field in changed_fields:
        setattr(current_patient, field, changes[field])
    from_version = current_patient.version
    current_patient.version += 1
    current_patient.save(update_fields=[*changed_fields, "version", "updated_at"])

    PatientDemographicChange.objects.create(
        patient=current_patient,
        actor_user_id=actor.id,
        actor_username=actor.username,
        changed_fields=changed_fields,
        from_version=from_version,
        to_version=current_patient.version,
        previous_display_name=previous_display_name,
        new_display_name=current_patient.display_name,
        previous_date_of_birth=previous_date_of_birth,
        new_date_of_birth=current_patient.date_of_birth,
    )
    return current_patient


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
