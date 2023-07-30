export default function getQueryString<
  T extends Record<string, string | undefined>,
>(obj: T) {
  return Object.entries(obj)
    .filter(([, val]) => val !== undefined && val !== null)
    .reduce(
      (acc, [key, val], index) => `${acc}${index > 0 ? "&" : ""}${key}=${val}`,
      "?",
    );
}
