import { randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { ListingType } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";

interface ListingTypeSelectProps {
  type_: ListingType;
  showLocal: boolean;
  showSubscribed: boolean;
  onChange(val: ListingType): void;
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
    props: ListingTypeSelectProps
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
              checked={this.state.type_ == "Subscribed"}
              onChange={linkEvent(this, this.handleTypeChange)}
              disabled={!UserService.Instance.myUserInfo}
            />
            <label
              htmlFor={`${this.id}-subscribed`}
              title={I18NextService.i18n.t("subscribed_description")}
              className={`btn btn-outline-secondary 
              ${this.state.type_ == "Subscribed" && "active"}
              ${!UserService.Instance.myUserInfo ? "disabled" : "pointer"}
            `}
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
              checked={this.state.type_ == "Local"}
              onChange={linkEvent(this, this.handleTypeChange)}
            />
            <label
              htmlFor={`${this.id}-local`}
              title={I18NextService.i18n.t("local_description")}
              className={`pointer btn btn-outline-secondary ${
                this.state.type_ == "Local" && "active"
              }`}
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
          checked={this.state.type_ == "All"}
          onChange={linkEvent(this, this.handleTypeChange)}
        />
        <label
          title={I18NextService.i18n.t("all_description")}
          htmlFor={`${this.id}-all`}
          className={`pointer btn btn-outline-secondary ${
            (this.state.type_ == "All" && "active") ||
            (!this.props.showLocal && this.state.type_ == "Local" && "active")
          }`}
        >
          {I18NextService.i18n.t("all")}
        </label>
      </div>
    );
  }

  handleTypeChange(i: ListingTypeSelect, event: any) {
    i.props.onChange(event.target.value);
  }
}
