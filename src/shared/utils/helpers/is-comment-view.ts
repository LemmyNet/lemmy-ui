import { CommentView, PostView } from "lemmy-js-client";

export default function isCommentView(
  view: CommentView | PostView,
): view is CommentView {
  return "comment" in view;
}
