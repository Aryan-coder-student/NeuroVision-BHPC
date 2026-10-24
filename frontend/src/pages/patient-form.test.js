import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePatientRegistration } from './patient-form.js';

test('validatePatientRegistration trims valid patient identity fields', () => {
  assert.deepEqual(
    validatePatientRegistration({
      patient_code: '  P-0042  ',
      display_name: '  Maya Rao  ',
    }),
    {
      values: { patient_code: 'P-0042', display_name: 'Maya Rao' },
      errors: {},
    },
  );
});

test('validatePatientRegistration requires both identity fields', () => {
  assert.deepEqual(
    validatePatientRegistration({ patient_code: ' ', display_name: '' }).errors,
    {
      patient_code: 'Enter a patient ID.',
      display_name: 'Enter a display name.',
    },
  );
});

test('validatePatientRegistration enforces backend field lengths', () => {
  const result = validatePatientRegistration({
    patient_code: 'P'.repeat(65),
    display_name: 'N'.repeat(161),
  });

  assert.equal(result.errors.patient_code, 'Patient ID must be 64 characters or fewer.');
  assert.equal(result.errors.display_name, 'Display name must be 160 characters or fewer.');
});
