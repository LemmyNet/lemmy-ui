import { PostView } from "lemmy-js-client";
import { UserService } from "../../services";

export default function nsfwCheck(
  pv: PostView,
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const nsfw = pv.post.nsfw || pv.community.nsfw;
  const myShowNsfw = myUserInfo?.local_user_view.local_user.show_nsfw ?? false;
  return !nsfw || (nsfw && myShowNsfw);
}
