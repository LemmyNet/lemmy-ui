import { capitalizeFirstLetter, formatPastDate } from "@utils/helpers";
import format from "date-fns/format";
import parseISO from "date-fns/parseISO";
import { Component } from "inferno";
import { I18NextService } from "../../services";
import { Icon } from "./icon";

interface MomentTimeProps {
  published: string;
  updated?: string;
  showAgo?: boolean;
  ignoreUpdated?: boolean;
}

function formatDate(input: string) {
  return format(parseISO(input), "PPPPpppp");
}

export class MomentTime extends Component<MomentTimeProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  createdAndModifiedTimes() {
    const updated = this.props.updated;
    let line = `${capitalizeFirstLetter(
      I18NextService.i18n.t("created")
    )}: ${formatDate(this.props.published)}`;
    if (updated) {
      line += `\n\n\n${capitalizeFirstLetter(
        I18NextService.i18n.t("modified")
      )} ${formatDate(updated)}`;
    }
    return line;
  }

  render() {
    if (!this.props.ignoreUpdated && this.props.updated) {
      return (
        <span
          data-tippy-content={this.createdAndModifiedTimes()}
          className="moment-time fst-italics pointer unselectable"
        >
          <Icon icon="edit-2" classes="icon-inline me-1" />
          {formatPastDate(this.props.updated)}
        </span>
      );
    } else {
      const published = this.props.published;
      return (
        <span
          className="moment-time pointer unselectable"
          data-tippy-content={formatDate(published)}
        >
          {formatPastDate(published)}
        </span>
      );
    }
  }
}
