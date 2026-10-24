const DISPLAY_NAME_MAX_LENGTH = 160;
const EMAIL_MAX_LENGTH = 254;

// Date-only values avoid timezone shifts when posting to Django DateField.
function validDateOfBirth(value, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const reference = new Date(`${today}T00:00:00Z`);
  const oldestYear = reference.getUTCFullYear() - 130;
  const oldestDay = Math.min(
    reference.getUTCDate(),
    new Date(Date.UTC(oldestYear, reference.getUTCMonth() + 1, 0)).getUTCDate(),
  );
  const oldest = new Date(Date.UTC(oldestYear, reference.getUTCMonth(), oldestDay))
    .toISOString().slice(0, 10);
  return value >= oldest && value <= today;
}

export function validatePatientDetails(input, today = localDateInputValue()) {
  const values = {
    display_name: (input.display_name ?? '').trim(),
    date_of_birth: (input.date_of_birth ?? '').trim(),
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

  return { values, errors };
}

export function validatePatientRegistration(input, today = localDateInputValue()) {
  const { values, errors } = validatePatientDetails(input, today);
  values.email = (input.email ?? '').trim();

  if (!values.email) {
    errors.email = 'Enter the patient email.';
  } else if (values.email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  return { values, errors };
}

export function localDateInputValue(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validPatientOtp(value) {
  return /^\d{6}$/.test(value);
}
