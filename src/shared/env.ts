import { isBrowser } from "./utils";

const testHost = "0.0.0.0:8536";

function getInternalHost() {
  return !isBrowser()
    ? process.env.LEMMY_UI_LEMMY_INTERNAL_HOST ?? testHost
    : testHost; // used for local dev
}

export function getExternalHost() {
  return isBrowser()
    ? `${window.location.hostname}${
        ["1234", "1235"].includes(window.location.port)
          ? ":8536"
          : window.location.port == ""
          ? ""
          : `:${window.location.port}`
      }`
    : process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST || testHost;
}

function getSecure() {
  return (
    isBrowser()
      ? window.location.protocol.includes("https")
      : process.env.LEMMY_UI_HTTPS === "true"
  )
    ? "s"
    : "";
}

function getHost() {
  return isBrowser() ? getExternalHost() : getInternalHost();
}

function getBaseLocal(s = "") {
  return `http${s}://${getHost()}`;
}

export function getHttpBaseInternal() {
  return getBaseLocal(); // Don't use secure here
}
export function getHttpBase() {
  return getBaseLocal(getSecure());
}
export function isHttps() {
  return getSecure() === "s";
}

console.log(`httpbase: ${getHttpBase()}`);
console.log(`isHttps: ${isHttps()}`);

// This is for html tags, don't include port
export function httpExternalPath(path: string) {
  return `http${getSecure()}://${getExternalHost().replace(
    /:\d+/g,
    ""
  )}${path}`;
}
