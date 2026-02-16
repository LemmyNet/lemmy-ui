import { CommunityVisibility } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<CommunityVisibility>[] = [
  { value: "public", i18n: "community_visibility_public" },
  { value: "unlisted", i18n: "community_visibility_unlisted" },
  {
    value: "local_only_public",
    i18n: "community_visibility_local_only_public",
  },
  {
    value: "local_only_private",
    i18n: "community_visibility_local_only_private",
  },
  { value: "private", i18n: "community_visibility_private" },
];

type CommunityVisibilityDropdownProps = {
  currentOption: CommunityVisibility;
  onSelect: (val: CommunityVisibility) => void;
  className?: string;
};
export function CommunityVisibilityDropdown({
  currentOption,
  onSelect,
  className,
}: CommunityVisibilityDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
