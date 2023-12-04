import { IncomingHttpHeaders } from "http";
import { getJwtCookie } from "./has-jwt-cookie";

export function setForwardedHeaders(headers: IncomingHttpHeaders): {
  [key: string]: string;
} {
  const out: { [key: string]: string } = {};

  if (headers.host) {
    out.host = headers.host;
  }

  const realIp = headers["x-real-ip"];

  if (realIp) {
    out["x-real-ip"] = realIp as string;
  }

  const forwardedFor = headers["x-forwarded-for"];

  if (forwardedFor) {
    out["x-forwarded-for"] = forwardedFor as string;
  }

  // const cookies = headers["cookie"];

  // if (cookies) {
  //   out["cookie"] = cookies;
  // }

  const auth = getJwtCookie(headers);

  if (auth) {
    out["Authorization"] = `Bearer ${auth}`;
  }

  // No cache
  //out["Cache-Control"] = "no-cache";
  //out["cache"] = "no-store";
  //out["Credentials"] = "include";

  return out;
}
