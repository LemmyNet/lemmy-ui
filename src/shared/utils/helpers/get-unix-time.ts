export default function getUnixTime(text?: string): number | undefined {
  return text ? new Date(text).getTime() / 1000 : undefined;
}

/**
 * This converts a unix time to a local date string,
 * popping to tho nearest minute, and removing the Z for
 * javascript fields.
 */
export function unixTimeToLocalDateStr(unixTime?: number): string | undefined {
  return unixTime
    ? convertUTCDateToLocalDate(new Date(unixTime)).toISOString().slice(0, -8)
    : undefined;
}

export function unixTimeToDateStr(unixTime?: number): string | undefined {
  return unixTime ? new Date(unixTime).toISOString() : undefined;
}

function convertUTCDateToLocalDate(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
}
