export default function futureDaysToUnixTime(
  days?: number
): number | undefined {
  return days
    ? Math.trunc(
        new Date(Date.now() + 1000 * 60 * 60 * 24 * days).getTime() / 1000
      )
    : undefined;
}
