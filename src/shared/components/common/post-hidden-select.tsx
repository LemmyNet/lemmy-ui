import { StringBoolean } from "@utils/types";
import classNames from "classnames";
import { Icon } from "./icon";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services/I18NextService";

interface PostHiddenSelectProps {
  showHidden?: StringBoolean;
  onShowHiddenChange: (hidden?: StringBoolean) => void;
}

function handleShowHiddenChange(i: PostHiddenSelect, event: any) {
  i.props.onShowHiddenChange(event.target.value);
}

@tippyMixin
export default class PostHiddenSelect extends Component<
  PostHiddenSelectProps,
  never
> {
  render() {
    const { showHidden } = this.props;

    return (
      <div
        className="show-hidden-select btn-group btn-group-toggle flex-wrap"
        role="group"
      >
        <input
          id="show-hidden"
          type="radio"
          className="btn-check"
          value="true"
          checked={showHidden === "true"}
          onChange={linkEvent(this, handleShowHiddenChange)}
        />
        <label
          htmlFor="show-hidden"
          className={classNames("pointer btn btn-outline-secondary", {
            active: showHidden === "true",
          })}
          data-tippy-content={I18NextService.i18n.t("show_hidden_posts")}
          aria-label={I18NextService.i18n.t("show_hidden_posts")}
        >
          <Icon icon="eye" inline />
        </label>
        <input
          id="hide-hidden"
          type="radio"
          className="btn-check"
          value="false"
          checked={showHidden !== "true"}
          onChange={linkEvent(this, handleShowHiddenChange)}
        />
        <label
          htmlFor="hide-hidden"
          className={classNames("pointer btn btn-outline-secondary", {
            active: showHidden !== "true",
          })}
          data-tippy-content={I18NextService.i18n.t("hide_hidden_posts")}
          aria-label={I18NextService.i18n.t("hide_hidden_posts")}
        >
          <Icon icon="eye-slash" inline />
        </label>
      </div>
    );
  }
}
