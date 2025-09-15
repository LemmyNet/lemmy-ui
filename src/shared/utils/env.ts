import { isBrowser } from "@utils/browser";
import { testHost } from "@utils/config";

function getBaseLocal() {
  return `http${getSecure()}://${getHost()}`;
}

export function getExternalHost() {
  return isBrowser()
    ? window.isoData.lemmyExternalHost
    : (process.env.LEMMY_UI_BACKEND_REMOTE ??
        process.env.LEMMY_UI_BACKEND_EXTERNAL ??
        testHost);
}

function getHost() {
  return isBrowser() ? getExternalHost() : getInternalHost();
}

export function getHttpBase() {
  return getBaseLocal();
}

export function getHttpBaseExternal() {
  return `http${getSecure()}://${getExternalHost()}`;
}

export function getHttpBaseInternal() {
  return getBaseLocal(); // Don't use secure here
}

function getInternalHost() {
  return !isBrowser()
    ? (process.env.LEMMY_UI_BACKEND_REMOTE ??
        process.env.LEMMY_UI_BACKEND_INTERNAL ??
        testHost)
    : testHost; // used for local dev
}

function getSecure() {
  return (
    isBrowser()
      ? window.location.protocol.includes("https") || window.isoData.forceHttps
      : process.env.LEMMY_UI_HTTPS === "true" ||
        process.env.LEMMY_UI_BACKEND_REMOTE !== undefined
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
