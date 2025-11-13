import { randomStr } from "@utils/helpers";
import classNames from "classnames";
import { Component } from "inferno";
import { MultiCommunityListingType, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { userNotLoggedInOrBanned } from "@utils/app";

interface Props {
  type_: MultiCommunityListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  myUserInfo: MyUserInfo | undefined;
  onChange(val: MultiCommunityListingType): void;
}

interface State {
  type_: MultiCommunityListingType;
}

export class MultiCommunityListingTypeSelect extends Component<Props, State> {
  private id = `listing-type-input-${randomStr()}`;

  state: State = {
    type_: this.props.type_,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  static getDerivedStateFromProps(props: Props): State {
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
              value={"subscribed"}
              checked={this.state.type_ === "subscribed"}
              onChange={e => handleTypeChange(this, e)}
              disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
            />
            <label
              htmlFor={`${this.id}-subscribed`}
              title={I18NextService.i18n.t("subscribed_description")}
              className={classNames("btn btn-outline-secondary", {
                active: this.state.type_ === "subscribed",
                disabled: !this.props.myUserInfo,
                pointer: this.props.myUserInfo,
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
              value={"local"}
              checked={this.state.type_ === "local"}
              onChange={e => handleTypeChange(this, e)}
            />
            <label
              htmlFor={`${this.id}-local`}
              title={I18NextService.i18n.t("local_description")}
              className={classNames("pointer btn btn-outline-secondary", {
                active: this.state.type_ === "local",
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
          value={"all"}
          checked={this.state.type_ === "all"}
          onChange={e => handleTypeChange(this, e)}
        />
        <label
          title={I18NextService.i18n.t("all_description")}
          htmlFor={`${this.id}-all`}
          className={classNames("pointer btn btn-outline-secondary", {
            active:
              this.state.type_ === "all" ||
              (!this.props.showLocal && this.state.type_) === "local",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>
      </div>
    );
  }
}

function handleTypeChange(i: MultiCommunityListingTypeSelect, event: any) {
  i.props.onChange(event.target.value);
}
