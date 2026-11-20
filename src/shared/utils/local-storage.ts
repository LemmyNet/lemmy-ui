import { isBrowser } from "@utils/browser";

export const localStorageKeys = {
  homeSidebarSubscribedCommunitiesCollapsed:
    "homeSidebarSubscribedCommunitiesCollapsed",
  homeSidebarMultiCommunitiesCollapsed: "homeSidebarMultiCommunitiesCollapsed",
} as const;

export type StorageKey =
  (typeof localStorageKeys)[keyof typeof localStorageKeys];

export function getLocalStorageItem(key: StorageKey): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalStorageItem(key: StorageKey, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (e.g. private browsing / quota exceeded)
  }
}

export function removeLocalStorageItem(key: StorageKey): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}
