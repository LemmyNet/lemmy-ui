export default function getUnixTime(text?: string): number | undefined {
  return text ? new Date(text).getTime() / 1000 : undefined;
}
