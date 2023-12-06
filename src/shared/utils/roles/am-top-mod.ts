import { CommunityModeratorView, MyUserInfo } from "lemmy-js-client";

export default function amTopMod(
  mods: CommunityModeratorView[],
  myUserInfo?: MyUserInfo,
): boolean {
  return mods.at(0)?.moderator.id === myUserInfo?.local_user_view.person.id;
}
