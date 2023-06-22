import { getCommentParentId, searchCommentTree } from "@utils/app";
import { CommentNodeI } from "@utils/types";
import { CommentView } from "lemmy-js-client";

export default function insertCommentIntoTree(
  tree: CommentNodeI[],
  cv: CommentView,
  parentComment: boolean
) {
  // Building a fake node to be used for later
  const node: CommentNodeI = {
    comment_view: cv,
    children: [],
    depth: 0,
  };

  const parentId = getCommentParentId(cv.comment);
  if (parentId) {
    const parent_comment = searchCommentTree(tree, parentId);
    if (parent_comment) {
      node.depth = parent_comment.depth + 1;
      parent_comment.children.unshift(node);
    }
  } else if (!parentComment) {
    tree.unshift(node);
  }
}
