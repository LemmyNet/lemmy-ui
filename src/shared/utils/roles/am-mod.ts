import { isMod } from "@utils/roles";
import { CommunityModeratorView } from "lemmy-js-client";
import { UserService } from "../../services";

export default function amMod(
  mods?: CommunityModeratorView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return myUserInfo ? isMod(myUserInfo.local_user_view.person.id, mods) : false;
}
