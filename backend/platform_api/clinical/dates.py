from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.utils import timezone


PATIENT_TIME_ZONE = ZoneInfo("Asia/Kolkata")


def patient_calendar_date(value: datetime | None = None) -> date:
    """Return the India calendar date for an aware instant."""
    return timezone.localdate(value, timezone=PATIENT_TIME_ZONE)
