import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

export type RegistrationState = "unread" | "all" | "denied";

const allOptions: FilterOption<RegistrationState>[] = [
  { value: "unread", i18n: "unread" },
  { value: "all", i18n: "all" },
  { value: "denied", i18n: "denied" },
];

type RegistrationStateDropdownProps = {
  currentOption: RegistrationState;
  onSelect(val: RegistrationState): void;
  className?: string;
};

export function RegistrationStateDropdown({
  currentOption,
  onSelect,
  className,
}: RegistrationStateDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={allOptions}
      currentOption={allOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
