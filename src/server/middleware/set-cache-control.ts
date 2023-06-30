import type { NextFunction, Request, Response } from "express";
import { hasJwtCookie } from "../utils/has-jwt-cookie";

// Set cache-control headers. If user is logged in, set `private` to prevent storing data in
// shared caches (eg nginx) and leaking of private data. If user is not logged in, allow caching
// all responses for 5 seconds to reduce load on backend and database. The specific cache
// interval is rather arbitrary and could be set higher (less server load) or lower (fresher data).
//
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
export function setCacheControl({
  res,
  req,
  next,
}: {
  res: Response;
  req: Request;
  next: NextFunction;
}) {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  let caching: string;

  if (
    req.path.match(/\.(js|css|txt|manifest\.webmanifest)\/?$/) ||
    req.path.includes("/css/themelist")
  ) {
    // Static content gets cached publicly for a day
    caching = "public, max-age=86400";
  } else {
    if (hasJwtCookie(req)) {
      caching = "private";
    } else {
      caching = "public, max-age=5";
    }
  }

  res.setHeader("Cache-Control", caching);

  next();
}
