const DISPLAY_NAME_MAX_LENGTH = 160;
const EMAIL_MAX_LENGTH = 254;

// Date-only values avoid timezone shifts when posting to Django DateField.
function validDateOfBirth(value, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const reference = new Date(`${today}T00:00:00Z`);
  return value <= today && reference.getUTCFullYear() - parsed.getUTCFullYear() <= 130;
}

export function validatePatientRegistration(input, today = new Date().toISOString().slice(0, 10)) {
  const values = {
    display_name: (input.display_name ?? '').trim(),
    date_of_birth: (input.date_of_birth ?? '').trim(),
    email: (input.email ?? '').trim(),
  };
  const errors = {};

  if (!values.display_name) {
    errors.display_name = 'Enter the patient name.';
  } else if (values.display_name.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.display_name = 'Patient name must be 160 characters or fewer.';
  }

  if (!values.date_of_birth) {
    errors.date_of_birth = 'Enter the date of birth.';
  } else if (!validDateOfBirth(values.date_of_birth, today)) {
    errors.date_of_birth = 'Enter a valid date of birth (not in the future, up to 130 years ago).';
  }

  if (!values.email) {
    errors.email = 'Enter the patient email.';
  } else if (values.email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  return { values, errors };
}

export function validPatientOtp(value) {
  return /^\d{6}$/.test(value);
}
