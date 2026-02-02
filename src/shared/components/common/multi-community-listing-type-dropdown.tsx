import { MultiCommunityListingType } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<MultiCommunityListingType>[] = [
  { value: "all", i18n: "all" },
  { value: "local", i18n: "local" },
  { value: "subscribed", i18n: "subscribed" },
];

type MultiCommunityListingTypeDropdownProps = {
  currentOption: MultiCommunityListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  onSelect(val: MultiCommunityListingType): void;
  className?: string;
};

export function MultiCommunityListingTypeDropdown({
  currentOption,
  showLocal,
  showSubscribed,
  onSelect,
  className,
}: MultiCommunityListingTypeDropdownProps) {
  let filteredOptions = options;

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
