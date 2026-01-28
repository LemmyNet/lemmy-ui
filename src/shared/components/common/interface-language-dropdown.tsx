import { allLanguages } from "@services/I18NextService";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const options: FilterOption<string>[] = [
  { value: "browser", i18n: "language_browser_default" },
  ...allLanguages
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(
      (lang): FilterOption<string> => ({
        value: lang.code,
        noI18n: lang.name,
      }),
    ),
];

type InterfaceLanguageDropdownProps = {
  currentOption: string;
  onSelect(val: string): void;
  className?: string;
};
export function InterfaceLanguageDropdown({
  currentOption,
  onSelect,
  className,
}: InterfaceLanguageDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
