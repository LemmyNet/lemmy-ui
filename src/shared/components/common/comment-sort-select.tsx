import { Component, linkEvent } from "inferno";
import { CommentSortType } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { randomStr, relTags, sortingHelpUrl } from "../../utils";
import { Icon } from "./icon";

interface CommentSortSelectProps {
  sort: CommentSortType;
  onChange?(val: CommentSortType): any;
}

interface CommentSortSelectState {
  sort: CommentSortType;
}

export class CommentSortSelect extends Component<
  CommentSortSelectProps,
  CommentSortSelectState
> {
  private id = `sort-select-${randomStr()}`;
  private emptyState: CommentSortSelectState = {
    sort: this.props.sort,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  static getDerivedStateFromProps(props: any): CommentSortSelectState {
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
          class="custom-select w-auto mr-2 mb-2"
          aria-label={i18n.t("sort_type")}
        >
          <option disabled aria-hidden="true">
            {i18n.t("sort_type")}
          </option>
          <option value={CommentSortType.Hot}>{i18n.t("hot")}</option>,
          <option value={CommentSortType.Top}>{i18n.t("top")}</option>,
          <option value={CommentSortType.New}>{i18n.t("new")}</option>
          <option value={CommentSortType.Old}>{i18n.t("old")}</option>
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

  handleSortChange(i: CommentSortSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
