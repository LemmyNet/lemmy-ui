import { editListImmutable } from "@utils/helpers";
import { CommentView } from "lemmy-js-client";

export default function editComment(
  data: CommentView,
  comments: CommentView[]
): CommentView[] {
  return editListImmutable("comment", data, comments);
}
