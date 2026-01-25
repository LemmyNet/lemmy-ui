import { I18NextService } from "@services/index";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Icon } from "./icon";

export type FilterOption<T extends string> = {
  value: T;
  i18n?: NoOptionI18nKeys;
};

type FilterChipDropdownProps<T extends string> = {
  allOptions: FilterOption<T>[];
  currentOption: FilterOption<T> | undefined;
  onSelect(val: T): void;
  className?: string;
};

export function FilterChipDropdown<T extends string>({
  className,
  allOptions,
  currentOption,
  onSelect,
}: FilterChipDropdownProps<T>) {
  const id = randomStr();
  // TODO I kind of hate how strong active is
  return (
    <div className="dropdown">
      <button
        className={classNames(
          "btn btn-sm btn-light border-light-subtle dropdown-toggle",
          className,
          // { active: currentOption },
        )}
        type="button"
        aria-expanded={false}
        data-bs-toggle="dropdown"
      >
        {currentOption && (
          <>
            <Icon icon="check" classes={"icon-inline me-1"} />
            {filterOptioni18nStr(currentOption)}
          </>
        )}
      </button>
      <ul className="dropdown-menu">
        {allOptions.map(opt => (
          <li>
            <button
              className={classNames("dropdown-item", {
                "fw-bold": currentOption?.value === opt.value,
              })}
              id={`${id}-${opt.value}`}
              value={opt.value}
              role="option"
              aria-selected={currentOption?.value === opt.value}
              onClick={() => onSelect(opt.value)}
            >
              {filterOptioni18nStr(opt)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function filterOptioni18nStr<T extends string>(
  option: FilterOption<T>,
): string {
  return I18NextService.i18n.t(
    option.i18n ?? (option.value as NoOptionI18nKeys),
  );
}
