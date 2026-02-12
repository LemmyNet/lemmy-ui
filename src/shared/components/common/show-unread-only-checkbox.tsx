import { FilterChipCheckbox } from "./filter-chip-checkbox";

type ShowUnreadOnlyCheckboxProps = {
  isChecked: boolean;
  onCheck(this: void, checked: boolean): void;
  className?: string;
};
export function ShowUnreadOnlyCheckbox({
  isChecked,
  onCheck,
}: ShowUnreadOnlyCheckboxProps) {
  return (
    <FilterChipCheckbox
      option={"show_unread_only"}
      isChecked={isChecked ?? false}
      onCheck={onCheck}
    />
  );
}
