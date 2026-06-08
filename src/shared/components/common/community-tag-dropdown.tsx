import { CommunityTag } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";
import { communityTagName } from "@components/community/community-tag";

type CommunityTagDropdownProps = {
  tags: CommunityTag[];
  currentOption: string;
  onSelect: (id: string) => void;
  className?: string;
};
/**
 * Since the FilterChipDropdown must use strings, this means that the currentOption is the communityId as a string, and a "0" represents an "all" or clearing the filter.
 **/
export function CommunityTagDropdown({
  tags,
  currentOption,
  onSelect,
  className,
}: CommunityTagDropdownProps) {
  const options: FilterOption<string>[] = [{ value: "0", i18n: "all" }];
  options.push(
    ...tags.map(t => {
      return { value: t.id.toString(), noI18n: communityTagName(t) };
    }),
  );

  return (
    <FilterChipDropdown
      label={"tags"}
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
