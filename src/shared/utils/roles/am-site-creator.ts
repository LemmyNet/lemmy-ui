import { PersonView } from "lemmy-js-client";
import { UserService } from "../../services";

export default function amSiteCreator(
  creator_id: number,
  admins?: PersonView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  return myId === admins?.at(0)?.person.id && myId !== creator_id;
}
