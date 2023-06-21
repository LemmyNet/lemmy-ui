import { fetchCommunities } from "@utils/app";
import { hostname } from "@utils/helpers";
import { CommunityTribute } from "@utils/types";

export default async function communitySearch(
  text: string
): Promise<CommunityTribute[]> {
  const communitiesResponse = await fetchCommunities(text);

  return communitiesResponse.map(cv => ({
    key: `!${cv.community.name}@${hostname(cv.community.actor_id)}`,
    view: cv,
  }));
}
