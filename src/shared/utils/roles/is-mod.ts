import { CommunityModeratorView } from "lemmy-js-client";

export default function isMod(
  creatorId: number,
  mods?: CommunityModeratorView[],
): boolean {
  return mods?.some(m => m.moderator.id === creatorId) ?? false;
}
