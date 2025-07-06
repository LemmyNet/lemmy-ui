import { editListImmutable } from "@utils/helpers";
import { CommentReply } from "lemmy-js-client";

export default function editCommentReply(
  data: CommentReply,
  replies: CommentReply[],
): CommentReply[] {
  return editListImmutable("comment_reply", data, replies);
}
