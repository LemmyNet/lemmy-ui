import { CommentNodeI, CommentNodeView } from "../../interfaces";

export default function commentsToFlatNodes(
  comments: CommentNodeView[],
): CommentNodeI[] {
  const nodes: CommentNodeI[] = [];
  for (const comment of comments) {
    nodes.push({ comment_view: comment, children: [], depth: 0 });
  }
  return nodes;
}
