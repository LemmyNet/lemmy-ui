import * as cookie from "cookie";
import type { Request } from "express";
import { authCookieName } from "../../shared/config";

export function getJwtCookie(req: Request): string | undefined {
  return req.headers.cookie
    ? cookie.parse(req.headers.cookie)[authCookieName] // This can actually be undefined
    : undefined;
}
