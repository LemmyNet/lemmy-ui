import { format, parseISO } from "date-fns";

export default function formatDate(input: string) {
  const parsed = parseISO(input + "Z");
  return format(parsed, "PPPPpppp");
}
