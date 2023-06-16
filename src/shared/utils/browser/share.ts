import { isBrowser } from "./is-browser";

export function share(shareData: ShareData) {
  if (isBrowser()) {
    navigator.share(shareData);
  }
}
