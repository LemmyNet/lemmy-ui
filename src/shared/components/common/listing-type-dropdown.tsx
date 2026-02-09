import { ListingType, MyUserInfo } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<ListingType>[] = [
  { value: "all", i18n: "all" },
  { value: "local", i18n: "local" },
  { value: "subscribed", i18n: "subscribed" },
  { value: "suggested", i18n: "suggested" },
  { value: "moderator_view", i18n: "moderator_view" },
];

type ListingTypeDropdownProps = {
  currentOption: ListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  showSuggested: boolean;
  myUserInfo: MyUserInfo | undefined;
  onSelect(val: ListingType): void;
  showLabel: boolean;
  className?: string;
};

export function ListingTypeDropdown({
  currentOption,
  showLocal,
  showSubscribed,
  showSuggested,
  myUserInfo,
  onSelect,
  showLabel,
  className,
}: ListingTypeDropdownProps) {
  let filteredOptions = options;

  // Hide moderator view for those who don't mod anything
  const amModOfSomething = (myUserInfo?.moderates.length ?? 0) > 0;
  if (!amModOfSomething) {
    filteredOptions = filteredOptions.filter(o => "moderator_view" !== o.value);
  }

  if (!showLocal) {
    filteredOptions = filteredOptions.filter(o => "local" !== o.value);
  }

  if (!showSubscribed) {
    filteredOptions = filteredOptions.filter(o => "subscribed" !== o.value);
  }

  if (!showSuggested) {
    filteredOptions = filteredOptions.filter(o => "suggested" !== o.value);
  }

  return (
    <FilterChipDropdown
      label={showLabel ? "type" : undefined}
      allOptions={filteredOptions}
      currentOption={filteredOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
