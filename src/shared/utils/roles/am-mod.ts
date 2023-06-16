import { CommunityModeratorView } from "lemmy-js-client";
import { UserService } from "../../services";
import { isMod } from "./is-mod";

export function amMod(
  mods?: CommunityModeratorView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return myUserInfo ? isMod(myUserInfo.local_user_view.person.id, mods) : false;
}
