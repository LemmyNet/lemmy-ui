/**
 * i moved these functions to a separate file so they can be used both from the server component /app/page.tsx and from the SSR component /src/components/home/home.tsx
 */
import { UserService } from "@/shared/services";
import { ListingType, SortType } from "lemmy-js-client";
import { DataType } from "../../interfaces";

export function getDataTypeFromQuery(type?: string): DataType {
  return type ? DataType[type] : DataType.Post;
}
export function getListingTypeFromQuery(
  type?: string,
  myUserInfo = UserService.Instance.myUserInfo,
): ListingType | undefined {
  const myListingType =
    myUserInfo?.local_user_view?.local_user?.default_listing_type;

  return type ? (type as ListingType) : myListingType;
}
export function getSortTypeFromQuery(
  type?: string,
  myUserInfo = UserService.Instance.myUserInfo,
): SortType {
  const mySortType = myUserInfo?.local_user_view?.local_user?.default_sort_type;

  return (type ? (type as SortType) : mySortType) ?? "Active";
}
