import { getHost, getSecure } from "@utils/env";

export default function getBaseLocal() {
  return `http${getSecure()}://${getHost()}`;
}
