import { fetchUsers } from "@utils/app";
import { hostname } from "@utils/helpers";
import { PersonTribute } from "@utils/types";

export default async function personSearch(
  text: string,
): Promise<PersonTribute[]> {
  const usersResponse = await fetchUsers(text);

  return usersResponse.map(pv => ({
    key: `@${pv.person.name}@${hostname(pv.person.actor_id)}`,
    view: pv,
  }));
}
