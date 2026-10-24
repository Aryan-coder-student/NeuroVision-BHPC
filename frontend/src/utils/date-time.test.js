import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatIndiaDate,
  formatIndiaDateTime,
  indiaCalendarDate,
} from './date-time.js';

const JUST_AFTER_MIDNIGHT_IN_INDIA = new Date('2026-10-24T18:45:00.000Z');

test('India calendar dates do not depend on the runtime timezone', () => {
  assert.equal(indiaCalendarDate(JUST_AFTER_MIDNIGHT_IN_INDIA), '2026-10-25');
});

test('UTC timestamps render as India date and time', () => {
  assert.equal(formatIndiaDateTime(JUST_AFTER_MIDNIGHT_IN_INDIA), '25 Oct 2026, 12:15 am');
});

test('UTC timestamps render as India dates at the day boundary', () => {
  assert.equal(formatIndiaDate(JUST_AFTER_MIDNIGHT_IN_INDIA), '25 Oct 2026');
});
