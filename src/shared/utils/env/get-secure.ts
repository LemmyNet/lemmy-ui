import { isBrowser } from "@utils/browser";

export default function getSecure() {
  return (
    isBrowser()
      ? window.location.protocol.includes("https") || window.isoData.forceHttps
      : process.env.LEMMY_UI_HTTPS === "true" ||
        process.env.LEMMY_UI_BACKEND_REMOTE !== undefined
  )
    ? "s"
    : "";
}
