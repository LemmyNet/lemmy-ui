import { parseISO, getYear, getDayOfYear } from "date-fns";

export default function isCakeDay(published: string): boolean {
  const createDate = parseISO(published);
  const currentDate = new Date();

  return (
    getDayOfYear(createDate) === getDayOfYear(currentDate) &&
    getYear(createDate) !== getYear(currentDate)
  );
}
