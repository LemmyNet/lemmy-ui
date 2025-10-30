import { Component } from "inferno";
import { State, StateRadio } from "./state-radios";

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
    const allStates: State[] = [
      { value: "unread" },
      { value: "all" },
      { value: "denied" },
    ];
    return (
      <StateRadio
        allStates={allStates}
        currentState={this.props.state}
        onClickHandler={this.handleChange}
      />
    );
  }

  handleChange(val: RegistrationState) {
    this.props.onClickHandler(val);
  }
}
