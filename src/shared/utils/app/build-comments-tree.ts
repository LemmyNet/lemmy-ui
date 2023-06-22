import { getCommentParentId, getDepthFromComment } from "@utils/app";
import type { CommentNodeI } from "@utils/types";
import { CommentView } from "lemmy-js-client";

export default function buildCommentsTree(
  comments: CommentView[],
  parentComment: boolean
): CommentNodeI[] {
  const map = new Map<number, CommentNodeI>();
  const depthOffset = !parentComment
    ? 0
    : getDepthFromComment(comments[0].comment) ?? 0;

  for (const comment_view of comments) {
    const depthI = getDepthFromComment(comment_view.comment) ?? 0;
    const depth = depthI ? depthI - depthOffset : 0;
    const node: CommentNodeI = {
      comment_view,
      children: [],
      depth,
    };
    map.set(comment_view.comment.id, { ...node });
  }

  const tree: CommentNodeI[] = [];

  // if its a parent comment fetch, then push the first comment to the top node.
  if (parentComment) {
    const cNode = map.get(comments[0].comment.id);
    if (cNode) {
      tree.push(cNode);
    }
  }

  for (const comment_view of comments) {
    const child = map.get(comment_view.comment.id);
    if (child) {
      const parent_id = getCommentParentId(comment_view.comment);
      if (parent_id) {
        const parent = map.get(parent_id);
        // Necessary because blocked comment might not exist
        if (parent) {
          parent.children.push(child);
        }
      } else {
        if (!parentComment) {
          tree.push(child);
        }
      }
    }
  }

  return tree;
}
