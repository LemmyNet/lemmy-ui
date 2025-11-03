import { I18NextService } from "@services/index";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { linkEvent } from "inferno";
import { Component } from "inferno";

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

export class RadioButtonGroup extends Component<RadioButtonGroupProps, object> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const radioId = randomStr();
    return (
      <div
        className={classNames(
          "btn-group btn-group-toggle flex-wrap",
          this.props.className,
        )}
        role="group"
      >
        {this.props.allOptions.map(state => (
          <>
            <input
              id={`${radioId}-${state.value}`}
              type="radio"
              className="btn-check"
              value={state.value}
              checked={this.props.currentOption === state.value}
              onChange={linkEvent(this, this.handleChange)}
            />
            <label
              htmlFor={`${radioId}-${state.value}`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.props.currentOption === state.value,
              })}
            >
              {I18NextService.i18n.t(state.i18n)}
            </label>
          </>
        ))}
      </div>
    );
  }

  handleChange(i: RadioButtonGroup, event: any) {
    i.props.onClick(event.target.value);
  }
}
