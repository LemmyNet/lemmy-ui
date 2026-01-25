import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

export type RegistrationState = "unread" | "all" | "denied";

const allOptions: FilterOption<RegistrationState>[] = [
  { value: "unread", i18n: "unread" },
  { value: "all", i18n: "all" },
  { value: "denied", i18n: "denied" },
];

interface RegistrationStateDropdownProps {
  state: RegistrationState;
  onClick(val: RegistrationState): void;
}

export function RegistrationStateDropdown(
  props: RegistrationStateDropdownProps,
) {
  return (
    <FilterChipDropdown
      allOptions={allOptions}
      currentOption={allOptions.find(t => t.value === this.props.state)}
      onSelect={props.onClick}
    />
  );
}
