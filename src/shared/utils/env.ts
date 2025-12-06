import { isBrowser } from "@utils/browser";
import { testHost } from "@utils/config";
import { IsoDataOptionalSite } from "@utils/types";

// The browser uses the hosts in IsoData.
const hosts = !isBrowser() && {
  backendInternal: getBaseUrl(
    process.env.LEMMY_UI_BACKEND_INTERNAL ??
      process.env.LEMMY_UI_BACKEND ??
      testHost,
  ),
  backendExternal: getBaseUrl(process.env.LEMMY_UI_BACKEND ?? testHost),
};

export function getHttpBaseInternal() {
  if (!hosts) {
    throw new Error("Can't access internal backend host");
  }
  return hosts.backendInternal;
}

export function getBackendHostExternal() {
  return !hosts ? window.isoData.lemmyBackend : hosts.backendExternal;
}

export function getBaseUrl(host: string) {
  const hasProtocol = /^https?:\/\//.test(host);
  const defaultProtocol =
    process.env.LEMMY_UI_HTTPS === "true" ? "https:" : "http:";
  const fullHost = hasProtocol ? host : defaultProtocol + "//" + host;
  const url = new URL(fullHost);
  const { protocol, hostname, port } = url;
  return `${protocol}//${hostname}${port ? ":" + port : ""}`;
}

/**
 * Returns path to static directory, intended
 * for cache-busting based on latest commit hash.
 */
export function getStaticDir() {
  return `/static/${process.env.COMMIT_HASH}`;
}

export function httpFrontendUrl(path: string, isoData: IsoDataOptionalSite) {
  return `${isoData.lemmyFrontend}${path}`;
}

export function httpBackendUrl(path: string) {
  return `${getBackendHostExternal()}${path}`;
}

export function isHttps() {
  return window.location.protocol === "https:";
}
