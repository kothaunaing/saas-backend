/** Converts an API date/time pair into the database's UTC timestamp format. */
export function dateTimeToUtc(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

/** Formats a database timestamp using the database's UTC clock. */
export function utcDateTimeParts(date: Date) {
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  };
}

export function utcDayBounds(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  return {
    start: dateTimeToUtc(date, '00:00'),
    end: new Date(dateTimeToUtc(next, '00:00').getTime() - 1),
  };
}
