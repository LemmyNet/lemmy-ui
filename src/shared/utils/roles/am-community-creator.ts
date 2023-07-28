import { CommunityModeratorView } from "lemmy-js-client";
import { UserService } from "../../services";

export default function amCommunityCreator(
  creator_id: number,
  mods?: CommunityModeratorView[],
  myUserInfo = UserService.Instance.myUserInfo,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  // Don't allow mod actions on yourself
  return myId === mods?.at(0)?.moderator.id && myId !== creator_id;
}
