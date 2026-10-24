const PATIENT_CODE_MAX_LENGTH = 64;
const DISPLAY_NAME_MAX_LENGTH = 160;

export function validatePatientRegistration(input) {
  const values = {
    patient_code: input.patient_code.trim(),
    display_name: input.display_name.trim(),
  };
  const errors = {};

  if (!values.patient_code) {
    errors.patient_code = 'Enter a patient ID.';
  } else if (values.patient_code.length > PATIENT_CODE_MAX_LENGTH) {
    errors.patient_code = 'Patient ID must be 64 characters or fewer.';
  }

  if (!values.display_name) {
    errors.display_name = 'Enter a display name.';
  } else if (values.display_name.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.display_name = 'Display name must be 160 characters or fewer.';
  }

  return { values, errors };
}
