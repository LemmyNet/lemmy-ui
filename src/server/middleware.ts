import type { NextFunction, Response } from "express";
import { UserService } from "../shared/services";

export function setDefaultCsp({
  res,
  next,
}: {
  res: Response;
  next: NextFunction;
}) {
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; manifest-src *; connect-src *; img-src * data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'self'; frame-src *; media-src *`
  );

  next();
}

// Set cache-control headers. If user is logged in, set `private` to prevent storing data in
// shared caches (eg nginx) and leaking of private data. If user is not logged in, allow caching
// all responses for 60 seconds to reduce load on backend and database. The specific cache
// interval is rather arbitrary and could be set higher (less server load) or lower (fresher data).
//
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
export function setCacheControl({
  res,
  next,
}: {
  res: Response;
  next: NextFunction;
}) {
  const user = UserService.Instance;
  var caching;
  if (user.auth()) {
    caching = "private";
  } else {
    caching = "public, max-age=60";
  }
  res.setHeader("Cache-Control", caching);

  next();
}
