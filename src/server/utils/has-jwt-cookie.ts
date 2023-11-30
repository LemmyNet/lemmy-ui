import * as cookie from "cookie";
import { authCookieName } from "../../shared/config";
import { IncomingHttpHeaders } from "http";

export function getJwtCookie(headers: IncomingHttpHeaders): string | undefined {
  return headers.cookie
    ? cookie.parse(headers.cookie)[authCookieName] // This can actually be undefined
    : undefined;
}
