import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Always operate in UTC on the backend to avoid timezone bugs.
 */

export function nowUtcIso(): string {
  return dayjs().utc().toISOString();
}

export function toUtcDateOnly(date: Date | string): string {
  // returns YYYY-MM-DD in UTC
  return dayjs(date).utc().format('YYYY-MM-DD');
}

export function startOfDayUtc(date: Date | string): Date {
  return dayjs(date).utc().startOf('day').toDate();
}

export function endOfDayUtc(date: Date | string): Date {
  return dayjs(date).utc().endOf('day').toDate();
}

export function addDaysUtc(date: Date | string, days: number): Date {
  return dayjs(date).utc().add(days, 'day').toDate();
}

export function isSameDayUtc(a: Date | string, b: Date | string): boolean {
  return toUtcDateOnly(a) === toUtcDateOnly(b);
}

/**
 * Useful for jobs: "today in UTC"
 */
export function todayUtcDateOnly(): string {
  return dayjs().utc().format('YYYY-MM-DD');
}

/**
 * Parse ISO safely; returns null if invalid.
 */
export function parseIsoOrNull(value: string): Date | null {
  const d = dayjs(value);
  if (!d.isValid()) return null;
  return d.toDate();
}
