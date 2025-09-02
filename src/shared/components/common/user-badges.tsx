import classNames from "classnames";
import { Component } from "inferno";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Person } from "lemmy-js-client";

interface UserBadgesProps {
  isBanned?: boolean;
  isBannedFromCommunity?: boolean;
  isPostCreator?: boolean;
  isModerator?: boolean;
  isAdmin?: boolean;
  person?: Person;
  classNames?: string;
}

function getRoleLabelPill({
  label,
  tooltip,
  classes,
  shrink = true,
}: {
  label: string;
  tooltip: string;
  classes?: string;
  shrink?: boolean;
}) {
  return (
    <span
      className={`badge ${classes ?? "text-bg-light"}`}
      aria-label={tooltip}
      data-tippy-content={tooltip}
    >
      {shrink ? label[0].toUpperCase() : label}
    </span>
  );
}

@tippyMixin
export class UserBadges extends Component<UserBadgesProps> {
  render() {
    const isBot = this.props.person?.bot_account;
    const isDeleted = this.props.person?.deleted;
    var isNewAccount = false;
    if (this.props.person !== undefined) {
      // 7 days ago
      // https://stackoverflow.com/a/563442
      var date = new Date();
      date.setDate(date.getDate() - 7);
      isNewAccount = new Date(this.props.person?.published_at) > date;
    }

    return (
      (this.props.isBanned ||
        this.props.isBannedFromCommunity ||
        isDeleted ||
        this.props.isPostCreator ||
        this.props.isModerator ||
        this.props.isAdmin ||
        isBot ||
        isNewAccount) && (
        <span
          className={classNames(
            "row d-inline-flex gx-1",
            this.props.classNames,
          )}
        >
          {this.props.isBanned && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("banned"),
                tooltip: I18NextService.i18n.t("banned"),
                classes: "text-danger border border-danger",
                shrink: false,
              })}
            </span>
          )}
          {this.props.isBannedFromCommunity && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("banned_from_community_badge"),
                tooltip: I18NextService.i18n.t("banned_from_community_badge"),
                classes: "text-danger border border-danger",
                shrink: false,
              })}
            </span>
          )}
          {isDeleted && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("deleted"),
                tooltip: I18NextService.i18n.t("deleted"),
                classes: "text-info border border-info",
                shrink: false,
              })}
            </span>
          )}

          {this.props.isPostCreator && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("op").toUpperCase(),
                tooltip: I18NextService.i18n.t("creator"),
                classes: "text-info border border-info",
                shrink: false,
              })}
            </span>
          )}
          {this.props.isModerator && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("mod"),
                tooltip: I18NextService.i18n.t("mod"),
                classes: "text-primary border border-primary",
              })}
            </span>
          )}
          {this.props.isAdmin && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("admin"),
                tooltip: I18NextService.i18n.t("admin"),
                classes: "text-danger border border-danger",
              })}
            </span>
          )}
          {isBot && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("bot_account").toLowerCase(),
                tooltip: I18NextService.i18n.t("bot_account"),
              })}
            </span>
          )}
          {isNewAccount && (
            <span
              className="col"
              aria-label={I18NextService.i18n.t("new_account_label")}
              data-tippy-content={I18NextService.i18n.t("new_account_label")}
            >
              🌱
            </span>
          )}
        </span>
      )
    );
  }
}
