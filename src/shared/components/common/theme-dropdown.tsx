import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

type ThemeDropdownProps = {
  currentOption: string;
  themeList: string[];
  onSelect: (val: string) => void;
  includeInstanceDefaults: boolean;
  className?: string;
};
export function ThemeDropdown({
  currentOption,
  themeList,
  onSelect,
  includeInstanceDefaults,
  className,
}: ThemeDropdownProps) {
  const options: FilterOption<string>[] = [
    { value: "browser", noI18n: "browser" },
  ];

  if (includeInstanceDefaults) {
    const instanceDefaults: FilterOption<string>[] = [
      { value: "instance", i18n: "theme_instance_default" },
      { value: "instance-compact", i18n: "theme_instance_default_compact" },
    ];

    options.push(...instanceDefaults);
  }

  const builtThemes = themeList.map(
    (theme): FilterOption<string> => ({
      value: theme,
      noI18n: theme,
    }),
  );

  options.push(...builtThemes);

  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={
        options.find(t => t.value === currentOption) ?? builtThemes[0]
      }
      onSelect={onSelect}
      className={className}
    />
  );
}
