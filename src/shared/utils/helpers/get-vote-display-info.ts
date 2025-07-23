import { UserService } from "../../services";

export default function getVoteDisplayInfo() {
  const { show_downvotes, show_score, show_upvotes, show_upvote_percentage } =
    UserService.Instance.myUserInfo?.local_user_view.local_user ?? {};

  return { show_downvotes, show_score, show_upvotes, show_upvote_percentage };
}
