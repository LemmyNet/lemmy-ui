import { isBrowser } from "@utils/browser";
import { testHost } from "@utils/config";

export function getBaseLocal(s = "") {
  return `http${s}://${getHost()}`;
}

export function getExternalHost() {
  return isBrowser()
    ? window.isoData.lemmyExternalHost
    : (process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST ?? testHost);
}

export function getHost() {
  return isBrowser() ? getExternalHost() : getInternalHost();
}

export function getHttpBase() {
  return getBaseLocal(getSecure());
}

export function getHttpBaseExternal() {
  return `http${getSecure()}://${getExternalHost()}`;
}

export function getHttpBaseInternal() {
  return getBaseLocal(); // Don't use secure here
}

export function getInternalHost() {
  return !isBrowser()
    ? (process.env.LEMMY_UI_LEMMY_INTERNAL_HOST ?? testHost)
    : testHost; // used for local dev
}

export function getSecure() {
  return (
    isBrowser()
      ? window.location.protocol.includes("https")
      : process.env.LEMMY_UI_HTTPS === "true"
  )
    ? "s"
    : "";
}

/**
 * Returns path to static directory, intended
 * for cache-busting based on latest commit hash.
 */
export function getStaticDir() {
  return `/static/${process.env.COMMIT_HASH}`;
}

/**
 * This is for html tags, don't include port
 */
export function httpExternalPath(path: string) {
  return `http${getSecure()}://${getExternalHost().replace(
    /:\d+/g,
    "",
  )}${path}`;
}

export function isHttps() {
  return getSecure() === "s";
}
