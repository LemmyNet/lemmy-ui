import { isBrowser } from "@utils/browser";
import { getExternalHost, getInternalHost } from "@utils/env";

export default function getHost() {
  return isBrowser() ? getExternalHost() : getInternalHost();
}
