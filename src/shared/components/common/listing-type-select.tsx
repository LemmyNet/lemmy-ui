import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { ListingType, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { moderatesSomething } from "@utils/roles";

interface ListingTypeSelectProps {
  type_: ListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  onChange(val: ListingType): void;
  myUserInfo?: MyUserInfo;
}

interface ListingTypeSelectState {
  type_: ListingType;
}

export class ListingTypeSelect extends Component<
  ListingTypeSelectProps,
  ListingTypeSelectState
> {
  private id = `listing-type-input-${randomStr()}`;

  state: ListingTypeSelectState = {
    type_: this.props.type_,
  };

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
              disabled={!this.props.myUserInfo}
            />
            <label
              htmlFor={`${this.id}-subscribed`}
              title={I18NextService.i18n.t("subscribed_description")}
              className={classNames("btn btn-outline-secondary", {
                active: this.state.type_ === "Subscribed",
                disabled: !this.props.myUserInfo,
                pointer: !!this.props.myUserInfo,
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
        {moderatesSomething(this.props.myUserInfo) && (
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

  handleTypeChange(i: ListingTypeSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
