/**
 * Keyboard Shortcuts Utilities
 *
 * Core utilities for keyboard shortcut handling in Lemmy-UI.
 * Provides RES-style keyboard navigation for posts and comments.
 *
 * @module keyboard-shortcuts
 */

import { isBrowser } from "./browser";

/**
 * Check if keyboard shortcuts should be enabled
 * @returns true if browser environment and shortcuts enabled
 */
export function areKeyboardShortcutsEnabled(): boolean {
  if (!isBrowser()) {
    return false;
  }
  return true;
}

/**
 * Check if element is a form control that needs all keyboard input
 * @param element - The element to check
 * @returns true if element is a form control (input, textarea, select, contentEditable)
 */
function isFormControl(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();

  if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  ) {
    return true;
  }

  // Check for form-control ARIA roles
  const role = element.getAttribute("role");
  if (
    role === "textbox" ||
    role === "searchbox" ||
    role === "combobox" ||
    role === "spinbutton" ||
    role === "slider"
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a specific key is handled by the focused element
 * Only blocks keys that the element actually responds to
 * @param event - The keyboard event
 * @param element - The focused element
 * @returns true if element handles this specific key
 */
function elementHandlesKey(
  event: KeyboardEvent,
  element: HTMLElement,
): boolean {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const key = event.key;

  // Buttons respond to Space and Enter
  if (tagName === "button" || role === "button" || role === "menuitem") {
    return key === " " || key === "Enter";
  }

  // Links respond to Enter
  if (tagName === "a" || role === "link") {
    return key === "Enter";
  }

  // Summary (disclosure) responds to Space and Enter
  if (tagName === "summary") {
    return key === " " || key === "Enter";
  }

  // Checkboxes/switches respond to Space
  if (
    role === "checkbox" ||
    role === "switch" ||
    role === "menuitemcheckbox" ||
    role === "radio" ||
    role === "menuitemradio"
  ) {
    return key === " ";
  }

  // Tab controls respond to arrow keys and Home/End
  if (role === "tab") {
    return (
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "Home" ||
      key === "End"
    );
  }

  return false;
}

/**
 * Determine if a keyboard event should be ignored
 * Ignores events from form controls (which need all keys) and specific keys
 * handled by interactive elements (e.g., Space/Enter on buttons)
 *
 * @param event - The keyboard event
 * @returns true if event should be ignored
 */
export function shouldIgnoreEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;

  // Always ignore events from form controls (they need all keyboard input)
  if (isFormControl(target)) {
    return true;
  }

  // For other interactive elements, only ignore keys they actually handle
  if (elementHandlesKey(event, target)) {
    return true;
  }

  // Ignore if inside a modal
  if (target.closest(".modal, [role='dialog']")) {
    return true;
  }

  // Ignore if inside a form being actively used
  const tagName = target.tagName.toLowerCase();
  if (target.closest("form") && tagName !== "form") {
    return true;
  }

  // Ignore if modifier keys are pressed (except Shift for new tab behavior)
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }

  return false;
}

/**
 * Ensure element is visible in viewport with minimal scrolling
 * Uses "nearest" positioning to avoid unnecessary viewport jumps during keyboard navigation
 *
 * @param element - Element to scroll to
 * @param behavior - Scroll behavior (default: "instant")
 */
export function ensureInView(
  element: HTMLElement,
  behavior: ScrollBehavior = "instant",
): void {
  element.scrollIntoView({
    behavior,
    block: "nearest",
    inline: "nearest",
  });
}

/**
 * Toggle a Bootstrap dropdown menu by its ID
 * Clicking the button triggers Bootstrap's toggle behavior and lazy-renders dropdown content
 *
 * @param dropdownId - The ID of the dropdown menu (e.g., "comment-actions-dropdown-123")
 */
export function toggleDropdownMenu(dropdownId: string): void {
  if (!isBrowser()) return;

  const dropdownButton = document.querySelector(
    `button[aria-controls="${dropdownId}"]`,
  ) as HTMLElement;

  if (!dropdownButton) return;

  dropdownButton.click();
}
