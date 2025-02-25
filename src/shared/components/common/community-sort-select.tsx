import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { CommunitySortType } from "lemmy-js-client";
import { relTags, sortingHelpUrl } from "@utils/config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

interface Props {
  sort: CommunitySortType;
  onChange(val: CommunitySortType): void;
}

interface State {
  sort: CommunitySortType;
}

export class CommunitySortSelect extends Component<Props, State> {
  private id = `community-sort-select-${randomStr()}`;
  state: State = {
    sort: this.props.sort,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  static getDerivedStateFromProps(props: Props): State {
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
          className="sort-select form-select d-inline-block w-auto me-2"
          aria-label={I18NextService.i18n.t("sort_type")}
        >
          <option disabled aria-hidden="true">
            {I18NextService.i18n.t("sort_type")}
          </option>
          <option value="ActiveSixMonths">
            {I18NextService.i18n.t("top_six_months")}
          </option>
          <option value="ActiveMonthly">
            {I18NextService.i18n.t("top_month")}
          </option>
          <option value="ActiveWeekly">
            {I18NextService.i18n.t("top_week")}
          </option>
          <option value="ActiveDaily">
            {I18NextService.i18n.t("top_day")}
          </option>
          <option value="Hot">{I18NextService.i18n.t("hot")}</option>
          <option value="New">{I18NextService.i18n.t("new")}</option>
          <option value="Old">{I18NextService.i18n.t("old")}</option>
          <option value="NameAsc">{I18NextService.i18n.t("name_asc")}</option>
          <option value="NameDesc">{I18NextService.i18n.t("name_desc")}</option>
          <option value="Comments">{I18NextService.i18n.t("comments")}</option>
          <option value="Posts">{I18NextService.i18n.t("posts")}</option>
          <option value="Subscribers">
            {I18NextService.i18n.t("subscribers")}
          </option>
          <option value="SubscribersLocal">
            {I18NextService.i18n.t("subscribers_local")}
          </option>
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

  handleSortChange(i: CommunitySortSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
