import { I18NextService } from "@services/index";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";

export interface RadioOption {
  value: string;
  i18n: NoOptionI18nKeys;
}

export interface RadioButtonGroupProps {
  className?: string;
  allOptions: RadioOption[];
  currentOption: string;
  onClick(val: string): void;
}

export function RadioButtonGroup(props: RadioButtonGroupProps) {
  const radioId = randomStr();
  return (
    <div
      className={classNames(
        "btn-group btn-group-toggle flex-wrap",
        props.className,
      )}
      role="group"
    >
      {props.allOptions.map(state => (
        <>
          <input
            id={`${radioId}-${state.value}`}
            type="radio"
            className="btn-check"
            value={state.value}
            checked={props.currentOption === state.value}
            onChange={() => props.onClick(state.value)}
          />
          <label
            htmlFor={`${radioId}-${state.value}`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: props.currentOption === state.value,
            })}
          >
            {I18NextService.i18n.t(state.i18n)}
          </label>
        </>
      ))}
    </div>
  );
}
