import { CommentSortType, SortType } from "lemmy-js-client";

export default function convertCommentSortType(
  sort: SortType
): CommentSortType {
  if (
    sort == "TopAll" ||
    sort == "TopDay" ||
    sort == "TopWeek" ||
    sort == "TopMonth" ||
    sort == "TopYear"
  ) {
    return "Top";
  } else if (sort == "New") {
    return "New";
  } else if (sort == "Hot" || sort == "Active") {
    return "Hot";
  } else {
    return "Hot";
  }
}
