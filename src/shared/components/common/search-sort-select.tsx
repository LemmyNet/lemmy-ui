import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { SearchSortType } from "lemmy-js-client";
import { relTags, sortingHelpUrl } from "../../config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { NoOptionI18nKeys } from "i18next";

interface SortSelectProps {
  sort: SearchSortType;
  onChange(val: SearchSortType): void;
}

const sortOptions: {
  value: SearchSortType;
  i18nKey: NoOptionI18nKeys;
}[] = [
  { value: "New", i18nKey: "new" },
  { value: "Top", i18nKey: "top" },
  { value: "Old", i18nKey: "old" },
];

export class SearchSortSelect extends Component<SortSelectProps> {
  private id = `sort-select-${randomStr()}`;

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <>
        <select
          id={this.id}
          name={this.id}
          value={this.props.sort}
          onChange={linkEvent(this, this.handleSortChange)}
          className="sort-select form-select d-inline-block w-auto me-2"
          aria-label={I18NextService.i18n.t("sort_type")}
        >
          <option disabled aria-hidden="true">
            {I18NextService.i18n.t("sort_type")}
          </option>
          {sortOptions.map(o => (
            <option value={o.value}>{I18NextService.i18n.t(o.i18nKey)}</option>
          ))}
        </select>
        <a
          className="sort-select-icon text-muted"
          href={sortingHelpUrl}
          rel={relTags}
          title={I18NextService.i18n.t("sorting_help")}
        >
          <Icon icon="help-circle" classes="icon-inline" />
        </a>
      </>
    );
  }

  handleSortChange(i: SearchSortSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
