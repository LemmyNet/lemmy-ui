import { parseISO, getYear, getDayOfYear, isLeapYear } from "date-fns";

const leapDay = getDayOfYear(new Date(2024, 1, 29));

export default function isCakeDay(published: string): boolean {
  const createDate = parseISO(published);
  const createDateDayOfYear = getDayOfYear(createDate);
  const isCreateDateLeapYear = isLeapYear(createDate);

  const currentDate = new Date();
  let currentDateDayOfYear = getDayOfYear(currentDate);
  const isCurrentDateLeapYear = isLeapYear(currentDate);

  if (
    isCreateDateLeapYear &&
    !isCurrentDateLeapYear &&
    currentDateDayOfYear >= leapDay
  ) {
    ++currentDateDayOfYear;
  }

  if (
    !isCreateDateLeapYear &&
    isCurrentDateLeapYear &&
    createDateDayOfYear >= leapDay
  ) {
    --currentDateDayOfYear;
  }

  return (
    createDateDayOfYear === currentDateDayOfYear &&
    getYear(createDate) !== getYear(currentDate)
  );
}
