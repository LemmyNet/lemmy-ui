/**
 * Constants for keyboard shortcuts implementation
 * Centralizes all magic strings, selectors, and patterns
 */

/**
 * Element ID prefixes (internal use)
 */
const ID_PREFIX = {
  /** Prefix for comment element IDs: "comment-123" */
  COMMENT: "comment-",
  /** Prefix for comment dropdown IDs: "comment-actions-dropdown-123" */
  COMMENT_ACTIONS_DROPDOWN: "comment-actions-dropdown-",
  /** Prefix for post dropdown IDs: "post-actions-dropdown-123" */
  POST_ACTIONS_DROPDOWN: "post-actions-dropdown-",
} as const;

/**
 * Data attribute names (internal use)
 */
const DATA_ATTR = {
  /** Attribute for post elements */
  POST_ID: "data-post-id",
  /** Attribute for person detail items */
  PERSON_DETAIL_INDEX: "data-person-detail-index",
} as const;

/**
 * CSS selectors
 */
export const SELECTOR = {
  /** Selector for post elements with data-post-id attribute */
  POST: `[${DATA_ATTR.POST_ID}]`,
  /** Selector for comment articles starting with comment- */
  COMMENT_ARTICLES: "article[id^='comment-']",
} as const;

/**
 * Regex patterns
 */
export const PATTERN = {
  /** Pattern to match comment IDs: "comment-123" */
  COMMENT_ID: /^comment-\d+$/,
} as const;

/**
 * Helper functions for common operations
 */

/**
 * Generate comment element ID
 * @param commentId - The comment ID number
 * @returns Element ID string like "comment-123"
 */
export function getCommentElementId(commentId: number): string {
  return `${ID_PREFIX.COMMENT}${commentId}`;
}

/**
 * Generate comment dropdown ID
 * @param commentId - The comment ID number
 * @returns Dropdown ID string like "comment-actions-dropdown-123"
 */
export function getCommentDropdownId(commentId: number): string {
  return `${ID_PREFIX.COMMENT_ACTIONS_DROPDOWN}${commentId}`;
}

/**
 * Generate post dropdown ID
 * @param postId - The post ID number
 * @returns Dropdown ID string like "post-actions-dropdown-123"
 */
export function getPostDropdownId(postId: number): string {
  return `${ID_PREFIX.POST_ACTIONS_DROPDOWN}${postId}`;
}

/**
 * Parse comment ID from element ID
 * @param elementId - Element ID like "comment-123"
 * @returns The numeric comment ID
 */
export function parseCommentId(elementId: string): number {
  return parseInt(elementId.replace(ID_PREFIX.COMMENT, ""), 10);
}

/**
 * Generate selector for person detail item by index
 * @param index - The item index
 * @returns CSS selector string
 */
export function getPersonDetailIndexSelector(index: number): string {
  return `[${DATA_ATTR.PERSON_DETAIL_INDEX}="${index}"]`;
}
