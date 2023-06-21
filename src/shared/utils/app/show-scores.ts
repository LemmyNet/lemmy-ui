import { UserService } from "../../services";

export default function showScores(
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return myUserInfo?.local_user_view.local_user.show_scores ?? true;
}
