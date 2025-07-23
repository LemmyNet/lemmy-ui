import {
  CommentView,
  PersonContentCombinedView,
  PostView,
} from "lemmy-js-client";
import isCommentView from "./is-comment-view";

export default function mapContentViewToContentCombinedView(
  view: CommentView | PostView,
): PersonContentCombinedView {
  const combinedView = Object.entries(view).reduce((acc, [k, v]) => {
    acc[k] = v;
    return acc;
  }, {} as PersonContentCombinedView);

  combinedView.type_ = isCommentView(view) ? "Comment" : "Post";
  return combinedView;
}
