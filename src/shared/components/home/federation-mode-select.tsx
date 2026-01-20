import { FormEvent, Component } from "inferno";
import { FederationMode } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";

interface FederationModeSelectProps {
  id: string;
  current: FederationMode;
  onChange(event: FormEvent<HTMLSelectElement>): void;
}

const modes: { value: FederationMode; i18nKey: NoOptionI18nKeys }[] = [
  { value: "all", i18nKey: "all" },
  { value: "local", i18nKey: "local" },
  { value: "disable", i18nKey: "disable" },
];

export class FederationModeSelect extends Component<FederationModeSelectProps> {
  render() {
    return (
      <>
        <select
          id={this.props.id}
          value={this.props.current}
          onChange={this.props.onChange}
          className="form-select d-inline-block w-auto"
        >
          {modes.map(mode => (
            <option value={mode.value}>
              {I18NextService.i18n.t(mode.i18nKey)}
            </option>
          ))}
        </select>
      </>
    );
  }
}
