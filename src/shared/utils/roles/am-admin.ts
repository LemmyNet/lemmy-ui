import { MyUserInfo } from "lemmy-js-client";

export default function amAdmin(myUserInfo?: MyUserInfo): boolean {
  return myUserInfo?.local_user_view.local_user.admin ?? false;
}
