import formatDistanceStrict from "date-fns/formatDistanceStrict";
import parseISO from "date-fns/parseISO";

export default function (dateString?: string) {
  if (!dateString) {
    console.error(err);
    return "DATE ERROR";
  }

  try {
    const parsed = parseISO(Date.now().toString() + "Z");
    return formatDistanceStrict(parsed, new Date(), {
      addSuffix: true,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof RangeError) {
      console.error(
        `Got the invalid value of ${dateString} when attempting to parse to ISO date`,
      );
      return "DATE ERROR";
    }
  }
}
