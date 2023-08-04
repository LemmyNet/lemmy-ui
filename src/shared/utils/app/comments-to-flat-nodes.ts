import { CommentView } from "lemmy-js-client";
import { CommentNodeI } from "../../interfaces";

export default function commentsToFlatNodes(
  comments: CommentView[],
): CommentNodeI[] {
  const nodes: CommentNodeI[] = [];
  for (const comment of comments) {
    nodes.push({ comment_view: comment, children: [], depth: 0 });
  }
  return nodes;
}
