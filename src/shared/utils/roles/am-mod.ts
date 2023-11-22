import { CommunityId } from "lemmy-js-client";
import { UserService } from "../../services";

export default function amMod(
  communityId: CommunityId,
  myUserInfo = UserService.Instance.myUserInfo,
): boolean {
  return myUserInfo
    ? myUserInfo.moderates.map(cmv => cmv.community.id).includes(communityId)
    : false;
}
