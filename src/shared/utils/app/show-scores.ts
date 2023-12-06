import { MyUserInfo } from "lemmy-js-client";

export default function showScores(myUserInfo?: MyUserInfo): boolean {
  return myUserInfo?.local_user_view.local_user.show_scores ?? true;
}
