import { capitalizeFirstLetter } from "@utils/helpers";
import { formatRelativeDate } from "@utils/date";
import { addMinutes, format, isBefore, parseISO } from "date-fns";
import { Component } from "inferno";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { tippyMixin } from "../mixins/tippy-mixin";

interface MomentTimeProps {
  published: string;
  updated?: string;
  showAgo?: boolean;
  ignoreUpdated?: boolean;
}

function formatDate(input: string) {
  const parsed = parseISO(input + "Z");
  return format(parsed, "PPPPpppp");
}

@tippyMixin
export class MomentTime extends Component<MomentTimeProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  createdAndModifiedTimes() {
    const updated = this.updatedTime;
    let line = `${capitalizeFirstLetter(
      I18NextService.i18n.t("created"),
    )}: ${formatDate(this.props.published)}`;
    if (updated) {
      line += `\n\n\n${capitalizeFirstLetter(
        I18NextService.i18n.t("modified"),
      )} ${formatDate(updated)}`;
    }
    return line;
  }

  isRecentlyUpdated(): boolean {
    if (this.props.updated) {
      const published = new Date(this.props.published);
      const updated = new Date(this.props.updated);
      const updateLimit = addMinutes(published, 5);
      return isBefore(updated, updateLimit);
    } else {
      return false;
    }
  }

  get updatedTime(): string | undefined {
    if (!this.isRecentlyUpdated()) {
      return this.props.updated;
    } else {
      return;
    }
  }

  render() {
    if (!this.props.ignoreUpdated && this.updatedTime) {
      return (
        <span
          data-tippy-content={this.createdAndModifiedTimes()}
          className="moment-time fst-italic pointer unselectable"
        >
          <Icon icon="edit-2" classes="icon-inline me-1" />
          {formatRelativeDate(this.updatedTime, this.props.showAgo)}
        </span>
      );
    } else {
      const published = this.props.published;
      return (
        <span
          className="moment-time pointer unselectable"
          data-tippy-content={formatDate(published)}
        >
          {formatRelativeDate(published, this.props.showAgo)}
        </span>
      );
    }
  }
}
