import { PersonView } from "lemmy-js-client";
import { UserService } from "../../services";
import { canMod } from "./can-mod";

export function canAdmin(
  creatorId: number,
  admins?: PersonView[],
  myUserInfo = UserService.Instance.myUserInfo,
  onSelf = false
): boolean {
  return canMod(creatorId, undefined, admins, myUserInfo, onSelf);
}
