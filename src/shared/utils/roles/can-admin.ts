import { canMod } from "@utils/roles";
import { PersonView } from "lemmy-js-client";
import { UserService } from "../../services";

export default function canAdmin(
  creatorId: number,
  admins?: PersonView[],
  myUserInfo = UserService.Instance.myUserInfo,
  onSelf = false
): boolean {
  return canMod(creatorId, undefined, admins, myUserInfo, onSelf);
}
