import { MyUserInfo, PostView } from "lemmy-js-client";

export default function isPostBlocked(
  pv: PostView,
  myUserInfo?: MyUserInfo,
): boolean {
  return (
    (myUserInfo?.community_blocks
      .map(c => c.community.id)
      .includes(pv.community.id) ||
      myUserInfo?.person_blocks
        .map(p => p.target.id)
        .includes(pv.creator.id)) ??
    false
  );
}
