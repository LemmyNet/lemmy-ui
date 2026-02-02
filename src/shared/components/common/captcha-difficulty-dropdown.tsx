import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

export type CaptchaDifficulty = "easy" | "medium" | "hard";

const options: FilterOption<CaptchaDifficulty>[] = [
  { value: "easy", i18n: "easy" },
  { value: "medium", i18n: "medium" },
  { value: "hard", i18n: "hard" },
];

type CaptchaDifficultyDropdownProps = {
  currentOption: CaptchaDifficulty;
  onSelect(val: CaptchaDifficulty): void;
  className?: string;
};
export function CaptchaDifficultyDropdown({
  currentOption,
  onSelect,
  className,
}: CaptchaDifficultyDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={options}
      currentOption={options.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
