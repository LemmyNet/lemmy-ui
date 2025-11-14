/**
 * Utilities for managing post expansion state
 */

import { ShowBodyType } from "@utils/types";

/**
 * Toggle expansion state for a given index
 * Returns a new Set with the index added or removed
 *
 * @immutable Does not modify the input Set - always returns a new Set
 * @param expandedSet - The current set of expanded post indices
 * @param index - The index to toggle
 * @returns A new Set with the index added or removed
 */
export function toggleExpansion(
  expandedSet: Set<number>,
  index: number,
): Set<number> {
  const newSet = new Set(expandedSet);
  if (newSet.has(index)) {
    newSet.delete(index);
  } else {
    newSet.add(index);
  }
  return newSet;
}

/**
 * Unified state interface for keyboard navigation and post expansion
 */
export interface KeyboardNavigationState {
  highlightedIndex: number;
  expandedPostIndices: Set<number>;
}

/**
 * Get show body mode based on expansion state
 *
 * Determines whether a post should show its full body or just a preview.
 * Used in keyboard-enabled components to control post display state:
 *
 * - Parent component (PostListings) controls expansion state via `expandedPostIndices` Set
 * - Child component (PostListing) receives state via `showBody` prop
 * - User can toggle expansion with 'x' key, which updates parent state
 * - Expansion state is independent of user's default view preferences
 *
 * @param expandedSet - The set of expanded post indices from component state
 * @param index - The index of the post to check
 * @returns "full" if post should be expanded, "preview" otherwise
 */
export function getShowBodyMode(
  expandedSet: Set<number>,
  index: number,
): ShowBodyType {
  return expandedSet.has(index) ? "full" : "preview";
}
