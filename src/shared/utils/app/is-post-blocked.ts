import { MyUserInfo, PostView } from "lemmy-js-client";
import { UserService } from "../../services";

export default function isPostBlocked(
  pv: PostView,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo,
): boolean {
  return (
    (myUserInfo?.community_blocks.some(c => c.id === pv.community.id) ||
      myUserInfo?.person_blocks.some(p => p.id === pv.creator.id)) ??
    false
  );
}
