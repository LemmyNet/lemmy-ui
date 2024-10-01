import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { PostSortType } from "lemmy-js-client";
import { relTags, sortingHelpUrl } from "../../config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

interface SortSelectProps {
  sort: PostSortType;
  onChange(val: PostSortType): void;
  hideHot?: boolean;
  hideMostComments?: boolean;
}

interface SortSelectState {
  sort: PostSortType;
}

export class SortSelect extends Component<SortSelectProps, SortSelectState> {
  private id = `sort-select-${randomStr()}`;
  state: SortSelectState = {
    sort: this.props.sort,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  static getDerivedStateFromProps(props: SortSelectProps): SortSelectState {
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
          {!this.props.hideHot && [
            <option key="Hot" value="Hot">
              {I18NextService.i18n.t("hot")}
            </option>,
            <option key="Active" value="Active">
              {I18NextService.i18n.t("active")}
            </option>,
            <option key="Scaled" value="Scaled">
              {I18NextService.i18n.t("scaled")}
            </option>,
          ]}
          <option value="Controversial">
            {I18NextService.i18n.t("controversial")}
          </option>
          <option value="New">{I18NextService.i18n.t("new")}</option>
          <option value="Old">{I18NextService.i18n.t("old")}</option>
          {!this.props.hideMostComments && [
            <option key="MostComments" value="MostComments">
              {I18NextService.i18n.t("most_comments")}
            </option>,
            <option key="NewComments" value="NewComments">
              {I18NextService.i18n.t("new_comments")}
            </option>,
          ]}
          <option disabled aria-hidden="true">
            ─────
          </option>
          <option value="TopHour">{I18NextService.i18n.t("top_hour")}</option>
          <option value="TopSixHour">
            {I18NextService.i18n.t("top_six_hours")}
          </option>
          <option value="TopTwelveHour">
            {I18NextService.i18n.t("top_twelve_hours")}
          </option>
          <option value="TopDay">{I18NextService.i18n.t("top_day")}</option>
          <option value="TopWeek">{I18NextService.i18n.t("top_week")}</option>
          <option value="TopMonth">{I18NextService.i18n.t("top_month")}</option>
          <option value="TopThreeMonths">
            {I18NextService.i18n.t("top_three_months")}
          </option>
          <option value="TopSixMonths">
            {I18NextService.i18n.t("top_six_months")}
          </option>
          <option value="TopNineMonths">
            {I18NextService.i18n.t("top_nine_months")}
          </option>
          <option value="TopYear">{I18NextService.i18n.t("top_year")}</option>
          <option value="TopAll">{I18NextService.i18n.t("top_all")}</option>
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

  handleSortChange(i: SortSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
