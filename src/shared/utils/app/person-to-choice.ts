import { personSelectName } from "@utils/app";
import { Choice } from "@utils/types";
import { PersonView } from "lemmy-js-client";

export default function personToChoice(pvs: PersonView): Choice {
  return {
    value: pvs.person.id.toString(),
    label: personSelectName(pvs),
  };
}
