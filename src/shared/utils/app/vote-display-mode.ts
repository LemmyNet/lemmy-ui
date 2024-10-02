import { GetSiteResponse, LocalUserVoteDisplayMode } from "lemmy-js-client";

export default function voteDisplayMode(
  siteRes: GetSiteResponse,
): LocalUserVoteDisplayMode {
  return (
    siteRes?.my_user?.local_user_view.local_user_vote_display_mode ?? {
      upvotes: true,
      downvotes: true,
      score: false,
      upvote_percentage: false,
    }
  );
}
