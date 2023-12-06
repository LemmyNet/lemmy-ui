import { canMod } from "@utils/roles";
import { MyUserInfo, PersonView } from "lemmy-js-client";

export default function canAdmin(
  creatorId: number,
  admins?: PersonView[],
  myUserInfo?: MyUserInfo,
  onSelf = false,
): boolean {
  return canMod(creatorId, undefined, admins, myUserInfo, onSelf);
}
