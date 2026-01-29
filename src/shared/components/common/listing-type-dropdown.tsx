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
  myUserInfo: MyUserInfo | undefined;
  onSelect(val: ListingType): void;
  className?: string;
};

export function ListingTypeDropdown({
  currentOption,
  showLocal,
  showSubscribed,
  myUserInfo,
  onSelect,
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

  return (
    <FilterChipDropdown
      allOptions={filteredOptions}
      currentOption={filteredOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
