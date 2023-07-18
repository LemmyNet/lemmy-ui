import { UserService } from "../../services";

export default function isKeyboardNavigationEnabled(
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return (
    myUserInfo?.local_user_view.local_user.enable_keyboard_navigation ?? true
  );
}
