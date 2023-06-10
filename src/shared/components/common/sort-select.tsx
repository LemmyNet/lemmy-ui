import { Component, linkEvent } from "inferno";
import { SortType } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { randomStr, relTags, sortingHelpUrl } from "../../utils";
import { Icon } from "./icon";

interface SortSelectProps {
  sort: SortType;
  onChange?(val: SortType): any;
  hideHot?: boolean;
  hideMostComments?: boolean;
}

interface SortSelectState {
  sort: SortType;
}

export class SortSelect extends Component<SortSelectProps, SortSelectState> {
  private id = `sort-select-${randomStr()}`;
  state: SortSelectState = {
    sort: this.props.sort,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  static getDerivedStateFromProps(props: any): SortSelectState {
    return {
      sort: props.sort,
    };
  }

  render() {
    return (
      <>
        <select
          id={this.id}
          name={this.id}
          value={this.state.sort}
          onChange={linkEvent(this, this.handleSortChange)}
          className="custom-select w-auto mr-2 mb-2"
          aria-label={i18n.t("sort_type")}
        >
          <option disabled aria-hidden="true">
            {i18n.t("sort_type")}
          </option>
          {!this.props.hideHot && [
            <option key={"Hot"} value={"Hot"}>
              {i18n.t("hot")}
            </option>,
            <option key={"Active"} value={"Active"}>
              {i18n.t("active")}
            </option>,
          ]}
          <option value={"New"}>{i18n.t("new")}</option>
          <option value={"Old"}>{i18n.t("old")}</option>
          {!this.props.hideMostComments && [
            <option key={"MostComments"} value={"MostComments"}>
              {i18n.t("most_comments")}
            </option>,
            <option key={"NewComments"} value={"NewComments"}>
              {i18n.t("new_comments")}
            </option>,
          ]}
          <option disabled aria-hidden="true">
            ─────
          </option>
          <option value={"TopDay"}>{i18n.t("top_day")}</option>
          <option value={"TopWeek"}>{i18n.t("top_week")}</option>
          <option value={"TopMonth"}>{i18n.t("top_month")}</option>
          <option value={"TopYear"}>{i18n.t("top_year")}</option>
          <option value={"TopAll"}>{i18n.t("top_all")}</option>
        </select>
        <a
          className="text-muted"
          href={sortingHelpUrl}
          rel={relTags}
          title={i18n.t("sorting_help")}
        >
          <Icon icon="help-circle" classes="icon-inline" />
        </a>
      </>
    );
  }

  handleSortChange(i: SortSelect, event: any) {
    i.props.onChange?.(event.target.value);
  }
}
