import { Person } from "lemmy-js-client";
import hostname from "./hostname";

export default function getPersonDetails(person: Person): [string, string] {
  const local = person.local;
  let apubName: string, link: string;

  if (local) {
    apubName = `@${person.name}`;
    link = `/u/${person.name}`;
  } else {
    const domain = hostname(person.actor_id);
    apubName = `@${person.name}@${domain}`;
    link = !this.props.realLink
      ? `/u/${person.name}@${domain}`
      : person.actor_id;
  }

  return [apubName, link];
}
