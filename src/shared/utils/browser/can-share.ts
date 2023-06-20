import { isBrowser } from "@utils/browser";

export default function canShare() {
  return isBrowser() && !!navigator.canShare;
}
