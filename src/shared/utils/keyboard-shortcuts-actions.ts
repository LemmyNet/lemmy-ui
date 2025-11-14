import {
  PersonContentCombinedView,
  PostView,
  CommentView,
  CommentSlimView,
  CreatePostLike,
  CreateCommentLike,
  SavePost,
  SaveComment,
  MyUserInfo,
} from "lemmy-js-client";
import { TContextRouter } from "inferno-router/dist/Router";
import { newVoteIsUpvote } from "@utils/app";
import { toggleDropdownMenu } from "./keyboard-shortcuts";
import {
  getCommentDropdownId,
  getPostDropdownId,
} from "./keyboard-shortcuts-constants";
import { personLink } from "../components/person/person-listing";
import { communityLink } from "../components/community/community-link";

/**
 * Action helpers for post and/or comment content
 * Works with PostView, CommentView, and PersonContentCombinedView
 */

export interface ContentActionHandlers {
  onPostVote?: (form: CreatePostLike) => void;
  onCommentVote?: (form: CreateCommentLike) => void;
  onSavePost?: (form: SavePost) => void;
  onSaveComment?: (form: SaveComment) => void;
}

/**
 * Extended handlers for unified keyboard shortcut dispatcher
 * Includes component-specific callbacks
 */
export interface KeyboardShortcutHandlers extends ContentActionHandlers {
  // Component-specific callbacks
  onExpand?: () => void;
  onCollapse?: () => void;
  onEdit?: () => void;
  onReply?: () => void;
  canEdit?: () => boolean;

  // Context
  router?: TContextRouter;
  myUserInfo?: MyUserInfo;
}

/**
 * Content item - can be a PostView, CommentView, CommentSlimView, or PersonContentCombinedView
 */
export type ContentItem =
  | PostView
  | CommentView
  | CommentSlimView
  | PersonContentCombinedView;

/**
 * Comment item - narrowed type for comments
 */
type CommentItem =
  | CommentView
  | CommentSlimView
  | (PersonContentCombinedView & { type_: "comment" });

/**
 * Post item - narrowed type for posts
 */
type PostItem = PostView | (PersonContentCombinedView & { type_: "post" });

/**
 * Check if content item is a comment
 * NOTE: Must check comment FIRST because CommentView has both 'comment' and 'post' properties
 * (the 'post' is the parent post for context)
 */
function isComment(item: ContentItem): item is CommentItem {
  // PersonContentCombinedView with comment: has 'type_' === "comment"
  if ("type_" in item) {
    return item.type_ === "comment";
  }
  // Pure CommentView or CommentSlimView: has 'comment' property
  // (may also have 'post' as the parent, so don't check for its absence)
  return "comment" in item;
}

/**
 * Check if content item is a post
 */
function isPost(item: ContentItem): item is PostItem {
  // PersonContentCombinedView with post: has 'type_' === "post"
  if ("type_" in item) {
    return item.type_ === "post";
  }
  // Pure PostView: has 'post' but NOT 'comment'
  // (must exclude comments because they also have 'post' as parent)
  return "post" in item && !("comment" in item);
}

/**
 * Navigate to a URL using router or new tab
 * Centralizes the navigation pattern used by all navigation helpers
 */
function navigate(url: string, router: TContextRouter, newTab = false): void {
  if (newTab) {
    window.open(url, "_blank");
  } else {
    router.history.push(url);
  }
}

/**
 * Handle upvote for post or comment
 */
export function handleUpvote(
  item: ContentItem,
  handlers: ContentActionHandlers,
) {
  if (isPost(item)) {
    handlers.onPostVote?.({
      post_id: item.post.id,
      is_upvote: newVoteIsUpvote("upvote", item.post_actions?.vote_is_upvote),
    });
  } else if (isComment(item)) {
    handlers.onCommentVote?.({
      comment_id: item.comment.id,
      is_upvote: newVoteIsUpvote(
        "upvote",
        item.comment_actions?.vote_is_upvote,
      ),
    });
  }
}

/**
 * Handle downvote for post or comment
 */
export function handleDownvote(
  item: ContentItem,
  handlers: ContentActionHandlers,
) {
  if (isPost(item)) {
    handlers.onPostVote?.({
      post_id: item.post.id,
      is_upvote: newVoteIsUpvote("downvote", item.post_actions?.vote_is_upvote),
    });
  } else if (isComment(item)) {
    handlers.onCommentVote?.({
      comment_id: item.comment.id,
      is_upvote: newVoteIsUpvote(
        "downvote",
        item.comment_actions?.vote_is_upvote,
      ),
    });
  }
}

