import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePatientRegistration, validPatientOtp } from './patient-form.js';

const TODAY = '2026-10-24';

test('patient form only submits name, date of birth, and email', () => {
  assert.deepEqual(
    validatePatientRegistration({
      display_name: '  Maya Rao  ',
      date_of_birth: '2000-02-29',
      email: '  Maya@example.com  ',
      patient_code: 'FORGED-123',
    }, TODAY),
    {
      values: {
        display_name: 'Maya Rao',
        date_of_birth: '2000-02-29',
        email: 'Maya@example.com',
      },
      errors: {},
    },
  );
});

test('patient form requires all three registration fields', () => {
  const result = validatePatientRegistration({
    display_name: ' ', date_of_birth: '', email: ' ',
  }, TODAY);
  assert.deepEqual(result.errors, {
    display_name: 'Enter the patient name.',
    date_of_birth: 'Enter the date of birth.',
    email: 'Enter the patient email.',
  });
});

test('patient form enforces backend name and email lengths', () => {
  const result = validatePatientRegistration({
    display_name: 'X'.repeat(161),
    date_of_birth: '2000-01-01',
    email: `${'x'.repeat(247)}@demo.com`,
  }, TODAY);
  assert.equal(result.errors.display_name, 'Patient name must be 160 characters or fewer.');
  assert.equal(result.errors.email, 'Enter a valid email address.');
});

test('patient form rejects invalid or future dates including impossible leap days', () => {
  for (const date_of_birth of ['2026-10-25', '2001-02-29', '1900-01-01', 'not-a-date', '2000-13-01']) {
    const result = validatePatientRegistration({
      display_name: 'Maya Rao', date_of_birth, email: 'maya@example.com',
    }, TODAY);
    assert.ok(result.errors.date_of_birth, `should reject ${date_of_birth}`);
  }
  assert.deepEqual(validatePatientRegistration({
    display_name: 'Maya Rao', date_of_birth: '2000-02-29', email: 'maya@example.com',
  }, TODAY).errors, {});
});

test('patient OTP must be exactly six numeric digits', () => {
  assert.equal(validPatientOtp('012345'), true);
  for (const value of ['', '12345', '1234567', '12x456', ' 123456', '１２３４５６']) {
    assert.equal(validPatientOtp(value), false);
  }
});
