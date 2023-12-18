import isBrowser from "./is-browser";

export default function isDark() {
  return true; // TODO: SSR hydration
  return (
    isBrowser() && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
