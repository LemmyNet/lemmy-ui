import { CommentViewType } from "@utils/types";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<CommentViewType>[] = [
  { value: "tree", i18n: "tree" },
  { value: "flat", i18n: "chat" },
];

type CommentViewTypeDropdownProps = {
  currentOption: CommentViewType;
  onSelect(val: CommentViewType): void;
  className?: string;
};
export function CommentViewTypeDropdown({
  currentOption,
  onSelect,
  className,
}: CommentViewTypeDropdownProps) {
  return (
    <FilterChipDropdown
      label={"view"}
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
