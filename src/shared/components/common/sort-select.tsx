import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { relTags, sortingHelpUrl } from "@utils/config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { NoOptionI18nKeys } from "i18next";
import {
  CommentSortType,
  CommunitySortType,
  PostSortType,
  SearchSortType,
  VoteShow,
} from "lemmy-js-client";

interface CommonSortSelectProps<SortT extends string> {
  onChange(val: SortT): void;
  current: SortT;
}

interface SortSelectProps<SortT extends string>
  extends CommonSortSelectProps<SortT> {
  choices: SortChoice<SortT>[];
  title: NoOptionI18nKeys;
}

type SortChoice<SortT extends string> =
  | {
      key: NoOptionI18nKeys;
      value: SortT;
    }
  | "spacer";

class SortSelect<SortT extends string> extends Component<
  SortSelectProps<SortT>
> {
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
          value={this.props.current}
          onChange={linkEvent(this, this.handleSortChange)}
          className="sort-select form-select d-inline-block w-auto me-2"
          aria-label={I18NextService.i18n.t("sort_type")}
        >
          <option disabled aria-hidden="true">
            {I18NextService.i18n.t(this.props.title)}
          </option>
          {this.props.choices.map(choice => {
            if (choice === "spacer") {
              return (
                <option disabled aria-hidden="true">
                  {" "}
                  ─────{" "}
                </option>
              );
            }
            return (
              <option value={choice.value}>
                {I18NextService.i18n.t(choice.key)}
              </option>
            );
          })}
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

  handleSortChange(i: SortSelect<SortT>, event: any) {
    i.props.onChange(event.target.value);
  }
}

const postSortChoices: SortChoice<PostSortType>[] = [
  { key: "hot", value: "Hot" },
  { key: "active", value: "Active" },
  { key: "scaled", value: "Scaled" },
  "spacer",
  { key: "top", value: "Top" },
  { key: "controversial", value: "Controversial" },
  { key: "new", value: "New" },
  { key: "old", value: "Old" },
  "spacer",
  { key: "most_comments", value: "MostComments" },
  { key: "new_comments", value: "NewComments" },
];

export class PostSortSelect extends Component<
  CommonSortSelectProps<PostSortType>
> {
  render() {
    return (
      <SortSelect<PostSortType>
        title="sort_type"
        onChange={this.props.onChange}
        choices={postSortChoices}
        current={this.props.current}
      />
    );
  }
}

const commentSortChoices: SortChoice<CommentSortType>[] = [
  { key: "hot", value: "Hot" },
  { key: "new", value: "New" },
  { key: "old", value: "Old" },
  { key: "controversial", value: "Controversial" },
  { key: "top", value: "Top" },
];

export class CommentSortSelect extends Component<
  CommonSortSelectProps<CommentSortType>
> {
  render() {
    return (
      <SortSelect<CommentSortType>
        title="sort_type"
        onChange={this.props.onChange}
        choices={commentSortChoices}
        current={this.props.current}
      />
    );
  }
}

const communitiesSortChoices: SortChoice<CommunitySortType>[] = [
  { key: "hot", value: "Hot" },
  { key: "new", value: "New" },
  { key: "old", value: "Old" },
  "spacer",
  { key: "comments", value: "Comments" },
  { key: "posts", value: "Posts" },
  { key: "subscribers", value: "Subscribers" },
  { key: "subscribers_local", value: "SubscribersLocal" },
  "spacer",
  { key: "active_daily", value: "ActiveDaily" },
  { key: "active_weekly", value: "ActiveWeekly" },
  { key: "active_monthly", value: "ActiveMonthly" },
  { key: "active_six_months", value: "ActiveSixMonths" },
  "spacer",
  { key: "name_asc", value: "NameAsc" },
  { key: "name_desc", value: "NameDesc" },
];

export class CommunitiesSortSelect extends Component<
  CommonSortSelectProps<CommunitySortType>
> {
  render() {
    return (
      <SortSelect<CommunitySortType>
        title="sort_type"
        onChange={this.props.onChange}
        choices={communitiesSortChoices}
        current={this.props.current}
      />
    );
  }
}

const searchSortChoices: SortChoice<SearchSortType>[] = [
  { key: "top", value: "Top" },
  { key: "new", value: "New" },
  { key: "old", value: "Old" },
];

export class SearchSortSelect extends Component<
  CommonSortSelectProps<SearchSortType>
> {
  render() {
    return (
      <SortSelect<SearchSortType>
        title="sort_type"
        onChange={this.props.onChange}
        choices={searchSortChoices}
        current={this.props.current}
      />
    );
  }
}

const voteShowChoices: SortChoice<VoteShow>[] = [
  { key: "vote_show", value: "Show" },
  { key: "vote_show_for_others", value: "ShowForOthers" },
  { key: "vote_hide", value: "Hide" },
];

export class VoteShowSelect extends Component<CommonSortSelectProps<VoteShow>> {
  render() {
    return (
      <SortSelect<VoteShow>
        title="sort_type"
        onChange={this.props.onChange}
        choices={voteShowChoices}
        current={this.props.current}
      />
    );
  }
}
