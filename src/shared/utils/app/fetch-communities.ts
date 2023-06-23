import { fetchSearchResults } from "@utils/app";

export default async function fetchCommunities(q: string) {
  const res = await fetchSearchResults(q, "Communities");

  return res.state === "success" ? res.data.communities : [];
}
