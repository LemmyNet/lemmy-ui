export default function getQueryString<
  T extends Record<string, string | undefined>,
>(obj: T) {
  const searchParams = new URLSearchParams();
  Object.entries(obj)
    .filter(([, val]) => val !== undefined && val !== null)
    .forEach(([key, val]) => searchParams.set(key, val ?? ""));
  const params = searchParams.toString();
  if (params) {
    return "?" + params;
  }
  return "";
}
