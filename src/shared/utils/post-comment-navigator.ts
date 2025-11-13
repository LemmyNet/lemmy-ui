import { ensureInView } from "@utils/keyboard-shortcuts";
import {
  getCommentElementId,
  parseCommentId,
  SELECTOR,
} from "./keyboard-shortcuts-constants";

/**
 * Handles comment tree navigation for Post component
 * Depth-first traversal between post and comments
 */
export class PostCommentNavigator {
  constructor(
    private getCommentElements: () => HTMLElement[],
    private getHighlightedCommentId: () => number | null,
    private setHighlightedCommentId: (id: number | null) => void,
  ) {}

  /**
   * Navigate to next comment (j key)
   * If on post, goes to first comment
   * If on last comment, does nothing
   */
  navigateNext(): boolean {
    const commentElements = this.getCommentElements();
    const highlightedCommentId = this.getHighlightedCommentId();

    // Find current index
    const currentIndex = this.findCurrentIndex(
      commentElements,
      highlightedCommentId,
    );

    // Can we move to next comment?
    if (currentIndex < commentElements.length - 1) {
      const nextElement = commentElements[currentIndex + 1];
      const nextCommentId = this.getCommentIdFromElement(nextElement);
      this.setHighlightedCommentId(nextCommentId);
      this.scrollToAndFocus(nextElement);
      return true;
    }

    return false;
  }

  /**
   * Navigate to previous comment (k key)
   * If on first comment, goes back to post
   * If on post, does nothing
   */
  navigatePrevious(): boolean {
    const commentElements = this.getCommentElements();
    const highlightedCommentId = this.getHighlightedCommentId();

    const currentIndex = this.findCurrentIndex(
      commentElements,
      highlightedCommentId,
    );

    if (currentIndex > 0) {
      // Go to previous comment
      const prevElement = commentElements[currentIndex - 1];
      const prevCommentId = this.getCommentIdFromElement(prevElement);
      this.setHighlightedCommentId(prevCommentId);
      this.scrollToAndFocus(prevElement);
      return true;
    } else if (currentIndex === 0) {
      // Go back to post
      this.setHighlightedCommentId(null);
      const postElement = document.querySelector(SELECTOR.POST) as HTMLElement;
      if (postElement) {
        this.scrollToAndFocus(postElement);
      }
      return true;
    }

    return false;
  }

  /**
   * Navigate to last comment (J key)
   * Does nothing if no comments
   */
  navigateToLast(): boolean {
    const commentElements = this.getCommentElements();

    if (commentElements.length > 0) {
      const lastElement = commentElements[commentElements.length - 1];
      const lastCommentId = this.getCommentIdFromElement(lastElement);
      this.setHighlightedCommentId(lastCommentId);
      this.scrollToAndFocus(lastElement);
      return true;
    }

    return false;
  }

  /**
   * Navigate to first comment or post (K key)
   * Goes to first comment if comments exist, otherwise to post
   */
  navigateToFirst(): boolean {
    const commentElements = this.getCommentElements();

    if (commentElements.length > 0) {
      // Go to first comment
      const firstElement = commentElements[0];
      const firstCommentId = this.getCommentIdFromElement(firstElement);
      this.setHighlightedCommentId(firstCommentId);
      this.scrollToAndFocus(firstElement);
      return true;
    } else {
      // No comments, go to post
      this.setHighlightedCommentId(null);
      const postElement = document.querySelector(SELECTOR.POST) as HTMLElement;
      if (postElement) {
        this.scrollToAndFocus(postElement);
      }
      return true;
    }
  }

  /**
   * Navigate to parent comment (p key)
   * If on a nested comment, goes to its parent comment
   * If on a top-level comment, goes to the post
   * If on post, does nothing
   */
  navigateToParent(): boolean {
    const highlightedCommentId = this.getHighlightedCommentId();

    // If on post, can't go to parent
    if (highlightedCommentId === null) {
      return false;
    }

    // Find current comment element
    const currentElement = document.getElementById(
      getCommentElementId(highlightedCommentId),
    ) as HTMLElement;

    if (!currentElement) {
      return false;
    }

    // Find parent comment by traversing up the DOM
    // Comments are nested in the DOM structure
    // We need to go up past the current comment's container to find the parent article
    const parentCommentElement = this.findParentCommentElement(currentElement);

    if (parentCommentElement) {
      // Found a parent comment - navigate to it
      const parentCommentId =
        this.getCommentIdFromElement(parentCommentElement);
      this.setHighlightedCommentId(parentCommentId);
      this.scrollToAndFocus(parentCommentElement);
      return true;
    } else {
      // No parent comment found - this is a top-level comment, go to post
      this.setHighlightedCommentId(null);
      const postElement = document.querySelector(SELECTOR.POST) as HTMLElement;
      if (postElement) {
        this.scrollToAndFocus(postElement);
      }
      return true;
    }
  }

