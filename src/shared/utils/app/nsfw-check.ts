import { MyUserInfo, PostView } from "lemmy-js-client";

export default function nsfwCheck(
  pv: PostView,
  myUserInfo?: MyUserInfo,
): boolean {
  const nsfw = pv.post.nsfw || pv.community.nsfw;
  const myShowNsfw = myUserInfo?.local_user_view.local_user.show_nsfw ?? false;
  return !nsfw || (nsfw && myShowNsfw);
}
