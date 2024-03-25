import { getQueryString } from "@utils/helpers";

export default function communityRSSUrl(actorId: string, sort: string): string {
  const url = new URL(actorId);
  return `${url.origin}/feeds${url.pathname}.xml${getQueryString({ sort })}`;
}
