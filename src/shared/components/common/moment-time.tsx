import { Component } from "inferno";
import moment from "moment";
import { i18n } from "../../i18next";
import { capitalizeFirstLetter, getLanguages } from "../../utils";
import { Icon } from "./icon";

interface MomentTimeProps {
  published: string;
  updated?: string;
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
    let updated = this.props.updated;
    let line = `${capitalizeFirstLetter(i18n.t("created"))}: ${this.format(
      this.props.published
    )}`;
    if (updated) {
      line += `\n\n\n${capitalizeFirstLetter(i18n.t("modified"))} ${this.format(
        updated
      )}`;
    }
    return line;
  }

  render() {
    if (!this.props.ignoreUpdated && this.props.updated) {
      return (
        <span
          data-tippy-content={this.createdAndModifiedTimes()}
          className="font-italics pointer unselectable"
        >
          <Icon icon="edit-2" classes="icon-inline mr-1" />
          {moment.utc(this.props.updated).fromNow(!this.props.showAgo)}
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
