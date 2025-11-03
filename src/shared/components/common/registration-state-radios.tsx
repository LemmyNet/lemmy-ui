import { Component } from "inferno";
import { RadioOption, RadioButtonGroup } from "./state-radios";

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

    this.handleChange = this.handleChange.bind(this);
  }

  render() {
    const allStates: RadioOption[] = [
      { value: "unread", i18n: "unread" },
      { value: "all", i18n: "all" },
      { value: "denied", i18n: "denied" },
    ];
    return (
      <RadioButtonGroup
        allOptions={allStates}
        currentOption={this.props.state}
        onClick={this.handleChange}
      />
    );
  }

  handleChange(val: RegistrationState) {
    this.props.onClickHandler(val);
  }
}
