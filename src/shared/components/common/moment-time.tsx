import { Option } from "@sniptt/monads";
import { Component } from "inferno";
import moment from "moment";
import { i18n } from "../../i18next";
import { capitalizeFirstLetter, getLanguages } from "../../utils";
import { Icon } from "./icon";

interface MomentTimeProps {
  published: string;
  updated: Option<string>;
  showAgo?: boolean;
  ignoreUpdated?: boolean;
}

export class MomentTime extends Component<MomentTimeProps, any> {
  constructor(props: any, context: any) {
    super(props, context);

    let lang = getLanguages();

    moment.locale(lang);
  }

  createdAndModifiedTimes() {
    return `${capitalizeFirstLetter(i18n.t("created"))}: ${this.format(
      this.props.published
    )}\n\n\n${
      this.props.updated.isSome() && capitalizeFirstLetter(i18n.t("modified"))
    } ${this.format(this.props.updated.unwrap())}`;
  }

  render() {
    if (!this.props.ignoreUpdated && this.props.updated.isSome()) {
      return (
        <span
          data-tippy-content={this.createdAndModifiedTimes()}
          className="font-italics pointer unselectable"
        >
          <Icon icon="edit-2" classes="icon-inline mr-1" />
          {moment.utc(this.props.updated.unwrap()).fromNow(!this.props.showAgo)}
        </span>
      );
    } else {
      let published = this.props.published;
      return (
        <span
          className="pointer unselectable"
          data-tippy-content={this.format(published)}
        >
          {moment.utc(published).fromNow(!this.props.showAgo)}
        </span>
      );
    }
  }

  format(input: string): string {
    return moment.utc(input).local().format("LLLL");
  }
}
