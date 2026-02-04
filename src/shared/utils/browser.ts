import * as cookie from "cookie";
import { authCookieName } from "@utils/config";
import { isHttps } from "@utils/env";

export function canShare() {
  return isBrowser() && !!navigator.canShare;
}

export function clearAuthCookie() {
  document.cookie = cookie.serialize(authCookieName, "", {
    maxAge: -1,
    sameSite: "lax",
    path: "/",
  });
}

type BsTheme = "dark" | "light";

export function dataBsTheme(theme: string): BsTheme {
  return (isDark() && theme === "browser") || theme.includes("dark")
    ? "dark"
    : "light";
}

export function isBrowser() {
  return typeof window !== "undefined";
}

export function isDark() {
  return (
    isBrowser() && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

const eventTypes = ["mousedown", "keydown", "touchstart", "touchmove", "wheel"];

const scrollThreshold = 2;

type Continue = boolean | void;

export function nextUserAction(cb: (e: Event) => Continue) {
  const eventTarget = window.document.body;

  let cleanup: (() => void) | undefined = () => {
    cleanup = undefined;
    eventTypes.forEach(ev => {
      eventTarget.removeEventListener(ev, listener);
    });
    window.removeEventListener("scroll", scrollListener);
  };

  const listener = (e: Event) => {
    if (!cb(e)) {
      cleanup?.();
    }
  };
  eventTypes.forEach(ev => {
    eventTarget.addEventListener(ev, listener);
  });

  let remaining = scrollThreshold;
  const scrollListener = (e: Event) => {
    // This only has to cover the scrollbars. The problem is that scroll events
    // are also fired when the document height shrinks below the current bottom
    // edge of the window.
    remaining--;
    if (remaining < 0) {
      if (!cb(e)) {
        cleanup?.();
      } else {
        remaining = scrollThreshold;
      }
    }
  };
  window.addEventListener("scroll", scrollListener);

  return () => {
    cleanup?.();
  };
}

const platformString = () =>
  navigator.platform?.match(/mac|win|linux/i)?.[0].toLowerCase();
const getPlatformPredicate = (platform: string) => () =>
  isBrowser() && platformString() === platform;
const isWin = getPlatformPredicate("win");
const isMac = getPlatformPredicate("mac");
const isLinux = getPlatformPredicate("linux");

export const platform = { isWin, isMac, isLinux };

export function refreshTheme() {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("refresh-theme"));
  }
}

export function setAuthCookie(jwt: string) {
  document.cookie = cookie.serialize(authCookieName, jwt, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    secure: isHttps(),
    sameSite: "lax",
    path: "/",
  });
}

export function setThemeOverride(theme?: string) {
  if (!isBrowser()) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("set-theme-override", { detail: { theme } }),
  );
}

export async function share(shareData: ShareData) {
  if (isBrowser()) {
    await navigator.share(shareData);
  }
}

export function snapToTop() {
  window.scrollTo({ left: 0, top: 0, behavior: "instant" });
}

export async function masonryUpdate() {
  if (isBrowser() && document.getElementsByClassName("post-listings-grid")) {
    const Masonry = (await import("masonry-layout")).default;
    new Masonry(".post-listings-grid", {
      percentPosition: true,
      horizontalOrder: true,
    });
  }
}
