import { selectableLanguages } from "@utils/app";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { Language } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
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
      <div className="language-select mb-3">
        <label
          className={classNames(
            "col-form-label",
            `col-sm-${this.props.multiple ? 3 : 2}`,
          )}
          htmlFor={this.id}
        >
          {I18NextService.i18n.t(
            this.props.multiple ? "language_plural" : "language",
          )}
        </label>
        {this.props.multiple && this.props.showLanguageWarning && (
          <div
            id="lang-warning"
            className="alert small alert-warning"
            role="alert"
          >
            <Icon icon="alert-triangle" classes="icon-inline me-2" />
            {I18NextService.i18n.t("undetermined_language_warning")}
          </div>
        )}
        <div
          className={classNames(`col-sm-${this.props.multiple ? 9 : 10}`, {
            "input-group": this.props.multiple,
          })}
        >
          {this.selectBtn}
          {this.props.multiple && (
            <button
              className="btn btn-outline-secondary"
              onClick={linkEvent(this, this.handleDeselectAll)}
            >
              <Icon icon="x" />
            </button>
          )}
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
      UserService.Instance.myUserInfo,
    );

    return (
      <select
        className={classNames("form-select w-auto", {
          "d-inline-block": !this.props.iconVersion,
        })}
        id={this.id}
        onChange={linkEvent(this, this.handleLanguageChange)}
        aria-label={I18NextService.i18n.t("language_select_placeholder")}
        aria-describedby={
          this.props.multiple && this.props.showLanguageWarning
            ? "lang-warning"
            : ""
        }
        multiple={this.props.multiple}
        disabled={this.props.disabled}
      >
        {!this.props.multiple && (
          <option selected disabled hidden>
            {I18NextService.i18n.t("language_select_placeholder")}
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
