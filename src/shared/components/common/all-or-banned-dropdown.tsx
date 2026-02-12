import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

export type AllOrBanned = "all" | "banned";

const options: FilterOption<AllOrBanned>[] = [
  { value: "all", i18n: "all" },
  { value: "banned", i18n: "banned" },
];

type AllOrBannedDropdownProps = {
  currentOption: AllOrBanned;
  onSelect: (val: AllOrBanned) => void;
  className?: string;
};
export function AllOrBannedDropdown({
  currentOption,
  onSelect,
  className,
}: AllOrBannedDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
