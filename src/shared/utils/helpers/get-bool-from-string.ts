export default function getBoolFromString(
  boolStr?: string,
): boolean | undefined {
  return boolStr ? boolStr.toLowerCase() === "true" : undefined;
}
