import { relTags, sortingHelpUrl } from "@utils/config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import {
  CommentSortType,
  CommunitySortType,
  MultiCommunitySortType,
  PostSortType,
  SearchSortType,
} from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

type SortDropdownProps<T extends string> = {
  currentOption: T;
  onSelect(val: T): void;
  className?: string;
};

const postSortOptions: FilterOption<PostSortType>[] = [
  { i18n: "active", value: "active" },
  { i18n: "hot", value: "hot" },
  { i18n: "scaled", value: "scaled" },
  { i18n: "new", value: "new" },
  { i18n: "old", value: "old" },
  { i18n: "top", value: "top" },
  { i18n: "most_comments", value: "most_comments" },
  { i18n: "new_comments", value: "new_comments" },
  { i18n: "controversial", value: "controversial" },
];

export function PostSortDropdown({
  currentOption,
  onSelect,
  className,
}: SortDropdownProps<PostSortType>) {
  return (
    <div className="d-flex align-items-center">
      <FilterChipDropdown
        allOptions={postSortOptions}
        currentOption={postSortOptions.find(t => t.value === currentOption)}
        onSelect={onSelect}
        className={className}
      />
      <SortingHelp />
    </div>
  );
}

const commentSortOptions: FilterOption<CommentSortType>[] = [
  { i18n: "hot", value: "hot" },
  { i18n: "new", value: "new" },
  { i18n: "old", value: "old" },
  { i18n: "controversial", value: "controversial" },
  { i18n: "top", value: "top" },
];
export function CommentSortDropdown({
  currentOption,
  onSelect,
  className,
}: SortDropdownProps<CommentSortType>) {
  return (
    <div className="d-flex align-items-center">
      <FilterChipDropdown
        allOptions={commentSortOptions}
        currentOption={commentSortOptions.find(t => t.value === currentOption)}
        onSelect={onSelect}
        className={className}
      />
      <SortingHelp />
    </div>
  );
}

const communitiesSortOptions: FilterOption<CommunitySortType>[] = [
  { i18n: "hot", value: "hot" },
  { i18n: "new", value: "new" },
  { i18n: "old", value: "old" },
  { i18n: "comments", value: "comments" },
  { i18n: "posts", value: "posts" },
  { i18n: "subscribers", value: "subscribers" },
  { i18n: "subscribers_local", value: "subscribers_local" },
  { i18n: "active_daily", value: "active_daily" },
  { i18n: "active_weekly", value: "active_weekly" },
  { i18n: "active_monthly", value: "active_monthly" },
  { i18n: "active_six_months", value: "active_six_months" },
  { i18n: "name_asc", value: "name_asc" },
  { i18n: "name_desc", value: "name_desc" },
];
export function CommunitiesSortDropdown({
  currentOption,
  onSelect,
  className,
}: SortDropdownProps<CommunitySortType>) {
  return (
    <div className="d-flex align-items-center">
      <FilterChipDropdown
        allOptions={communitiesSortOptions}
        currentOption={communitiesSortOptions.find(
          t => t.value === currentOption,
        )}
        onSelect={onSelect}
        className={className}
      />
      <SortingHelp />
    </div>
  );
}

const multiCommunitiesSortOptions: FilterOption<MultiCommunitySortType>[] = [
  { i18n: "new", value: "new" },
  { i18n: "old", value: "old" },
  { i18n: "communities", value: "communities" },
  { i18n: "subscribers", value: "subscribers" },
  { i18n: "subscribers_local", value: "subscribers_local" },
  { i18n: "name_asc", value: "name_asc" },
  { i18n: "name_desc", value: "name_desc" },
];
export function MultiCommunitiesSortDropdown({
  currentOption,
  onSelect,
  className,
}: SortDropdownProps<MultiCommunitySortType>) {
  return (
    <div className="d-flex align-items-center">
      <FilterChipDropdown
        allOptions={multiCommunitiesSortOptions}
        currentOption={multiCommunitiesSortOptions.find(
          t => t.value === currentOption,
        )}
        onSelect={onSelect}
        className={className}
      />
      <SortingHelp />
    </div>
  );
}

const searchSortOptions: FilterOption<SearchSortType>[] = [
  { i18n: "top", value: "top" },
  { i18n: "new", value: "new" },
  { i18n: "old", value: "old" },
];
export function SearchSortDropdown({
  currentOption,
  onSelect,
  className,
}: SortDropdownProps<SearchSortType>) {
  return (
    <div className="d-flex align-items-center">
      <FilterChipDropdown
        allOptions={searchSortOptions}
        currentOption={searchSortOptions.find(t => t.value === currentOption)}
        onSelect={onSelect}
        className={className}
      />
      <SortingHelp />
    </div>
  );
}

function SortingHelp() {
  return (
    <a
      className="sort-select-icon text-muted ms-2"
      href={sortingHelpUrl}
      rel={relTags}
      title={I18NextService.i18n.t("sorting_help")}
    >
      <Icon icon="help-circle" classes="icon-inline" />
    </a>
  );
}
