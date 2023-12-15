import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "@/inferno";
import { CommentSortType } from "lemmy-js-client";
import { relTags, sortingHelpUrl } from "../../config";
import { I18NextService } from "../../services";
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
  state: CommentSortSelectState = {
    sort: this.props.sort,
  };

  constructor(props: any, context: any) {
    super(props, context);
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
          value={this.state.sort}
          onChange={linkEvent(this, this.handleSortChange)}
          className="sort-select form-select d-inline-block w-auto me-2 mb-2"
          aria-label={I18NextService.i18n.t("sort_type")}
        >
          <option disabled aria-hidden="true">
            {I18NextService.i18n.t("sort_type")}
          </option>
          <option value={"Hot"}>{I18NextService.i18n.t("hot")}</option>,
          <option value={"Controversial"}>
            {I18NextService.i18n.t("controversial")}
          </option>
          <option value={"Top"}>{I18NextService.i18n.t("top")}</option>,
          <option value={"New"}>{I18NextService.i18n.t("new")}</option>
          <option value={"Old"}>{I18NextService.i18n.t("old")}</option>
        </select>
        <a
          className="sort-select-help text-muted"
          href={sortingHelpUrl}
          rel={relTags}
          title={I18NextService.i18n.t("sorting_help")}
        >
          <Icon icon="help-circle" classes="icon-inline" />
        </a>
      </>
    );
  }

  handleSortChange(i: CommentSortSelect, event: any) {
    i.props.onChange?.(event.target.value);
  }
}
