import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { PostSortType, CommentSortType } from "lemmy-js-client";
import { relTags, sortingHelpUrl } from "../../config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

type SortSelectProps = {
  hideHot?: boolean;
  hideMostComments?: boolean;
} & (
  | {
      sort: PostSortType;
      onChange(val: PostSortType): void;
      commentSort?: false;
    }
  | {
      sort: CommentSortType;
      onChange(val: CommentSortType): void;
      commentSort: true;
    }
);

export class SortSelect extends Component<
  SortSelectProps,
  Record<never, never>
> {
  private id = `sort-select-${randomStr()}`;

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <>
        {this.props.commentSort ? this.commentSelect() : this.postSelect()}
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

  commentSelect() {
    return (
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
        <option value={"Hot"}>{I18NextService.i18n.t("hot")}</option>
        <option value={"Top"}>{I18NextService.i18n.t("top")}</option>
        <option value={"Controversial"}>
          {I18NextService.i18n.t("controversial")}
        </option>
        <option value={"New"}>{I18NextService.i18n.t("new")}</option>
        <option value={"Old"}>{I18NextService.i18n.t("old")}</option>
      </select>
    );
  }

  postSelect() {
    return (
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
        {!this.props.hideHot && [
          <option key={"Hot"} value={"Hot"}>
            {I18NextService.i18n.t("hot")}
          </option>,
          <option key={"Active"} value={"Active"}>
            {I18NextService.i18n.t("active")}
          </option>,
          <option key={"Scaled"} value={"Scaled"}>
            {I18NextService.i18n.t("scaled")}
          </option>,
        ]}
        <option value={"Controversial"}>
          {I18NextService.i18n.t("controversial")}
        </option>
        <option value={"New"}>{I18NextService.i18n.t("new")}</option>
        <option value={"Old"}>{I18NextService.i18n.t("old")}</option>
        {!this.props.hideMostComments && [
          <option key={"MostComments"} value={"MostComments"}>
            {I18NextService.i18n.t("most_comments")}
          </option>,
          <option key={"NewComments"} value={"NewComments"}>
            {I18NextService.i18n.t("new_comments")}
          </option>,
        ]}
        <option disabled aria-hidden="true">
          ─────
        </option>
        <option value={"TopHour"}>{I18NextService.i18n.t("top_hour")}</option>
        <option value={"TopSixHour"}>
          {I18NextService.i18n.t("top_six_hours")}
        </option>
        <option value={"TopTwelveHour"}>
          {I18NextService.i18n.t("top_twelve_hours")}
        </option>
        <option value={"TopDay"}>{I18NextService.i18n.t("top_day")}</option>
        <option value={"TopWeek"}>{I18NextService.i18n.t("top_week")}</option>
        <option value={"TopMonth"}>{I18NextService.i18n.t("top_month")}</option>
        <option value={"TopThreeMonths"}>
          {I18NextService.i18n.t("top_three_months")}
        </option>
        <option value={"TopSixMonths"}>
          {I18NextService.i18n.t("top_six_months")}
        </option>
        <option value={"TopNineMonths"}>
          {I18NextService.i18n.t("top_nine_months")}
        </option>
        <option value={"TopYear"}>{I18NextService.i18n.t("top_year")}</option>
        <option value={"TopAll"}>{I18NextService.i18n.t("top_all")}</option>
      </select>
    );
  }

  handleSortChange(i: SortSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
