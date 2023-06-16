import { isBrowser } from "./is-browser";

export function canShare() {
  return isBrowser() && !!navigator.canShare;
}
