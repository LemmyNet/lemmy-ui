import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { PostSortType } from "lemmy-js-client";
import { relTags, sortingHelpUrl } from "@utils/config";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

interface Props {
  sort: PostSortType;
  onChange(val: PostSortType): void;
  // TODO do this need to be here?
  hideHot?: boolean;
  hideMostComments?: boolean;
}

interface State {
  sort: PostSortType;
}

export class PostSortSelect extends Component<Props, State> {
  private id = `post-sort-select-${randomStr()}`;
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
          {!this.props.hideHot && [
            <option value="Hot">{I18NextService.i18n.t("hot")}</option>,
            <option value="Active">{I18NextService.i18n.t("active")}</option>,
            <option value="Scaled">{I18NextService.i18n.t("scaled")}</option>,
          ]}
          <option value="Controversial">
            {I18NextService.i18n.t("controversial")}
          </option>
          <option value="New">{I18NextService.i18n.t("new")}</option>
          <option value="Old">{I18NextService.i18n.t("old")}</option>
          {!this.props.hideMostComments && [
            <option value="MostComments">
              {I18NextService.i18n.t("most_comments")}
            </option>,
            <option value="NewComments">
              {I18NextService.i18n.t("new_comments")}
            </option>,
          ]}
          <option value="Top">{I18NextService.i18n.t("top")}</option>
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

  handleSortChange(i: PostSortSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
