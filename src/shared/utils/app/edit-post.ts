import { editListImmutable } from "@utils/helpers";
import { PostView } from "lemmy-js-client";

export default function editPost(
  data: PostView,
  posts: PostView[]
): PostView[] {
  return editListImmutable("post", data, posts);
}
