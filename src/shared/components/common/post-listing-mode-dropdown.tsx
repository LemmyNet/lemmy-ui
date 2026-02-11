import { PostListingMode } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<PostListingMode>[] = [
  { value: "list", i18n: "list" },
  { value: "card", i18n: "card" },
  { value: "small_card", i18n: "small_card" },
];

type PostListingModeDropdownProps = {
  currentOption: PostListingMode;
  onSelect(val: PostListingMode): void;
  showLabel: boolean;
  className?: string;
};
export function PostListingModeDropdown({
  currentOption,
  onSelect,
  showLabel,
  className,
}: PostListingModeDropdownProps) {
  return (
    <FilterChipDropdown
      label={showLabel ? "view" : undefined}
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
