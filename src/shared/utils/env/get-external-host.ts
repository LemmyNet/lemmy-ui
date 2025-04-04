import { testHost } from "../../config";

export default function getExternalHost() {
  return process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST ?? testHost;
}