  /**
   * Navigate to thread root (t key)
   * Navigates to the top-level comment of the current thread
   * If already at top-level or on post, does nothing
   */
  navigateToThreadRoot(): boolean {
    const highlightedCommentId = this.getHighlightedCommentId();

    // If on post, can't navigate to thread root
    if (highlightedCommentId === null) {
      return false;
    }

    // Find current comment element
    const currentElement = document.getElementById(
      getCommentElementId(highlightedCommentId),
    ) as HTMLElement;

    if (!currentElement) {
      return false;
    }

    // Traverse up to find the topmost parent comment
    let rootElement = currentElement;
    let parentElement = this.findParentCommentElement(currentElement);

    while (parentElement) {
      rootElement = parentElement;
      parentElement = this.findParentCommentElement(rootElement);
    }

    // If we found a different root, navigate to it
    if (rootElement !== currentElement) {
      const rootCommentId = this.getCommentIdFromElement(rootElement);
      this.setHighlightedCommentId(rootCommentId);
      this.scrollToAndFocus(rootElement);
      return true;
    }

    // Already at root, no change
    return false;
  }

  /**
   * Navigate to next sibling comment (J key)
   * Moves to the next comment at the same level
   * If no next sibling exists, goes to parent's next sibling (recursively)
   * This maintains downward visual flow even when ascending tree levels
   */
  navigateToNextSibling(): boolean {
    const highlightedCommentId = this.getHighlightedCommentId();

    // If on post, can't navigate to sibling
    if (highlightedCommentId === null) {
      return false;
    }

    // Find current comment element
    const currentElement = document.getElementById(
      getCommentElementId(highlightedCommentId),
    ) as HTMLElement;

    if (!currentElement) {
      return false;
    }

    // Try to find next sibling at current level
    const nextSibling = this.findNextSiblingElement(currentElement);
    if (nextSibling) {
      const nextCommentId = this.getCommentIdFromElement(nextSibling);
      this.setHighlightedCommentId(nextCommentId);
      this.scrollToAndFocus(nextSibling);
      return true;
    }

    // No next sibling - go up to parent and try its next sibling
    let ancestorElement = currentElement;
    while (true) {
      const parentElement = this.findParentCommentElement(ancestorElement);
      if (!parentElement) {
        // Reached top-level comment with no next sibling
        return false;
      }

      // Try to find parent's next sibling
      const parentNextSibling = this.findNextSiblingElement(parentElement);
      if (parentNextSibling) {
        const nextCommentId = this.getCommentIdFromElement(parentNextSibling);
        this.setHighlightedCommentId(nextCommentId);
        this.scrollToAndFocus(parentNextSibling);
        return true;
      }

      // Parent also has no next sibling - continue up the tree
      ancestorElement = parentElement;
    }
  }

  /**
   * Navigate to previous sibling comment (K key)
   * Moves to the previous comment at the same level
   * If no previous sibling exists, goes to parent
   */
  navigateToPreviousSibling(): boolean {
    const highlightedCommentId = this.getHighlightedCommentId();

    // If on post, can't navigate to sibling
    if (highlightedCommentId === null) {
      return false;
    }

    // Find current comment element
    const currentElement = document.getElementById(
      getCommentElementId(highlightedCommentId),
    ) as HTMLElement;

    if (!currentElement) {
      return false;
    }

    // Try to find previous sibling at current level
    const prevSibling = this.findPrevSiblingElement(currentElement);
    if (prevSibling) {
      const prevCommentId = this.getCommentIdFromElement(prevSibling);
      this.setHighlightedCommentId(prevCommentId);
      this.scrollToAndFocus(prevSibling);
      return true;
    }

    // No previous sibling - go to parent
    const parentElement = this.findParentCommentElement(currentElement);
    if (parentElement) {
      const parentCommentId = this.getCommentIdFromElement(parentElement);
      this.setHighlightedCommentId(parentCommentId);
      this.scrollToAndFocus(parentElement);
      return true;
    }

    // No parent (top-level comment) and no previous sibling
    return false;
  }

