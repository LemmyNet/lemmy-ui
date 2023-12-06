import { MyUserInfo, PersonView } from "lemmy-js-client";

export default function amSiteCreator(
  creator_id: number,
  admins?: PersonView[],
  myUserInfo?: MyUserInfo,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  return myId === admins?.at(0)?.person.id && myId !== creator_id;
}
