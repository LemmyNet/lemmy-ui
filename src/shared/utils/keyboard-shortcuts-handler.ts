import { TContextRouter } from "inferno-router/dist/Router";
import { MyUserInfo } from "lemmy-js-client";
import {
  areKeyboardShortcutsEnabled,
  shouldIgnoreEvent,
} from "./keyboard-shortcuts";
import {
  handleKeyboardShortcut,
  type ContentItem,
  type KeyboardShortcutHandlers,
} from "./keyboard-shortcuts-actions";

/**
 * Configuration for keyboard event handler
 */
export interface KeyboardHandlerConfig {
  // Context
  myUserInfo?: MyUserInfo;
  router?: TContextRouter;

  // Action callbacks
  onPostVote?: KeyboardShortcutHandlers["onPostVote"];
  onCommentVote?: KeyboardShortcutHandlers["onCommentVote"];
  onSavePost?: KeyboardShortcutHandlers["onSavePost"];
  onSaveComment?: KeyboardShortcutHandlers["onSaveComment"];
  onExpand?: KeyboardShortcutHandlers["onExpand"];
  onCollapse?: KeyboardShortcutHandlers["onCollapse"];
  onEdit?: KeyboardShortcutHandlers["onEdit"];
  onReply?: KeyboardShortcutHandlers["onReply"];
  canEdit?: KeyboardShortcutHandlers["canEdit"];

  // Additional checks
  viewOnly?: boolean;
  customKeyHandler?: (
    event: KeyboardEvent,
    item: ContentItem,
  ) => boolean | void;
}

/**
 * Shared keyboard event handler logic
 * Encapsulates common pattern:
 * 1. Check if shortcuts enabled and event should be handled
 * 2. Allow custom key handling
 * 3. Handle action keys with universal handler
 * 4. Call preventDefault if handled
 *
 * Returns true if event was handled (caller should return early)
 *
 * @example
 * handleKeyDown(event: KeyboardEvent) {
 *   // Handle navigation first (component-specific)
 *   if (this.navigationController.handleNavigationKey(event)) {
 *     event.preventDefault();
 *     return;
 *   }
 *
 *   // Handle actions with shared utility
 *   if (handleKeyboardAction(event, currentItem, {
 *     myUserInfo: this.props.myUserInfo,
 *     router: this.context.router,
 *     onPostVote: this.props.onPostVote,
 *     // ... other handlers
 *   })) {
 *     return; // Event was handled
 *   }
 * }
 */
export function handleKeyboardAction(
  event: KeyboardEvent,
  item: ContentItem,
  config: KeyboardHandlerConfig,
): boolean {
  // Check if shortcuts enabled and should handle event
  if (
    !areKeyboardShortcutsEnabled() ||
    shouldIgnoreEvent(event) ||
    config.viewOnly
  ) {
    return false;
  }

  // Allow custom key handler (for component-specific keys)
  if (config.customKeyHandler) {
    const customHandled = config.customKeyHandler(event, item);
    if (customHandled) {
      event.preventDefault();
      return true;
    }
  }

  // Build handlers object for universal handler
  const handlers: KeyboardShortcutHandlers = {
    myUserInfo: config.myUserInfo,
    router: config.router,
    onPostVote: config.onPostVote,
    onCommentVote: config.onCommentVote,
    onSavePost: config.onSavePost,
    onSaveComment: config.onSaveComment,
    onExpand: config.onExpand,
    onCollapse: config.onCollapse,
    onEdit: config.onEdit,
    onReply: config.onReply,
    canEdit: config.canEdit,
  };

  // Handle action keys
  const handled = handleKeyboardShortcut(event, item, handlers);

  if (handled) {
    event.preventDefault();
  }

  return handled;
}