/**
 * Handle save/unsave for post or comment
 */
export function handleSave(item: ContentItem, handlers: ContentActionHandlers) {
  if (isPost(item)) {
    handlers.onSavePost?.({
      post_id: item.post.id,
      save: !item.post_actions?.saved_at,
    });
  } else if (isComment(item)) {
    handlers.onSaveComment?.({
      comment_id: item.comment.id,
      save: !item.comment_actions?.saved_at,
    });
  }
}

/**
 * Navigate to comments (posts only)
 */
export function navigateToComments(
  item: ContentItem,
  router: TContextRouter,
  newTab = false,
) {
  if (isPost(item)) {
    navigate(`/post/${item.post.id}`, router, newTab);
  }
}

/**
 * Navigate to link (posts only)
 */
export function navigateToLink(
  item: ContentItem,
  router: TContextRouter,
  newTab = false,
) {
  if (isPost(item) && item.post.url) {
    navigate(item.post.url, router, newTab);
  }
}

/**
 * Navigate to user profile
 */
export function navigateToUser(
  item: ContentItem,
  router: TContextRouter,
  newTab = false,
) {
  const creator = item.creator;
  const { link } = personLink(creator);

  navigate(link, router, newTab);
}

/**
 * Navigate to community
 */
export function navigateToCommunity(
  item: ContentItem,
  router: TContextRouter,
  newTab = false,
) {
  // Both posts and comments have a community property
  const community = "community" in item ? item.community : undefined;
  if (!community) return;

  const { link } = communityLink(community);

  navigate(link, router, newTab);
}

/**
 * Get dropdown ID for post or comment
 */
export function getDropdownId(item: ContentItem): string {
  if (isPost(item)) {
    return getPostDropdownId(item.post.id);
  } else if (isComment(item)) {
    return getCommentDropdownId(item.comment.id);
  }
  return "";
}

/**
 * Universal keyboard shortcut handler
 * Handles all common keyboard shortcuts in one place
 * Component-specific actions (expand, edit, reply) are provided via callbacks
 *
 * @param event - The keyboard event
 * @param item - The content item (post or comment)
 * @param handlers - Action handlers and callbacks
 * @returns true if the key was handled (caller should preventDefault)
 */
export function handleKeyboardShortcut(
  event: KeyboardEvent,
  item: ContentItem,
  handlers: KeyboardShortcutHandlers,
): boolean {
  const { myUserInfo, router } = handlers;

  switch (event.key) {
    case "a": // Upvote
      if (myUserInfo) {
        handleUpvote(item, handlers);
        return true;
      }
      return false;

    case "z": // Downvote
      if (myUserInfo) {
        handleDownvote(item, handlers);
        return true;
      }
      return false;

    case "s": // Save
      if (myUserInfo) {
        handleSave(item, handlers);
        return true;
      }
      return false;

    case "c": // Comments (current tab)
      if (router) {
        navigateToComments(item, router);
        return true;
      }
      return false;

    case "C": // Comments (new tab)
      if (router) {
        navigateToComments(item, router, true);
        return true;
      }
      return false;

    case "l": // Link (current tab)
      if (router) {
        navigateToLink(item, router);
        return true;
      }
      return false;

    case "L": // Link (new tab)
      if (router) {
        navigateToLink(item, router, true);
        return true;
      }
      return false;

    case "u": // User (current tab)
      if (router) {
        navigateToUser(item, router);
        return true;
      }
      return false;

    case "U": // User (new tab)
      if (router) {
        navigateToUser(item, router, true);
        return true;
      }
      return false;

    case "r": // Context-aware: Community (posts) / Reply (comments)
      if (isComment(item) && myUserInfo && handlers.onReply) {
        handlers.onReply();
        return true;
      } else if (isPost(item) && router) {
        navigateToCommunity(item, router);
        return true;
      }
      return false;

    case "R": // Community (new tab)
      if (router) {
        navigateToCommunity(item, router, true);
        return true;
      }
      return false;

    case "x": // Expand (posts only, component-specific)
      if (handlers.onExpand) {
        handlers.onExpand();
        return true;
      }
      return false;

    case "e": // Edit (requires permission check)
      if (myUserInfo && handlers.canEdit?.() && handlers.onEdit) {
        handlers.onEdit();
        return true;
      }
      return false;

    case ".": // Advanced actions
      toggleDropdownMenu(getDropdownId(item));
      return true;

    case "Enter": // Collapse/expand (comments only, component-specific)
      if (handlers.onCollapse) {
        handlers.onCollapse();
        return true;
      }
      return false;

    default:
      return false; // Key not handled
  }
}
