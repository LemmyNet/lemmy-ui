import { IncomingHttpHeaders } from "http";

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

  return out;
}
