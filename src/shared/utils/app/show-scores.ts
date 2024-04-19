import { UserService } from "../../services";

export default function showScores(
  myUserInfo = UserService.Instance.myUserInfo,
): boolean {
  const voteDisplayMode =
    myUserInfo?.local_user_view.local_user_vote_display_mode;
  return (voteDisplayMode?.score || voteDisplayMode?.upvotes) ?? true;
}
