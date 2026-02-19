import { selectableLanguages } from "@utils/app";
import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, FormEvent, InfernoMouseEvent } from "inferno";
import { Language, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { languageName } from "./language-list";

interface LanguageSelectProps {
  allLanguages?: Language[];
  siteLanguages?: number[];
  selectedLanguageIds?: number[];
  multiple?: boolean;
  onChange(val: number[]): any;
  showAll?: boolean;
  showSite?: boolean;
  iconVersion?: boolean;
  disabled?: boolean;
  showLanguageWarning?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

interface LanguageSelectState {
  filter: string;
  selected: number[];
}

export class LanguageSelect extends Component<
  LanguageSelectProps,
  LanguageSelectState
> {
  private id = `language-select-${randomStr()}`;
  state: LanguageSelectState = {
    filter: "",
    selected: this.props.selectedLanguageIds ?? [],
  };

  componentDidMount() {
    if (!this.props.multiple) {
      this.setSelectedValues();
    }
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
        <div>{this.props.multiple ? this.multiSelectBtn : this.selectBtn}</div>
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
      this.props.myUserInfo,
    );

    const selectedLangsNames = filteredLangs
      .filter(l => selectedLangs?.includes(l.id))
      .map(l => languageName(l))
      .join(",");

    return (
      <div className="dropdown">
        <button
          className={classNames(
            "dropdown-toggle btn btn-sm btn-light border-light-subtle",
            {
              "d-inline-block": !this.props.iconVersion,
            },
          )}
          id={this.id}
          type="button"
          aria-expanded={false}
          data-bs-toggle="dropdown"
          aria-label={I18NextService.i18n.t("language_select_placeholder")}
          aria-describedby={
            this.props.multiple && this.props.showLanguageWarning
              ? "lang-warning"
              : ""
          }
          disabled={this.props.disabled}
        >
          {selectedLangsNames
            ? selectedLangsNames
            : I18NextService.i18n.t("language_select_placeholder")}
        </button>
        <ul className="dropdown-menu">
          {filteredLangs.map(l => (
            <li>
              <button
                className={classNames("dropdown-item", {
                  "fw-bold": selectedLangs?.includes(l.id),
                })}
                id={`language-option-{l.id}`}
                value={l.id}
                type="button"
                role="option"
                aria-selected={selectedLangs?.includes(l.id)}
                onClick={() => this.props.onChange([l.id])}
              >
                {languageName(l)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  get multiSelectBtn() {
    const selectedLangs = this.props.selectedLanguageIds ?? [];
    const filteredLangs = selectableLanguages(
      this.props.allLanguages,
      this.props.siteLanguages,
      this.props.showAll,
      this.props.showSite,
      this.props.myUserInfo,
    )
      // Apply the filter
      .filter(a =>
        a.name.toLowerCase().includes(this.state.filter.toLowerCase()),
      )
      // Show selected items first
      .sort((_, b) => {
        if (selectedLangs.includes(b.id)) {
          return 1;
        } else {
          return 0;
        }
      });

    return (
      <div className="border rounded w-100 bg-body">
        <input
          name="q"
          type="search"
          className="form-control flex-initial  border border-0"
          placeholder={`${I18NextService.i18n.t("search")}...`}
          aria-label={I18NextService.i18n.t("search")}
          onInput={e => handleSearchChange(this, e)}
          minLength={1}
          value={this.state.filter}
          autoComplete="off"
        />
        <hr className="border-dark border-2 m-0" />
        <ul
          className="list-group overflow-scroll rounded-0 rounded-bottom"
          style="max-height: 200px;"
          tabIndex={-1}
        >
          {!this.props.multiple && (
            <option selected disabled hidden>
              {I18NextService.i18n.t("language_select_placeholder")}
            </option>
          )}
          {filteredLangs.map(l => (
            <li className="list-group-item p-0 border-0">
              <button
                type="button"
                className="btn text-start w-100 rounded-0 language-item"
                onClick={e => handleCheckboxLanguageChange(this, e)}
                id={l.id.toString()}
              >
                <input
                  className="form-check-input me-1 pe-none"
                  type="checkbox"
                  tabIndex={-1}
                  checked={selectedLangs?.includes(l.id)}
                />
                <label
                  className="form-check-label pe-none"
                  for={l.id.toString()}
                >
                  {l.name}
                </label>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

function handleCheckboxLanguageChange(
  i: LanguageSelect,
  event: InfernoMouseEvent<HTMLButtonElement>,
) {
  const id = Number(event.target.id);
  if (!i.state.selected.includes(id)) {
    i.state.selected.push(id);
  } else {
    // remove the item
    const index = i.state.selected.indexOf(id);
    if (index > -1) {
      i.state.selected.splice(index, 1);
    }
  }
  i.setState({ selected: i.state.selected });
  i.props.onChange(i.state.selected);
}

function handleSearchChange(
  i: LanguageSelect,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ filter: event.target.value });
  i.forceUpdate();
}
