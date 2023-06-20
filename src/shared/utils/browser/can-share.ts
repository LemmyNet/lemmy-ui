import isBrowser from "./is-browser";

export default function canShare() {
  return isBrowser() && !!navigator.canShare;
}
