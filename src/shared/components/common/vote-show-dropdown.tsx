import { VoteShow } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const voteShowOptions: FilterOption<VoteShow>[] = [
  { i18n: "vote_show", value: "show" },
  { i18n: "vote_show_for_others", value: "show_for_others" },
  { i18n: "vote_hide", value: "hide" },
];

type VoteShowDropdownProps = {
  currentOption: VoteShow;
  onSelect: (val: VoteShow) => void;
  className?: string;
};

export function VoteShowDropdown({
  currentOption,
  onSelect,
  className,
}: VoteShowDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={voteShowOptions}
      currentOption={voteShowOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
