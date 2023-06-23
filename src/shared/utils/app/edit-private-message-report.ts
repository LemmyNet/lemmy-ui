import { editListImmutable } from "@utils/helpers";
import { PrivateMessageReportView } from "lemmy-js-client";

export default function editPrivateMessageReport(
  data: PrivateMessageReportView,
  reports: PrivateMessageReportView[]
): PrivateMessageReportView[] {
  return editListImmutable("private_message_report", data, reports);
}
