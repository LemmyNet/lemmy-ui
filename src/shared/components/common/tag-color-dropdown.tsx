import { TagColor } from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

// There are actually 10 color options in the back end, but squash these down
const tagColorOptions: FilterOption<TagColor>[] = [
  { noI18n: "1", value: "color01" },
  { noI18n: "2", value: "color02" },
  { noI18n: "3", value: "color03" },
  { noI18n: "4", value: "color04" },
  { noI18n: "5", value: "color05" },
  { noI18n: "6", value: "color06" },
];

type TagColorDropdownProps = {
  currentOption: TagColor;
  onSelect: (val: TagColor) => void;
  className?: string;
};

export function tagColorToColorClass(tagColor: TagColor): string {
  switch (tagColor) {
    case "color01":
      return "light";
    case "color02":
      return "primary";
    case "color03":
      return "info";
    case "color04":
      return "success";
    case "color05":
      return "warning";
    case "color06":
      return "danger";
    case "color07":
    case "color08":
    case "color09":
    case "color10":
      return "light";
  }
}

function tagColorToBtnClasses(tagColor: TagColor): string {
  const colorClass = tagColorToColorClass(tagColor);

  return `btn btn-sm bg-${colorClass}-subtle border-${colorClass}-subtle`;
}

export function TagColorDropdown({
  currentOption,
  onSelect,
  className,
}: TagColorDropdownProps) {
  const classes = `${className} ${tagColorToBtnClasses(currentOption)}`;

  return (
    <FilterChipDropdown
      allOptions={tagColorOptions}
      label={"color"}
      currentOption={tagColorOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={classes}
    />
  );
}
