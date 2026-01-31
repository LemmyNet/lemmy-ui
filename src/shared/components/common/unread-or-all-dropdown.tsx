import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

export type UnreadOrAll = "unread" | "all";

const options: FilterOption<UnreadOrAll>[] = [
  { value: "unread", i18n: "unread" },
  { value: "all", i18n: "all" },
];

type UnreadOrAllDropdownProps = {
  currentOption: UnreadOrAll;
  onSelect(val: UnreadOrAll): void;
  className?: string;
};
export function UnreadOrAllDropdown({
  currentOption,
  onSelect,
  className,
}: UnreadOrAllDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
