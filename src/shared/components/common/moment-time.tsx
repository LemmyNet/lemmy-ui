import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import moment from "moment";
import { I18NextService } from "../../services";
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

    moment.locale([...I18NextService.i18n.languages]);
  }

  createdAndModifiedTimes() {
    const updated = this.props.updated;
    let line = `${capitalizeFirstLetter(
      I18NextService.i18n.t("created")
    )}: ${this.format(this.props.published)}`;
    if (updated) {
      line += `\n\n\n${capitalizeFirstLetter(
        I18NextService.i18n.t("modified")
      )} ${this.format(updated)}`;
    }
    return line;
  }

  render() {
    if (!this.props.ignoreUpdated && this.props.updated) {
      return (
        <span
          data-tippy-content={this.createdAndModifiedTimes()}
          className="moment-time font-italics pointer unselectable"
        >
          <Icon icon="edit-2" classes="icon-inline me-1" />
          {moment.utc(this.props.updated).fromNow(!this.props.showAgo)}
        </span>
      );
    } else {
      const published = this.props.published;
      return (
        <span
          className="moment-time pointer unselectable"
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
