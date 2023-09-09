import { editListImmutable } from "@utils/helpers";
import { CommentReplyView } from "lemmy-js-client";

export default function editCommentReply(
  data: CommentReplyView,
  replies: CommentReplyView[],
): CommentReplyView[] {
  return editListImmutable("comment_reply", data, replies);
}
