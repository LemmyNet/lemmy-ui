import { editListImmutable } from "@utils/helpers";
import { PrivateMessageView } from "lemmy-js-client";

export default function editPrivateMessage(
  data: PrivateMessageView,
  messages: PrivateMessageView[]
): PrivateMessageView[] {
  return editListImmutable("private_message", data, messages);
}
