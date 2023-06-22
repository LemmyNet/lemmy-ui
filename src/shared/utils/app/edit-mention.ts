import { editListImmutable } from "@utils/helpers";
import { PersonMentionView } from "lemmy-js-client";

export default function editMention(
  data: PersonMentionView,
  comments: PersonMentionView[]
): PersonMentionView[] {
  return editListImmutable("person_mention", data, comments);
}
