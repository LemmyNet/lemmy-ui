import { getExternalHost, getSecure } from "@utils/env";

export default function getHttpBaseExternal() {
  return `http${getSecure()}://${getExternalHost()}`;
}
