import { CommentSortType, SortType } from "lemmy-js-client";

export default function convertCommentSortType(
  sort: SortType
): CommentSortType {
  switch (sort) {
    case "TopAll":
    case "TopDay":
    case "TopWeek":
    case "TopMonth":
    case "TopYear": {
      return "Top";
    }
    case "New": {
      return "New";
    }
    case "Hot":
    case "Active": {
      return "Hot";
    }
    default: {
      return "Hot";
    }
  }
}
