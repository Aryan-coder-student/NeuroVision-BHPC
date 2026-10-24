"""Patient registration orchestration; leave OTP lifecycle to patient_identity."""
from django.db import transaction

from patient_identity.services import start_email_grant

from .models import Patient


@transaction.atomic
def register_patient(*, institution, requested_by, display_name, date_of_birth, email):
    """Create a tenant patient and begin verification as one database transaction.

    A failed delivery rolls back the new patient and pending public identity grant.
    The email is encrypted in the existing shared identity registry, never stored
    in the tenant patient table.
    """
    patient = Patient.objects.create(
        display_name=display_name,
        date_of_birth=date_of_birth,
    )
    challenge, masked_email = start_email_grant(
        patient=patient,
        institution=institution,
        requested_by=requested_by,
        email=email,
    )
    return patient, challenge, masked_email
