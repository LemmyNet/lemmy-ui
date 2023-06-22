import { fetchSearchResults } from "@utils/app";

export default async function fetchUsers(q: string) {
  const res = await fetchSearchResults(q, "Users");

  return res.state === "success" ? res.data.users : [];
}
