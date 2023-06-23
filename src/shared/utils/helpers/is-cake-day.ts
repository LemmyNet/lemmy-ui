import getDayOfYear from "date-fns/getDayOfYear";
import getYear from "date-fns/getYear";
import parseISO from "date-fns/parseISO";

export default function isCakeDay(published: string): boolean {
  const createDate = parseISO(published);
  const currentDate = new Date();

  return (
    getDayOfYear(createDate) === getDayOfYear(currentDate) &&
    getYear(createDate) !== getYear(currentDate)
  );
}
