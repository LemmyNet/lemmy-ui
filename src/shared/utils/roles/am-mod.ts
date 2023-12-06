import { CommunityId, MyUserInfo } from "lemmy-js-client";

export default function amMod(
  communityId: CommunityId,
  myUserInfo?: MyUserInfo,
): boolean {
  return myUserInfo
    ? myUserInfo.moderates.map(cmv => cmv.community.id).includes(communityId)
    : false;
}
