import { I18NextService } from "@services/index";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { linkEvent } from "inferno";
import { Component } from "inferno";

export interface State {
  value: string;
  i18n: NoOptionI18nKeys;
}

export interface StateRadioProps {
  className?: string;
  allStates: State[];
  currentState: string;
  onClickHandler(val: string): void;
}

export class StateRadio extends Component<StateRadioProps, object> {
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
        {this.props.allStates.map(state => (
          <>
            <input
              id={`${radioId}-${state.value}`}
              type="radio"
              className="btn-check"
              value={state.value}
              checked={this.props.currentState === state.value}
              onChange={linkEvent(this, this.handleChange)}
            />
            <label
              htmlFor={`${radioId}-${state.value}`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.props.currentState === state.value,
              })}
            >
              {I18NextService.i18n.t(state.i18n)}
            </label>
          </>
        ))}
      </div>
    );
  }

  handleChange(i: StateRadio, event: any) {
    i.props.onClickHandler(event.target.value);
  }
}
