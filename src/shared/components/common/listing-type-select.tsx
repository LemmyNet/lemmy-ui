import { Component, linkEvent } from "inferno";
import { ListingType } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { randomStr } from "../../utils";

interface ListingTypeSelectProps {
  type_: ListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  onChange?(val: ListingType): any;
}

interface ListingTypeSelectState {
  type_: ListingType;
}

export class ListingTypeSelect extends Component<
  ListingTypeSelectProps,
  ListingTypeSelectState
> {
  private id = `listing-type-input-${randomStr()}`;

  private emptyState: ListingTypeSelectState = {
    type_: this.props.type_,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  static getDerivedStateFromProps(props: any): ListingTypeSelectProps {
    return {
      type_: props.type_,
      showLocal: props.showLocal,
      showSubscribed: props.showSubscribed,
    };
  }

  render() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        {this.props.showSubscribed && (
          <label
            title={i18n.t("subscribed_description")}
            className={`btn btn-outline-secondary 
            ${this.state.type_ == ListingType.Subscribed && "active"}
            ${UserService.Instance.myUserInfo.isNone() ? "disabled" : "pointer"}
          `}
          >
            <input
              id={`${this.id}-subscribed`}
              type="radio"
              value={ListingType.Subscribed}
              checked={this.state.type_ == ListingType.Subscribed}
              onChange={linkEvent(this, this.handleTypeChange)}
              disabled={UserService.Instance.myUserInfo.isNone()}
            />
            {i18n.t("subscribed")}
          </label>
        )}
        {this.props.showLocal && (
          <label
            title={i18n.t("local_description")}
            className={`pointer btn btn-outline-secondary ${
              this.state.type_ == ListingType.Local && "active"
            }`}
          >
            <input
              id={`${this.id}-local`}
              type="radio"
              value={ListingType.Local}
              checked={this.state.type_ == ListingType.Local}
              onChange={linkEvent(this, this.handleTypeChange)}
            />
            {i18n.t("local")}
          </label>
        )}
        <label
          title={i18n.t("all_description")}
          className={`pointer btn btn-outline-secondary ${
            (this.state.type_ == ListingType.All && "active") ||
            (!this.props.showLocal &&
              this.state.type_ == ListingType.Local &&
              "active")
          }`}
        >
          <input
            id={`${this.id}-all`}
            type="radio"
            value={ListingType.All}
            checked={this.state.type_ == ListingType.All}
            onChange={linkEvent(this, this.handleTypeChange)}
          />
          {i18n.t("all")}
        </label>
      </div>
    );
  }

  handleTypeChange(i: ListingTypeSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
