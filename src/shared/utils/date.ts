import {
  addDays,
  constructNow,
  parseISO,
  parse,
  isSameDay,
  isSameYear,
  getYear,
  setYear,
  formatDistanceToNowStrict,
  subDays,
} from "date-fns";

export function futureDaysToUnixTime(days?: number): number | undefined {
  return days && days > 0
    ? Math.trunc(addDays(constructNow(undefined), days).getTime() / 1000)
    : undefined;
}

export function formatRelativeDate(date: string) {
  try {
    const then = parseISO(date);
    return formatDistanceToNowStrict(then, { addSuffix: true });
  } catch {
    return "indeterminate";
  }
}

// Returns a date in local time with the same year, month and day. Ignores the
// source timezone. The goal is to show the same date in all timezones.
export function cakeDate(published: string): Date {
  return parse(published.substring(0, 10), "yyyy-MM-dd", new Date(0));
}

export function isCakeDay(published: string): boolean {
  const createDate = cakeDate(published);
  const currentDate = new Date();

  // The day-overflow of Date makes leap days become 03-01 in non leap years.
  return (
    isSameDay(currentDate, setYear(createDate, getYear(currentDate))) &&
    !isSameYear(currentDate, createDate)
  );
}

/**
 * Converts timestamp string to unix timestamp in seconds, as used by Lemmy API
 */
export function getUnixTimeLemmy(text?: string): number | undefined {
  return text ? new Date(text).getTime() / 1000 : undefined;
}
/**
 * Converts timestamp string to unix timestamp in millis, as used by Javascript
 */
export function getUnixTime(text?: string): number | undefined {
  return text ? new Date(text).getTime() : undefined;
}

/**
 * This converts a unix time to a local date string,
 * popping to tho nearest minute, and removing the Z for
 * javascript fields.
 */
export function unixTimeToLocalDateStr(unixTime?: number): string | undefined {
  return unixTime
    ? convertUTCDateToLocalDate(new Date(unixTime)).toISOString().slice(0, -8)
    : undefined;
}

function convertUTCDateToLocalDate(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
}

export function nowBoolean(bool?: boolean): string | undefined {
  return bool ? new Date().toISOString() : undefined;
}

// Returns true if the date is more than 7 days ago.
// https://stackoverflow.com/a/563442
export function isWeekOld(date: Date): boolean {
  const weekAgo = subDays(new Date(), 7);
  return date < weekAgo;
}
