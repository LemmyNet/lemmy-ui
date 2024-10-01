import { CommentSortType, PostSortType } from "lemmy-js-client";

function assertType<T>(_: T) {}

export default function postToCommentSortType(
  sort: PostSortType,
): CommentSortType {
  switch (sort) {
    case "Hot":
    case "New":
    case "Old":
    case "Controversial": {
      return sort;
    }
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
    case "NewComments":
    case "MostComments":
    case "Scaled":
    case "Active": {
      return "Hot";
    }
    default: {
      assertType<never>(sort);
      return "Hot";
    }
  }
}
