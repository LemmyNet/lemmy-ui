import { PostOrCommentType } from "@utils/types";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<PostOrCommentType>[] = [
  { value: "post", i18n: "posts" },
  { value: "comment", i18n: "comments" },
];

type PostOrCommentTypeDropdownProps = {
  currentOption: PostOrCommentType;
  onSelect(val: PostOrCommentType): void;
  className?: string;
};
export function PostOrCommentTypeDropdown({
  currentOption,
  onSelect,
  className,
}: PostOrCommentTypeDropdownProps) {
  return (
    <FilterChipDropdown
      label={"type"}
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
