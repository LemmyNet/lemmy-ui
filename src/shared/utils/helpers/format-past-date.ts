import formatDistanceStrict from "date-fns/formatDistanceStrict";
import parseISO from "date-fns/parseISO";

export default function (dateString?: string) {
  if (!dateString || dateString === undefined) {
    console.error("Got an undefined dateString for `formatPastDate` function");
    return "UNDEFINED DATE";
  }

  try {
    const parsed = parseISO((dateString ?? Date.now().toString()) + "Z");
    return formatDistanceStrict(parsed, new Date(), {
      addSuffix: true,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof RangeError) {
      console.error(
        `Got the invalid value of ${dateString} when attempting to parse to ISO date`,
      );
    }
    return "DATE PARSE ERROR";
  }
}
