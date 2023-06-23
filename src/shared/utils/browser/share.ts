import { isBrowser } from "@utils/browser";

export default function share(shareData: ShareData) {
  if (isBrowser()) {
    navigator.share(shareData);
  }
}
