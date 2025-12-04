import { getHost } from "@utils/env";

export default function getBaseLocal(s = "") {
  return `http${s}://${getHost()}`;
}
