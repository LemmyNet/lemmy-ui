import { editListImmutable } from "@utils/helpers";
import { PostReportView } from "lemmy-js-client";

export default function editPostReport(
  data: PostReportView,
  reports: PostReportView[]
) {
  return editListImmutable("post_report", data, reports);
}
