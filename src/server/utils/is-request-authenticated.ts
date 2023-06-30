import type { Request } from "express";

export function isRequestAuthenticated(req: Request): boolean {
  if (!req.headers.cookie) {
    return false;
  }

  return req.headers.cookie?.split("; ").some(c => c.startsWith("jwt"));
}
