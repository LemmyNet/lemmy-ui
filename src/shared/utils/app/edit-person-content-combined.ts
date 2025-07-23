import isCommentView from "@utils/helpers/is-comment-view";
import mapContentViewToContentCombinedView from "@utils/helpers/map-content-view-to-content-combined-view";
import {
  CommentView,
  PersonContentCombinedView,
  PostView,
} from "lemmy-js-client";

export default function editPersonContentCombined(
  data: CommentView | PostView,
  content: PersonContentCombinedView[],
) {
  const id = isCommentView(data) ? data.comment.id : data.post.id;

  return [
    ...content.map(c =>
      (c.type_ === "Comment" && c.comment.id === id) ||
      (c.type_ === "Post" && c.post.id === id)
        ? mapContentViewToContentCombinedView(data)
        : c,
    ),
  ];
}
