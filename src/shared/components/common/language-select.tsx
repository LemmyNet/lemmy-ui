import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { Language } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services/UserService";
import { randomStr, selectableLanguages } from "../../utils";
import { Icon } from "./icon";

interface LanguageSelectProps {
  allLanguages: Language[];
  siteLanguages: number[];
  selectedLanguageIds?: number[];
  multiple?: boolean;
  onChange(val: number[]): any;
  showAll?: boolean;
  showSite?: boolean;
  iconVersion?: boolean;
  disabled?: boolean;
  showLanguageWarning?: boolean;
}

export class LanguageSelect extends Component<LanguageSelectProps, any> {
  private id = `language-select-${randomStr()}`;

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    this.setSelectedValues();
  }

  // Necessary because there is no HTML way to set selected for multiple in value=
  setSelectedValues() {
    const ids = this.props.selectedLanguageIds?.map(toString);
    if (ids) {
      const select = (document.getElementById(this.id) as HTMLSelectElement)
        .options;
      for (let i = 0; i < select.length; i++) {
        const o = select[i];
        if (ids.includes(o.value)) {
          o.selected = true;
        }
      }
    }
  }

  render() {
    return this.props.iconVersion ? (
      this.selectBtn
    ) : (
      <div className="language-select">
        {this.props.multiple && this.props.showLanguageWarning && (
          <div className="alert alert-warning" role="alert">
            {i18n.t("undetermined_language_warning")}
          </div>
        )}
        <div className="form-group row">
          <label
            className={classNames(
              "language-select__plural",
              "col-form-label",
              `col-sm-${this.props.multiple ? 3 : 2}`
            )}
            htmlFor={this.id}
          >
            {i18n.t(this.props.multiple ? "language_plural" : "language")}
          </label>
          <div
            className={classNames(
              "language-select__deselect",
              "input-group",
              `col-sm-${this.props.multiple ? 9 : 10}`
            )}
          >
            {this.selectBtn}
            {this.props.multiple && (
              <div className="input-group-append">
                <button
                  className="input-group-text"
                  onClick={linkEvent(this, this.handleDeselectAll)}
                >
                  <Icon icon="x" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  get selectBtn() {
    const selectedLangs = this.props.selectedLanguageIds;
    const filteredLangs = selectableLanguages(
      this.props.allLanguages,
      this.props.siteLanguages,
      this.props.showAll,
      this.props.showSite,
      UserService.Instance.myUserInfo
    );

    return (
      <select
        className={classNames("lang-select-action custom-select w-auto", {
          "form-control": !this.props.iconVersion,
        })}
        id={this.id}
        onChange={linkEvent(this, this.handleLanguageChange)}
        aria-label={i18n.t("language_select_placeholder")}
        multiple={this.props.multiple}
        disabled={this.props.disabled}
      >
        {!this.props.multiple && (
          <option selected disabled hidden>
            {i18n.t("language_select_placeholder")}
          </option>
        )}
        {filteredLangs.map(l => (
          <option
            key={l.id}
            value={l.id}
            selected={selectedLangs?.includes(l.id)}
          >
            {l.name}
          </option>
        ))}
      </select>
    );
  }

  handleLanguageChange(i: LanguageSelect, event: any) {
    const options: HTMLOptionElement[] = Array.from(event.target.options);
    const selected: number[] = options
      .filter(o => o.selected)
      .map(o => Number(o.value));

    i.props.onChange(selected);
  }

  handleDeselectAll(i: LanguageSelect, event: any) {
    event.preventDefault();
    i.props.onChange([]);
  }
}
