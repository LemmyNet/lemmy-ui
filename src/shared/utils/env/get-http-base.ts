import { getBaseLocal, getSecure } from "@utils/env";

export default function getHttpBase() {
  return getBaseLocal(getSecure());
}
