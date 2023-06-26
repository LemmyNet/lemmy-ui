import formatDistanceStrict from "date-fns/formatDistanceStrict";
import parseISO from "date-fns/parseISO";

export default function (dateString?: string) {
  return formatDistanceStrict(
    parseISO(dateString ?? Date.now().toString()),
    new Date(),
    {
      addSuffix: true,
    }
  );
}
