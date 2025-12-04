import { isBrowser } from "@utils/browser";
import { testHost } from "../../config";

export default function getInternalHost() {
  return !isBrowser()
    ? (process.env.LEMMY_UI_LEMMY_INTERNAL_HOST ?? testHost)
    : testHost; // used for local dev
}
