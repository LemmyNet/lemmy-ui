import { isBrowser } from "@utils/browser";

export const bootstrapBreakpoints = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
} as const;

export type BootstrapBreakpoint = keyof typeof bootstrapBreakpoints;

export interface MobileSidebarState {
  isMobile: boolean;
  showSidebarMobile: boolean;
}

type SetMobileSidebarState = (
  updater: (prev: MobileSidebarState) => MobileSidebarState,
) => void;

// Bootstrap uses a fractional offset so "down" never overlaps the next "up" range.
const maxWidthOffset = 0.02;

const getBreakpointDownQuery = (breakpoint: BootstrapBreakpoint): string =>
  `(max-width: ${bootstrapBreakpoints[breakpoint] - maxWidthOffset}px)`;

/** Current state. Always `false` during SSR. */
export function isBreakpointDown(breakpoint: BootstrapBreakpoint): boolean {
  return (
    isBrowser() && window.matchMedia(getBreakpointDownQuery(breakpoint)).matches
  );
}

/**
 * Notifies on changes only (not on subscribe). No-op during SSR.
 * Read the initial value with `isBreakpointDown`.
 */
export function subscribeBreakpointDown(
  breakpoint: BootstrapBreakpoint,
  onChange: (isDown: boolean) => void,
): () => void {
  if (!isBrowser()) return () => {};

  const mediaQuery = window.matchMedia(getBreakpointDownQuery(breakpoint));
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);

  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}

export function subscribeMobileSidebar(
  breakpoint: BootstrapBreakpoint,
  setState: SetMobileSidebarState,
): () => void {
  const update = (isMobile: boolean) =>
    setState(prev => ({
      isMobile,
      showSidebarMobile: isMobile ? prev.showSidebarMobile : false,
    }));

  if (isBreakpointDown(breakpoint)) {
    update(true);
  }

  return subscribeBreakpointDown(breakpoint, update);
}
