from datetime import UTC, date, datetime

from django.test import SimpleTestCase

from clinical.dates import patient_calendar_date


class PatientCalendarDateTests(SimpleTestCase):
    def test_uses_india_calendar_day_for_utc_instants(self):
        utc_instant = datetime(2026, 10, 24, 18, 45, tzinfo=UTC)

        self.assertEqual(patient_calendar_date(utc_instant), date(2026, 10, 25))
