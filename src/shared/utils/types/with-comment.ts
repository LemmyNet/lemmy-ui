import { Comment, CommentAggregates } from "lemmy-js-client";

export default interface WithComment {
  comment: Comment;
  counts: CommentAggregates;
  my_vote?: number;
  saved: boolean;
}
