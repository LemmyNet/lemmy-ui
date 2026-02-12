import { FederationMode } from "lemmy-js-client";
import {
  FilterChipDropdown,
  FilterOption,
} from "@components/common/filter-chip-dropdown";

const options: FilterOption<FederationMode>[] = [
  { value: "all", i18n: "all" },
  { value: "local", i18n: "local" },
  { value: "disable", i18n: "disable" },
];

type FederationModeDropdownProps = {
  currentOption: FederationMode;
  onSelect: (val: FederationMode) => void;
  className?: string;
};
export function FederationModeDropdown({
  currentOption,
  onSelect,
  className,
}: FederationModeDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
