import {
  GetSiteResponse,
  ListingType,
  MyUserInfo,
  PostListingMode,
  PostSortType,
} from "lemmy-js-client";
import { Interval, TimeIntervalFilter } from "./time-interval-filter";
import { ExpandChipCheckbox, FilterChipCheckbox } from "./filter-chip-checkbox";
import { PostListingModeDropdown } from "./post-listing-mode-dropdown";
import { ListingTypeDropdown } from "./listing-type-dropdown";
import { PostSortDropdown } from "./sort-dropdown";
import {
  allRSSUrl,
  hasFollows,
  localRSSUrl,
  showLocal,
  subscribedRSSUrl,
} from "@utils/app";
import { getQueryString } from "@utils/helpers";
import { relTags } from "@utils/config";
import { Icon } from "./icon";
import { I18NextService } from "@services/I18NextService";

type GetPostsFilterBarProps = {
  listingType: ListingType;
  listingMode: PostListingMode;
  sort: PostSortType;
  time: Interval;
  siteRes: GetSiteResponse;
  myUserInfo?: MyUserInfo;
  showHidden?: boolean;
  showRead?: boolean;
  hidePostsWithMedia?: boolean;
  showSubscribedMobile: boolean;
  showSidebarMobile: boolean;
  selectButtonsHidden: boolean;
  onShowSubscribedMobile: (show: boolean) => void;
  onShowSidebarMobile: (show: boolean) => void;
  onSortChange: (sort: PostSortType) => void;
  onListingTypeChange: (listingType: ListingType) => void;
  onListingModeChange: (listingMode: PostListingMode) => void;
  onTimeIntervalChange: (interval: Interval) => void;
  onHideSelectButtons: () => void;
  onShowHiddenChange: (hidden: boolean) => void;
  onHideReadChange: (hideRead: boolean) => void;
  onHidePostsWithMediaChange: (hidePostsWithMedia: boolean) => void;
};
export function GetPostsFilterBar({
  siteRes,
  myUserInfo,
  listingType,
  listingMode,
  sort,
  time,
  showHidden,
  showRead,
  hidePostsWithMedia,
  showSubscribedMobile,
  showSidebarMobile,
  selectButtonsHidden,
  onShowSubscribedMobile,
  onShowSidebarMobile,
  onSortChange,
  onListingTypeChange,
  onListingModeChange,
  onTimeIntervalChange,
  onHideSelectButtons,
  onShowHiddenChange,
  onHideReadChange,
  onHidePostsWithMediaChange,
}: GetPostsFilterBarProps) {
  const hideTimeSelect = sort === "new" || sort === "old";

  return (
    <>
      {/* Only show these two selects on mobile */}
      {hasFollows(myUserInfo) && (
        <div className="d-block d-md-none col">
          <ExpandChipCheckbox
            option="subscribed"
            isChecked={showSubscribedMobile}
            onCheck={onShowSubscribedMobile}
          />
        </div>
      )}
      <div className="d-block d-md-none col">
        <ExpandChipCheckbox
          option="sidebar"
          isChecked={showSidebarMobile}
          onCheck={onShowSidebarMobile}
        />
      </div>
      {/* The non-mobile selects */}
      <div className="col">
        <PostSortDropdown
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
      <div className="col">
        <PostListingModeDropdown
          currentOption={listingMode}
          onSelect={onListingModeChange}
          showLabel
        />
      </div>
      {!hideTimeSelect && (
        <div className="col">
          <TimeIntervalFilter interval={time} onChange={onTimeIntervalChange} />
        </div>
      )}
      <div className="col">
        {getRss(listingType, sort, siteRes.my_feed_token)}
      </div>
      {myUserInfo && (
        <button
          className="col btn btn-ghost"
          aria-label={I18NextService.i18n.t(
            selectButtonsHidden ? "expand" : "collapse",
          )}
          onClick={onHideSelectButtons}
        >
          <Icon icon={`chevrons-${selectButtonsHidden ? "down" : "up"}`} />
        </button>
      )}
      {myUserInfo && !selectButtonsHidden && (
        <div className="row row-cols-auto align-items-center g-1">
          <div className="col">
            <FilterChipCheckbox
              option={"show_hidden_posts"}
              isChecked={showHidden ?? false}
              onCheck={onShowHiddenChange}
            />
          </div>
          <div className="col">
            <FilterChipCheckbox
              option={"hide_read_posts"}
              isChecked={!(showRead ?? false)}
              onCheck={onHideReadChange}
            />
          </div>
          <div
            className="col"
            data-tippy-content={I18NextService.i18n.t("hide_memes_description")}
          >
            <FilterChipCheckbox
              option={"hide_memes"}
              isChecked={hidePostsWithMedia ?? false}
              onCheck={onHidePostsWithMediaChange}
            />
          </div>
        </div>
      )}
    </>
  );
}

function getRss(
  listingType: ListingType,
  sort: PostSortType,
  feedToken?: string,
) {
  let rss: string | undefined = undefined;

  const queryString = getQueryString({ sort });
  switch (listingType) {
    case "all": {
      rss = allRSSUrl(queryString);
      break;
    }
    case "local": {
      rss = localRSSUrl(queryString);
      break;
    }
    case "subscribed": {
      rss = feedToken ? subscribedRSSUrl(feedToken, queryString) : undefined;
      break;
    }
  }

  return (
    rss && (
      <>
        <a href={rss} rel={relTags} title="RSS">
          <Icon icon="rss" classes="text-muted small" />
        </a>
        <link rel="alternate" type="application/atom+xml" href={rss} />
      </>
    )
  );
}
