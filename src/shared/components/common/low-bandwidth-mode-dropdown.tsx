import { LowBandwidthMode } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<LowBandwidthMode>[] = [
  { value: "auto", i18n: "auto" },
  { value: "always", i18n: "always_on" },
  { value: "never", i18n: "off" },
];

type LowBandwidthModeDropdownProps = {
  currentOption: LowBandwidthMode;
  onSelect: (val: LowBandwidthMode) => void;
  showLabel: boolean;
  className?: string;
};
export function LowBandwidthModeDropdown({
  currentOption,
  onSelect,
  showLabel,
  className,
}: LowBandwidthModeDropdownProps) {
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
