import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { PostListingMode } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { NoOptionI18nKeys } from "i18next";

interface Props {
  current: PostListingMode;
  onChange(val: PostListingMode): void;
}

type Choice = {
  key: NoOptionI18nKeys;
  value: PostListingMode;
};

const choices: Choice[] = [
  { key: "list", value: "list" },
  { key: "card", value: "card" },
  { key: "small_card", value: "small_card" },
];

export class PostListingModeSelect extends Component<Props, any> {
  private id = `post-listing-mode-select-${randomStr()}`;

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <select
        id={this.id}
        name={this.id}
        value={this.props.current}
        onChange={linkEvent(this, this.handleChange)}
        className="sort-select form-select d-inline-block w-auto me-2"
        aria-label={I18NextService.i18n.t("listing_mode")}
      >
        <option disabled aria-hidden="true">
          {I18NextService.i18n.t("listing_mode")}
        </option>
        {choices.map(choice => {
          return (
            <option value={choice.value}>
              {I18NextService.i18n.t(choice.key)}
            </option>
          );
        })}
      </select>
    );
  }

  handleChange(i: PostListingModeSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
