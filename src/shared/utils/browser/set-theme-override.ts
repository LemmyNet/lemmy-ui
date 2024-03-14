import { isBrowser } from "@utils/browser";

export default async function setThemeOverride(theme?: string) {
  if (!isBrowser()) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("set-theme-override", { detail: { theme } }),
  );
}
