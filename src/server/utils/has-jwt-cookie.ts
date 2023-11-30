import * as cookie from "cookie";
import type { Request } from "express";
import { authCookieName } from "../../shared/config";

export function hasJwtCookie(req: Request): boolean {
  return Boolean(
    cookie.parse(req.headers.cookie ?? "")[authCookieName]?.length,
  );
}
