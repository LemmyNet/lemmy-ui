import { CommentSortType, PostSortType } from "lemmy-js-client";

function assertType<T>(_: T) {}

export default function commentToPostSortType(
  sort: PostSortType | CommentSortType,
): PostSortType {
  switch (sort) {
    case "Active":
    case "Hot":
    case "New":
    case "Old":
    case "TopDay":
    case "TopWeek":
    case "TopMonth":
    case "TopYear":
    case "TopAll":
    case "MostComments":
    case "NewComments":
    case "TopHour":
    case "TopSixHour":
    case "TopTwelveHour":
    case "TopThreeMonths":
    case "TopSixMonths":
    case "TopNineMonths":
    case "Controversial":
    case "Scaled": {
      assertType<PostSortType>(sort);
      return sort;
    }
  }

  assertType<CommentSortType>(sort);
  switch (sort) {
    case "Top":
      return "TopAll";
    default: {
      assertType<never>(sort);
      return "Hot";
    }
  }
}
