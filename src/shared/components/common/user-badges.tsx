import classNames from "classnames";
import { Component } from "inferno";
import { I18NextService } from "../../services";

interface UserBadgesProps {
  isBanned?: boolean;
  isDeleted?: boolean;
  isPostCreator?: boolean;
  isMod?: boolean;
  isAdmin?: boolean;
  isBot?: boolean;
  classNames?: string;
}

export function getRoleLabelPill({
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

export class UserBadges extends Component<UserBadgesProps> {
  render() {
    return (
      (this.props.isBanned ||
        this.props.isPostCreator ||
        this.props.isMod ||
        this.props.isAdmin ||
        this.props.isBot) && (
        <span
          className={classNames(
            "row d-inline-flex gx-1",
            this.props.classNames
          )}
        >
          {this.props.isBanned && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("banned"),
                tooltip: I18NextService.i18n.t("banned"),
                classes: "text-bg-danger",
                shrink: false,
              })}
            </span>
          )}
          {this.props.isDeleted && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("deleted"),
                tooltip: I18NextService.i18n.t("deleted"),
                classes: "text-bg-danger",
                shrink: false,
              })}
            </span>
          )}

          {this.props.isPostCreator && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("op").toUpperCase(),
                tooltip: I18NextService.i18n.t("creator"),
                classes: "text-bg-info",
                shrink: false,
              })}
            </span>
          )}
          {this.props.isMod && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("mod"),
                tooltip: I18NextService.i18n.t("mod"),
                classes: "text-bg-primary",
              })}
            </span>
          )}
          {this.props.isAdmin && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("admin"),
                tooltip: I18NextService.i18n.t("admin"),
                classes: "text-bg-danger",
              })}
            </span>
          )}
          {this.props.isBot && (
            <span className="col">
              {getRoleLabelPill({
                label: I18NextService.i18n.t("bot_account").toLowerCase(),
                tooltip: I18NextService.i18n.t("bot_account"),
              })}
            </span>
          )}
        </span>
      )
    );
  }
}
