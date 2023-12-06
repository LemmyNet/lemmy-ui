import { CommunityModeratorView, MyUserInfo } from "lemmy-js-client";

export default function amCommunityCreator(
  creator_id: number,
  mods?: CommunityModeratorView[],
  myUserInfo?: MyUserInfo,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  // Don't allow mod actions on yourself
  return myId === mods?.at(0)?.moderator.id && myId !== creator_id;
}
