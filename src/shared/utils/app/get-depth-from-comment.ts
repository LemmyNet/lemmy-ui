import { Comment } from "lemmy-js-client";

export default function getDepthFromComment(
  comment?: Comment
): number | undefined {
  const len = comment?.path.split(".").length;
  return len ? len - 2 : undefined;
}
