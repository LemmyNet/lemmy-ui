import { CommentNodeI } from "../../interfaces";

export default function searchCommentTree(
  tree: CommentNodeI[],
  id: number
): CommentNodeI | undefined {
  for (const node of tree) {
    if (node.comment_view.comment.id === id) {
      return node;
    }

    for (const child of node.children) {
      const res = searchCommentTree([child], id);

      if (res) {
        return res;
      }
    }
  }
  return undefined;
}
