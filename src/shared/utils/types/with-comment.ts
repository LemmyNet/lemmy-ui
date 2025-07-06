import { Comment, CommentActions, PersonActions } from "lemmy-js-client";

export default interface WithComment {
  comment: Comment;
  counts: CommentActions;
  person_actions: PersonActions;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  creator_is_banned: boolean;
  creator_banned_from_community: boolean;
}
