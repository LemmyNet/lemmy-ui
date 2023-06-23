import { hostname } from "@utils/helpers";
import { PersonView } from "lemmy-js-client";

export default function personSelectName({
  person: { display_name, name, local, actor_id },
}: PersonView): string {
  const pName = display_name ?? name;
  return local ? pName : `${hostname(actor_id)}/${pName}`;
}
