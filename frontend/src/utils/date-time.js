const INDIA_TIME_ZONE = 'Asia/Kolkata';

const indiaCalendarFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INDIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const indiaDateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INDIA_TIME_ZONE,
  dateStyle: 'medium',
});

const indiaDateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INDIA_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function indiaCalendarDate(value = new Date()) {
  const parts = Object.fromEntries(
    indiaCalendarFormatter
      .formatToParts(value)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatIndiaDate(value) {
  return indiaDateFormatter.format(new Date(value));
}

export function formatIndiaDateTime(value) {
  return indiaDateTimeFormatter.format(new Date(value));
}
