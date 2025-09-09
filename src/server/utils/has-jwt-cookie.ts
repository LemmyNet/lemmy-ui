import * as cookie from "cookie";
import { authCookieName } from "@utils/config";
import { IncomingHttpHeaders } from "http";
import { isBrowser } from "@utils/browser";

export function getJwtCookie(headers: IncomingHttpHeaders): string | undefined {
  const x = headers.cookie
    ? cookie.parse(headers.cookie)[authCookieName] // This can actually be undefined
    : undefined;
  if (x !== undefined) {
    return x;
  } else if (isBrowser()) {
    return window.localStorage.getItem(authCookieName) ?? undefined;
  }
  return undefined;
}
