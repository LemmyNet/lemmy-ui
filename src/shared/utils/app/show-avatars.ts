import { UserService } from "../../services";

export default function showAvatars(
  myUserInfo = UserService.Instance.myUserInfo,
): boolean {
  return myUserInfo?.local_user_view.local_user.show_avatars ?? true;
}
