import { getExternalHost, getSecure } from "@utils/env";

// This is for html tags, don't include port
export default function httpExternalPath(path: string) {
  return `http${getSecure()}://${getExternalHost().replace(
    /:\d+/g,
    ""
  )}${path}`;
}
