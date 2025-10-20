import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { PostOrCommentType } from "@utils/types";
import { I18NextService } from "../../services";

interface PostOrCommentTypeSelectProps {
  type_: PostOrCommentType;
  onChange?(val: PostOrCommentType): any;
}

interface PostOrCommentTypeSelectState {
  type_: PostOrCommentType;
}

export class PostOrCommentTypeSelect extends Component<
  PostOrCommentTypeSelectProps,
  PostOrCommentTypeSelectState
> {
  private id = `data-type-input-${randomStr()}`;

  state: PostOrCommentTypeSelectState = {
    type_: this.props.type_,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  // Necessary in case the props change
  static getDerivedStateFromProps(props: any): PostOrCommentTypeSelectProps {
    return {
      type_: props.type_,
    };
  }

  render() {
    return (
      <div
        className="data-type-select btn-group btn-group-toggle flex-wrap"
        role="group"
      >
        <input
          id={`${this.id}-posts`}
          type="radio"
          className="btn-check"
          value={"post"}
          checked={this.state.type_ === "post"}
          onChange={linkEvent(this, this.handleTypeChange)}
        />
        <label
          htmlFor={`${this.id}-posts`}
          className={classNames("pointer btn btn-outline-secondary", {
            active: this.state.type_ === "post",
          })}
        >
          {I18NextService.i18n.t("posts")}
        </label>

        <input
          id={`${this.id}-comments`}
          type="radio"
          className="btn-check"
          value={"comment"}
          checked={this.state.type_ === "comment"}
          onChange={linkEvent(this, this.handleTypeChange)}
        />
        <label
          htmlFor={`${this.id}-comments`}
          className={classNames("pointer btn btn-outline-secondary", {
            active: this.state.type_ === "comment",
          })}
        >
          {I18NextService.i18n.t("comments")}
        </label>
      </div>
    );
  }

  handleTypeChange(i: PostOrCommentTypeSelect, event: any) {
    i.props.onChange?.(event.target.value);
  }
}
