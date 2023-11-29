import { Comment, CommentAggregates } from "lemmy-js-client";

export default interface WithComment {
  comment: Comment;
  counts: CommentAggregates;
  my_vote?: number;
  saved: boolean;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  creator_blocked: boolean;
  creator_banned_from_community: boolean;
}
