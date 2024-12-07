import { parseISO, formatDistanceStrict } from "date-fns";

export default function (dateString?: string) {
  const parsed = parseISO((dateString ?? Date.now().toString()) + "Z");
  try {
    return formatDistanceStrict(parsed, new Date(), {
      addSuffix: true,
    });
  } catch {
    return "indeterminate";
  }
}
