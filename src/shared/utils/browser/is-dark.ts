import isBrowser from "./is-browser";

export default function isDark() {
  return (
    isBrowser() && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
