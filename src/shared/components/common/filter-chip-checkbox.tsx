import { randomStr } from "@utils/helpers";
import { Icon } from "./icon";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { I18NextService } from "@services/I18NextService";

type FilterChipCheckboxProps = {
  option: NoOptionI18nKeys;
  isChecked: boolean;
  onCheck: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
};

export function FilterChipCheckbox({
  className,
  option,
  isChecked,
  onCheck,
  disabled,
}: FilterChipCheckboxProps) {
  const id = randomStr();
  return (
    <>
      <input
        type="checkbox"
        className={"btn-check visually-hidden"}
        id={`filter-check-${id}`}
        checked={isChecked}
        disabled={disabled}
        onChange={e => onCheck(e.target.checked)}
      />
      <label
        className={classNames(
          "btn btn-sm btn-light border-light-subtle",
          className,
        )}
        for={`filter-check-${id}`}
      >
        <Icon icon={isChecked ? "check" : "x"} classes="icon-inline me-1" />
        {I18NextService.i18n.t(option)}
      </label>
    </>
  );
}
