import { I18NextService } from "@services/index";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { linkEvent } from "inferno";
import { Component } from "inferno";

export type RegistrationState = "unread" | "all" | "denied";

interface RegistrationStateRadiosProps {
  state: RegistrationState;
  onClickHandler(val: RegistrationState): void;
}

export class RegistrationStateRadios extends Component<
  RegistrationStateRadiosProps,
  object
> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const radioId = randomStr();
    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
        <input
          id={`${radioId}-unread`}
          type="radio"
          className="btn-check"
          value={"unread"}
          checked={this.props.state === "unread"}
          onChange={linkEvent(this, this.handleChange)}
        />
        <label
          htmlFor={`${radioId}-unread`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.props.state === "unread",
          })}
        >
          {I18NextService.i18n.t("unread")}
        </label>

        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={"all"}
          checked={this.props.state === "all"}
          onChange={linkEvent(this, this.handleChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.props.state === "all",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>

        <input
          id={`${radioId}-denied`}
          type="radio"
          className="btn-check"
          value={"denied"}
          checked={this.props.state === "denied"}
          onChange={linkEvent(this, this.handleChange)}
        />
        <label
          htmlFor={`${radioId}-denied`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.props.state === "denied",
          })}
        >
          {I18NextService.i18n.t("denied")}
        </label>
      </div>
    );
  }

  handleChange(i: RegistrationStateRadios, event: any) {
    i.props.onClickHandler(event.target.value);
  }
}
