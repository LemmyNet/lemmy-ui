import { testHost } from "../../config";
import { isBrowser } from "@utils/browser";

export default function getExternalHost() {
  return isBrowser()
    ? window.isoData.lemmy_external_host
    : (process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST ?? testHost);
}
