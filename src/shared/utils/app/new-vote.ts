import { VoteType } from "@utils/types";

export default function newVote(voteType: VoteType, myVote?: number): number {
  if (voteType == VoteType.Upvote) {
    return myVote == 1 ? 0 : 1;
  } else {
    return myVote == -1 ? 0 : -1;
  }
}
