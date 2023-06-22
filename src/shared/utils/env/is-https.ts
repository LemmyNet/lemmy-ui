import { getSecure } from "@utils/env";

export default function isHttps() {
  return getSecure() === "s";
}
