import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

type ThemeDropdownProps = {
  currentOption: string;
  themeList: string[];
  onSelect(val: string): void;
  className?: string;
};
export function ThemeDropdown({
  currentOption,
  themeList,
  onSelect,
  className,
}: ThemeDropdownProps) {
  const options: FilterOption<string>[] = [
    { value: "instance", i18n: "theme_instance_default" },
    { value: "instance-compact", i18n: "theme_instance_default_compact" },
    ...themeList.map(
      (theme): FilterOption<string> => ({
        value: theme,
        noI18n: theme,
      }),
    ),
  ];

  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
