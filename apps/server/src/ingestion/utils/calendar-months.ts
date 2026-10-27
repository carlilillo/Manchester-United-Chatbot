/** Resolve calendar months in the scheduler's timezone, including December/January rollover. */
export function calendarMonths(now: Date, offsets: number[]): string[] {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find(part => part.type === 'year')!.value);
  const month = Number(parts.find(part => part.type === 'month')!.value);
  return offsets.map(offset => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}
