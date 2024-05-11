import { getYear, isSameDay, isSameYear, parse, setYear } from "date-fns";

// Returns a date in local time with the same year, month and day. Ignores the
// source timezone. The goal is to show the same date in all timezones.
export function cakeDate(published: string): Date {
  return parse(published.substring(0, 10), "yyyy-MM-dd", new Date(0));
}

export default function isCakeDay(published: string, current?: Date): boolean {
  const createDate = cakeDate(published);
  const currentDate = current ?? new Date();

  // The day-overflow of Date makes leap days become 03-01 in non leap years.
  return (
    isSameDay(currentDate, setYear(createDate, getYear(currentDate))) &&
    !isSameYear(currentDate, createDate)
  );
}

/*
import { format } from "date-fns";
// Note: Systems with UTC+0 can pass these even when they shouldn't.
console.assert(
  isCakeDay("2023-05-11T00:00:00.000Z", new Date(2024, 4, 11)),
  "basic, early",
);
console.assert(
  isCakeDay("2023-05-11T23:59:00.000Z", new Date(2024, 4, 11)),
  "basic, late",
);

console.assert(
  !isCakeDay("2024-05-11T00:00:00.000Z", new Date(2024, 4, 11)),
  "not today, early",
);
console.assert(
  !isCakeDay("2024-05-11T23:59:00.000Z", new Date(2024, 4, 11)),
  "not today, late",
);

console.assert(
  isCakeDay("2020-02-29T00:00:00.000Z", new Date(2024, 1, 29)),
  "leap day, leap year",
);
console.assert(
  isCakeDay("2020-02-29T00:00:00.000Z", new Date(2025, 2, 1)),
  "leap day, non leap year",
);

console.assert(
  isCakeDay("2023-03-01T00:00:00.000Z", new Date(2024, 2, 1)),
  "first of march, leap year",
);
console.assert(
  isCakeDay("2023-03-01T00:00:00.000Z", new Date(2024, 2, 1)),
  "first of march, non leap year",
);

console.assert(
  isCakeDay("2020-03-01T00:00:00.000Z", new Date(2024, 2, 1)),
  "first of march leap year, leap year",
);
console.assert(
  isCakeDay("2020-03-01T00:00:00.000Z", new Date(2024, 2, 1)),
  "first of march leap year, non leap year",
);

// This is how profile.tsx displays the date.
console.assert(
  format(cakeDate("2023-05-11T00:00:00.000Z"), "PPP") ===
    format(cakeDate("2023-05-11T23:59:00.000Z"), "PPP"),
);
// This one depends on locales.
// console.assert(
//   format(cakeDate("2023-05-11T23:59:00.000Z"), "PPP") === "May 11th, 2023",
//   format(cakeDate("2023-05-11T23:59:00.000Z"), "PPP"),
// );
*/
