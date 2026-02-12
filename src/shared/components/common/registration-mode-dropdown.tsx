import { RegistrationMode } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<RegistrationMode>[] = [
  { value: "require_application", i18n: "require_registration_application" },
  { value: "open", i18n: "open_registration" },
  { value: "closed", i18n: "close_registration" },
];

type RegistrationModeDropdownProps = {
  currentOption: RegistrationMode;
  onSelect: (val: RegistrationMode) => void;
  className?: string;
};
export function RegistrationModeDropdown({
  currentOption,
  onSelect,
  className,
}: RegistrationModeDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
