import { isBrowser } from "@utils/browser";
import { testHost } from "../../config";

export default function getExternalHost() {
  const externalDomains = process.env.LEMMY_UI_LEMMY_EXTERNAL_DOMAIN === "true";

  if (externalDomains) {
    return process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST;
  } else {
    return isBrowser()
      ? `${window.location.hostname}${
          ["1234", "1235"].includes(window.location.port)
            ? ":8536"
            : window.location.port === ""
              ? ""
              : `:${window.location.port}`
        }`
      : process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST || testHost;
  }
}
