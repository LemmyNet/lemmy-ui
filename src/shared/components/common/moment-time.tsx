import { Component } from "inferno";
import moment from "moment";
import { i18n } from "../../i18next";
import { capitalizeFirstLetter, getLanguages } from "../../utils";
import { Icon } from "./icon";

interface MomentTimeProps {
  data: {
    published?: string;
    when_?: string;
    updated?: string;
  };
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
    let created = this.props.data.published || this.props.data.when_;
    return `
      <div>
        <div>
          ${capitalizeFirstLetter(i18n.t("created"))}: ${this.format(created)}
        </div>
        <div>
          ${capitalizeFirstLetter(i18n.t("modified"))} ${this.format(
      this.props.data.updated
    )}
        </div>
        </div>`;
  }

  render() {
    if (!this.props.ignoreUpdated && this.props.data.updated) {
      return (
        <span
          data-tippy-content={this.createdAndModifiedTimes()}
          data-tippy-allowHtml={true}
          className="font-italics pointer unselectable"
        >
          <Icon icon="edit-2" classes="icon-inline mr-1" />
          {moment.utc(this.props.data.updated).fromNow(!this.props.showAgo)}
        </span>
      );
    } else {
      let created = this.props.data.published || this.props.data.when_;
      return (
        <span
          className="pointer unselectable"
          data-tippy-content={this.format(created)}
        >
          {moment.utc(created).fromNow(!this.props.showAgo)}
        </span>
      );
    }
  }

  format(input: string): string {
    return moment.utc(input).local().format("LLLL");
  }
}
