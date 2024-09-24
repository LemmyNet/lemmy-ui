import { CommentSortType, PostSortType } from "lemmy-js-client";

export default function convertCommentSortType(
  sort: PostSortType,
): CommentSortType {
  switch (sort) {
    case "TopAll":
    case "TopHour":
    case "TopSixHour":
    case "TopTwelveHour":
    case "TopDay":
    case "TopWeek":
    case "TopMonth":
    case "TopThreeMonths":
    case "TopSixMonths":
    case "TopNineMonths":
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
