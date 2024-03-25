import { isBrowser } from ".";

export default function refreshTheme() {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("refresh-theme"));
  }
}
