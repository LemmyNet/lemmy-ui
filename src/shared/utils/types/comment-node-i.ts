import { CommentView } from "lemmy-js-client";

export default interface CommentNodeI {
  comment_view: CommentView;
  children: Array<CommentNodeI>;
  depth: number;
}
