import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { localDateInputValue, validatePatientDetails, validatePatientRegistration, validPatientOtp } from './patient-form.js';

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
  for (const date_of_birth of ['2026-10-25', '2001-02-29', '1800-01-01', 'not-a-date', '2000-13-01']) {
    const result = validatePatientRegistration({
      display_name: 'Maya Rao', date_of_birth, email: 'maya@example.com',
    }, TODAY);
    assert.ok(result.errors.date_of_birth, `should reject ${date_of_birth}`);
  }
  assert.deepEqual(validatePatientRegistration({
    display_name: 'Maya Rao', date_of_birth: '2000-02-29', email: 'maya@example.com',
  }, TODAY).errors, {});
});

test('patient form enforces the exact 130-year boundary', () => {
  const base = { display_name: 'Maya Rao', email: 'maya@example.com' };
  assert.deepEqual(validatePatientRegistration({ ...base, date_of_birth: '1896-10-24' }, TODAY).errors, {});
  assert.ok(validatePatientRegistration({ ...base, date_of_birth: '1896-10-23' }, TODAY).errors.date_of_birth);
});

test('patient OTP must be exactly six numeric digits', () => {
  assert.equal(validPatientOtp('012345'), true);
  for (const value of ['', '12345', '1234567', '12x456', ' 123456', '１２３４５６']) {
    assert.equal(validPatientOtp(value), false);
  }
});

test('date input limit uses the browser local calendar date', (context) => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Kolkata';
  context.after(() => {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  });

  const justAfterMidnightInIndia = new Date('2026-10-24T18:45:00.000Z');
  assert.equal(localDateInputValue(justAfterMidnightInIndia), '2026-10-25');
});

test('patient edit validates name and DOB without requiring an email', () => {
  assert.deepEqual(validatePatientDetails({
    display_name: '  Corrected Patient  ',
    date_of_birth: '2004-04-01',
    patient_code: 'ATTEMPTED-OVERRIDE',
    email: 'attacker@example.com',
  }, TODAY), {
    values: { display_name: 'Corrected Patient', date_of_birth: '2004-04-01' },
    errors: {},
  });
});

test('patient edit refuses blank names and impossible dates', () => {
  const invalid = validatePatientDetails({
    display_name: '  ',
    date_of_birth: '2027-01-01',
  }, TODAY);
  assert.equal(invalid.errors.display_name, 'Enter the patient name.');
  assert.ok(invalid.errors.date_of_birth);

  const validLeapDay = validatePatientDetails({
    display_name: 'Patient',
    date_of_birth: '2000-02-29',
  }, TODAY);
  assert.deepEqual(validLeapDay.errors, {});
});
