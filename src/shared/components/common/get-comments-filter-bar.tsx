import {
  CommentSortType,
  GetSiteResponse,
  ListingType,
  MyUserInfo,
} from "lemmy-js-client";
import { Interval, TimeIntervalFilter } from "./time-interval-filter";
import { ListingTypeDropdown } from "./listing-type-dropdown";
import { showLocal } from "@utils/app";
import { CommentSortDropdown } from "./sort-dropdown";

type GetCommentsFilterBarProps = {
  listingType: ListingType;
  sort: CommentSortType;
  time: Interval;
  siteRes: GetSiteResponse;
  myUserInfo?: MyUserInfo;
  onListingTypeChange: (listingType: ListingType) => void;
  onSortChange: (sort: CommentSortType) => void;
  onTimeIntervalChange: (interval: Interval) => void;
};
export function GetCommentsFilterBar({
  listingType,
  sort,
  time,
  siteRes,
  myUserInfo,
  onListingTypeChange,
  onSortChange,
  onTimeIntervalChange,
}: GetCommentsFilterBarProps) {
  const hideTimeSelect = sort === "new" || sort === "old";

  return (
    <>
      <div className="col">
        <CommentSortDropdown
          currentOption={sort}
          onSelect={onSortChange}
          showLabel
        />
      </div>
      <div className="col">
        <ListingTypeDropdown
          currentOption={listingType}
          showLocal={showLocal(siteRes)}
          showSubscribed
          showSuggested={
            !!siteRes.site_view.local_site.suggested_multi_community_id
          }
          showLabel
          myUserInfo={myUserInfo}
          onSelect={onListingTypeChange}
        />
      </div>
      {!hideTimeSelect && (
        <div className="col">
          <TimeIntervalFilter interval={time} onChange={onTimeIntervalChange} />
        </div>
      )}
    </>
  );
}

