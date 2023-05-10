import { isBrowser } from "./utils";

const testHost = "0.0.0.0:8536";

const getInternalHost = () =>
  !isBrowser()
    ? process.env.LEMMY_UI_LEMMY_INTERNAL_HOST ?? testHost
    : testHost; // used for local dev

export const getExternalHost = () =>
  isBrowser()
    ? `${window.location.hostname}${
        ["1234", "1235"].includes(window.location.port)
          ? ":8536"
          : window.location.port == ""
          ? ""
          : `:${window.location.port}`
      }`
    : process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST || testHost;

const getSecure = () =>
  (
    isBrowser()
      ? window.location.protocol.includes("https")
      : process.env.LEMMY_UI_HTTPS === "true"
  )
    ? "s"
    : "";

const getHost = () => (isBrowser() ? getExternalHost() : getInternalHost());

const getWsHost = () =>
  isBrowser()
    ? window.lemmyConfig?.wsHost ?? getHost()
    : process.env.LEMMY_UI_LEMMY_WS_HOST ?? getExternalHost();

const getBaseLocal = (s = "") => `http${s}://${getHost()}`;

export const getHttpBaseInternal = () => getBaseLocal(); // Don't use secure here
export const getHttpBase = () => getBaseLocal(getSecure());
export const getWsUri = () => `ws${getSecure()}://${getWsHost()}/api/v3/ws`;
export const isHttps = () => getSecure() === "s";

console.log(`httpbase: ${getHttpBase()}`);
console.log(`wsUri: ${getWsUri()}`);
console.log(`isHttps: ${isHttps()}`);

// This is for html tags, don't include port
export function httpExternalPath(path: string) {
  return `http${getSecure()}://${getExternalHost().replace(
    /:\d+/g,
    ""
  )}${path}`;
}
