import isBrowser from "./is-browser";

export default function share(shareData: ShareData) {
  if (isBrowser()) {
    navigator.share(shareData);
  }
}
