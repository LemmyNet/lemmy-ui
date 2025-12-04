import { isBrowser } from "@utils/browser";

export default function getSecure() {
  return (
    isBrowser()
      ? window.location.protocol.includes("https")
      : process.env.LEMMY_UI_HTTPS === "true"
  )
    ? "s"
    : "";
}
