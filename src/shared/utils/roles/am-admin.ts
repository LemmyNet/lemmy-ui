import { UserService } from "../../services";

export function amAdmin(myUserInfo = UserService.Instance.myUserInfo): boolean {
  return myUserInfo?.local_user_view.person.admin ?? false;
}
