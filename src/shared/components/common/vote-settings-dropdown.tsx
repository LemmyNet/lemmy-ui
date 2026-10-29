import { VoteSettings } from "lemmy-js-client";
import {
  FilterChipDropdown,
  FilterOption,
} from "@components/common/filter-chip-dropdown";

const options: FilterOption<VoteSettings>[] = [
  { value: "all", i18n: "all" },
  { value: "local", i18n: "local" },
  { value: "subscribed", i18n: "subscribed" },
  { value: "disable", i18n: "disable" },
];

type VoteSettingsDropdownProps = {
  currentOption: VoteSettings;
  onSelect: (val: VoteSettings) => void;
  className?: string;
};
export function VoteSettingsDropdown({
  currentOption,
  onSelect,
  className,
}: VoteSettingsDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
