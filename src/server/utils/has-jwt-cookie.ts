import * as cookie from "cookie";
import type { Request } from "express";

export function hasJwtCookie(req: Request): boolean {
  return Boolean(cookie.parse(req.headers.cookie ?? "").jwt?.length);
}
