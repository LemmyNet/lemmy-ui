export default function calculateUpvotePct(
  upvotes: number,
  downvotes: number,
): number {
  return (upvotes / (upvotes + downvotes)) * 100;
}
