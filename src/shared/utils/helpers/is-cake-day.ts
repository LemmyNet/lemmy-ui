import { getYear, isSameDay, isSameYear, parse, setYear } from "date-fns";

// Returns a date in local time with the same year, month and day. Ignores the
// source timezone. The goal is to show the same date in all timezones.
export function cakeDate(published: string): Date {
  return parse(published.substring(0, 10), "yyyy-MM-dd", new Date(0));
}

export default function isCakeDay(published: string): boolean {
  const createDate = cakeDate(published);
  const currentDate = new Date();

  // The day-overflow of Date makes leap days become 03-01 in non leap years.
  return (
    isSameDay(currentDate, setYear(createDate, getYear(currentDate))) &&
    !isSameYear(currentDate, createDate)
  );
}
