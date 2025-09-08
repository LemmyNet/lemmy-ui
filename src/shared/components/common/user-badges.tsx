import classNames from "classnames";
import { Component } from "inferno";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { MyUserInfo, Person, PersonActions } from "lemmy-js-client";
import { isWeekOld } from "@utils/date";

interface UserBadgesProps {
  isBanned?: boolean;
  isBannedFromCommunity?: boolean;
  isPostCreator?: boolean;
  isModerator?: boolean;
  isAdmin?: boolean;
  creator: Person;
  myUserInfo?: MyUserInfo;
  personActions?: PersonActions;
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
    const isBot = this.props.creator?.bot_account;
    const isDeleted = this.props.creator?.deleted;
    const isNewAccount = !isWeekOld(new Date(this.props.creator.published_at));

    const localUserView = this.props.myUserInfo?.local_user_view;
    // Only show the person votes if:
    const showPersonVotes =
      // the setting is turned on,
      localUserView?.local_user.show_person_votes &&
      // for other users,
      localUserView.person?.id !== this.props.creator?.id &&
      // and theres at least one up or downvote
      (this.props.personActions?.upvotes ||
        this.props.personActions?.downvotes);

    const personNote = this.props.personActions?.note;

    return (
      (this.props.isBanned ||
        this.props.isBannedFromCommunity ||
        isDeleted ||
        this.props.isPostCreator ||
        this.props.isModerator ||
        this.props.isAdmin ||
        isBot ||
        isNewAccount ||
        showPersonVotes ||
        personNote) && (
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
          {showPersonVotes && (
            <span className="col">
              {getRoleLabelPill({
                label: personVotesLabel(this.props.personActions),
                tooltip: I18NextService.i18n.t("vote_totals_for_user"),
                classes: "text-info border border-info",
                shrink: false,
              })}
            </span>
          )}
          {personNote && (
            <span className="col">
              {getRoleLabelPill({
                label: personNote,
                tooltip: I18NextService.i18n.t("note_for_user"),
                classes: "text-info border border-info",
                shrink: false,
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

function personVotesLabel(personActions?: PersonActions): string {
  const upvotes = personActions?.upvotes ?? 0;
  const downvotes = personActions?.downvotes ?? 0;
  return `+${upvotes} -${downvotes}`;
}
