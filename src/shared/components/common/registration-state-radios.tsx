import { RadioOption, RadioButtonGroup } from "./radio-button-group";

export type RegistrationState = "unread" | "all" | "denied";

interface RegistrationStateRadiosProps {
  state: RegistrationState;
  onClick(val: RegistrationState): void;
}

export function RegistrationStateRadios(props: RegistrationStateRadiosProps) {
  const allStates: RadioOption[] = [
    { value: "unread", i18n: "unread" },
    { value: "all", i18n: "all" },
    { value: "denied", i18n: "denied" },
  ];
  return (
    <RadioButtonGroup
      allOptions={allStates}
      currentOption={props.state}
      onClick={props.onClick}
    />
  );
}
