import formatDistanceStrict from "date-fns/formatDistanceStrict";
import parseISO from "date-fns/parseISO";

export default function (dateString?: string) {
  const parsed = parseISO((dateString ?? Date.now().toString()) + "Z");
  return formatDistanceStrict(parsed, new Date(), {
    addSuffix: true,
  });
}
