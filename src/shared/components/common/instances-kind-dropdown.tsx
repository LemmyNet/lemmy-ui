import { GetFederatedInstancesKind } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<GetFederatedInstancesKind>[] = [
  { value: "all", i18n: "all" },
  { value: "linked", i18n: "linked_instances" },
  { value: "allowed", i18n: "allowed_instances" },
  { value: "blocked", i18n: "blocked_instances" },
];

type InstancesKindDropdownProps = {
  currentOption: GetFederatedInstancesKind;
  onSelect: (val: GetFederatedInstancesKind) => void;
  className?: string;
};
export function InstancesKindDropdown({
  currentOption,
  onSelect,
  className,
}: InstancesKindDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
