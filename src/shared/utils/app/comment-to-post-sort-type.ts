import { CommentSortType, PostSortType } from "lemmy-js-client";

function assertType<T>(_: T) {}

export default function commentToPostSortType(
  sort: CommentSortType,
): PostSortType {
  switch (sort) {
    case "Hot":
    case "New":
    case "Old":
    case "Controversial":
    case "Top":
      return sort;
    default: {
      assertType<never>(sort);
      return "Hot";
    }
  }
}
