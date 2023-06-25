import type { NextFunction, Response } from "express";

export default function ({ res, next }: { res: Response; next: NextFunction }) {
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; manifest-src *; connect-src *; img-src * data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'self'; frame-src *; media-src * data:`
  );

  next();
}