  /**
   * Find current index in comment elements array
   * Returns -1 if on post (highlightedCommentId is null)
   */
  private findCurrentIndex(
    commentElements: HTMLElement[],
    highlightedCommentId: number | null,
  ): number {
    if (highlightedCommentId === null) {
      return -1; // Currently on post
    }

    return commentElements.findIndex(
      el => el.id === getCommentElementId(highlightedCommentId),
    );
  }

  /**
   * Extract comment ID from element's id attribute
   */
  private getCommentIdFromElement(element: HTMLElement): number {
    return parseCommentId(element.id);
  }

  /**
   * Find parent comment element by traversing up the DOM
   * Returns null if no parent comment exists (i.e., this is a top-level comment)
   *
   * DOM structure:
   * <li class="comment">
   *   <article id="comment-123">...</article>
   *   <ul class="comments">
   *     <li class="comment">
   *       <article id="comment-456">...</article>  <-- current
   *     </li>
   *   </ul>
   * </li>
   */
  private findParentCommentElement(element: HTMLElement): HTMLElement | null {
    // Start from current article element
    // Go up: article -> li -> ul (siblings wrapper) -> li (parent comment) -> article (parent)

    // Step 1: Find the <li> containing this comment
    const commentLi = element.closest("li.comment");
    if (!commentLi) return null;

    // Step 2: Find the parent <ul> (the siblings container)
    const siblingsUl = commentLi.parentElement;
    if (!siblingsUl || siblingsUl.tagName !== "UL") return null;

    // Step 3: Find the parent <li> containing the parent comment
    const parentLi = siblingsUl.closest("li.comment");
    if (!parentLi) return null;

    // Step 4: Find the <article> within the parent <li>
    // Use querySelector to find the direct child article (not nested ones)
    const parentArticle = parentLi.querySelector(
      ":scope > article[id^='comment-']",
    ) as HTMLElement;

    return parentArticle;
  }

  /**
   * Get all sibling comment elements at the same level as the given element
   * Returns array of article elements that are siblings of the current comment
   */
  private getSiblingComments(element: HTMLElement): HTMLElement[] | null {
    // Step 1: Find the <li> containing this comment
    const commentLi = element.closest("li.comment");
    if (!commentLi) return null;

    // Step 2: Find the parent <ul> containing all siblings
    const siblingsUl = commentLi.parentElement;
    if (!siblingsUl || siblingsUl.tagName !== "UL") return null;

    // Step 3: Get all direct child <li class="comment"> elements
    const siblingLis = Array.from(
      siblingsUl.querySelectorAll(":scope > li.comment"),
    );

    // Step 4: Extract the article element from each sibling <li>
    const siblingArticles = siblingLis
      .map(li => li.querySelector(":scope > article[id^='comment-']"))
      .filter(article => article !== null) as HTMLElement[];

    return siblingArticles;
  }

  /**
   * Find the next sibling comment element at the same level
   * Returns null if no next sibling exists
   */
  private findNextSiblingElement(element: HTMLElement): HTMLElement | null {
    const siblings = this.getSiblingComments(element);
    if (!siblings || siblings.length === 0) {
      return null;
    }

    const currentIndex = siblings.findIndex(sibling => sibling === element);
    if (currentIndex === -1 || currentIndex >= siblings.length - 1) {
      return null;
    }

    return siblings[currentIndex + 1];
  }

  /**
   * Find the previous sibling comment element at the same level
   * Returns null if no previous sibling exists
   */
  private findPrevSiblingElement(element: HTMLElement): HTMLElement | null {
    const siblings = this.getSiblingComments(element);
    if (!siblings || siblings.length === 0) {
      return null;
    }

    const currentIndex = siblings.findIndex(sibling => sibling === element);
    if (currentIndex <= 0) {
      return null;
    }

    return siblings[currentIndex - 1];
  }

  /**
   * Scroll to element and focus it
   */
  private scrollToAndFocus(element: HTMLElement): void {
    ensureInView(element);
    element.focus();
  }
}
