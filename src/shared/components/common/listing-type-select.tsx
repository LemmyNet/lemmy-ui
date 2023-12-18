import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "@/inferno";
import { ListingType } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import { useId } from "react";

interface ListingTypeSelectProps {
  type_: ListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  onChange(val: ListingType): void;
}

interface ListingTypeSelectState {
  type_: ListingType;
}

class _ListingTypeSelect extends Component<
  ListingTypeSelectProps & { id: string },
  ListingTypeSelectState
> {
  state: ListingTypeSelectState = {
    type_: this.props.type_,
  };
  get id() {
    return this.props.id;
  }

  constructor(props: any, context: any) {
    super(props, context);
  }

  static getDerivedStateFromProps(
    props: ListingTypeSelectProps,
  ): ListingTypeSelectState {
    return {
      type_: props.type_,
    };
  }

  render() {
    return (
      <div
        className="listing-type-select btn-group btn-group-toggle flex-wrap"
        role="group"
      >
        {this.props.showSubscribed && (
          <>
            <input
              id={`${this.id}-subscribed`}
              type="radio"
              className="btn-check"
              value={"Subscribed"}
              checked={this.state.type_ === "Subscribed"}
              onChange={linkEvent(this, this.handleTypeChange)}
              disabled={!UserService.Instance.myUserInfo}
            />
            <label
              htmlFor={`${this.id}-subscribed`}
              title={I18NextService.i18n.t("subscribed_description")}
              className={classNames("btn btn-outline-secondary", {
                active: this.state.type_ === "Subscribed",
                disabled: !UserService.Instance.myUserInfo,
                pointer: UserService.Instance.myUserInfo,
              })}
            >
              {I18NextService.i18n.t("subscribed")}
            </label>
          </>
        )}
        {this.props.showLocal && (
          <>
            <input
              id={`${this.id}-local`}
              type="radio"
              className="btn-check"
              value={"Local"}
              checked={this.state.type_ === "Local"}
              onChange={linkEvent(this, this.handleTypeChange)}
            />
            <label
              htmlFor={`${this.id}-local`}
              title={I18NextService.i18n.t("local_description")}
              className={classNames("pointer btn btn-outline-secondary", {
                active: this.state.type_ === "Local",
              })}
            >
              {I18NextService.i18n.t("local")}
            </label>
          </>
        )}
        <input
          id={`${this.id}-all`}
          type="radio"
          className="btn-check"
          value={"All"}
          checked={this.state.type_ === "All"}
          onChange={linkEvent(this, this.handleTypeChange)}
        />
        <label
          title={I18NextService.i18n.t("all_description")}
          htmlFor={`${this.id}-all`}
          className={classNames("pointer btn btn-outline-secondary", {
            active:
              this.state.type_ === "All" ||
              (!this.props.showLocal && this.state.type_) === "Local",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>
        {(UserService.Instance.myUserInfo?.moderates.length ?? 0) > 0 && (
          <>
            <input
              id={`${this.id}-moderator-view`}
              type="radio"
              className="btn-check"
              value={"ModeratorView"}
              checked={this.state.type_ === "ModeratorView"}
              onChange={linkEvent(this, this.handleTypeChange)}
            />
            <label
              htmlFor={`${this.id}-moderator-view`}
              title={I18NextService.i18n.t("moderator_view_description")}
              className={classNames("pointer btn btn-outline-secondary", {
                active: this.state.type_ === "ModeratorView",
              })}
            >
              {I18NextService.i18n.t("moderator_view")}
            </label>
          </>
        )}
      </div>
    );
  }

  handleTypeChange(i: _ListingTypeSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}

export function ListingTypeSelect(p: ListingTypeSelectProps) {
  return <_ListingTypeSelect {...p} id={useId()} />;
}
