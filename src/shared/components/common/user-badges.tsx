import classNames from "classnames";
import { Component } from "inferno";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { MyUserInfo, Person, PersonActions } from "lemmy-js-client";
import { isWeekOld } from "@utils/date";
import { numToSI } from "@utils/helpers";
import { Icon } from "./icon";

interface UserBadgesProps {
  isBanned?: boolean;
  isBannedFromCommunity?: boolean;
  isModerator?: boolean;
  isAdmin?: boolean;
  creator: Person;
  myUserInfo?: MyUserInfo;
  personActions?: PersonActions;
  classNames?: string;
  showCounts?: boolean;
}

export function RoleLabelPill({
  label,
  tooltip,
  classes,
}: {
  label: string;
  tooltip?: string;
  classes?: string;
}) {
  return (
    <span
      className={`badge ${classes ?? "text-bg-light"}`}
      aria-label={tooltip}
      data-tippy-content={tooltip}
    >
      {label}
    </span>
  );
}

function RoleLabelIcon({
  icon,
  tooltip,
  classes,
}: {
  icon: string;
  tooltip?: string;
  classes?: string;
}) {
  return (
    <span aria-label={tooltip} data-tippy-content={tooltip}>
      <Icon icon={icon} classes={classes} />
    </span>
  );
}

@tippyMixin
export class UserBadges extends Component<UserBadgesProps> {
  render() {
    const isBot = this.props.creator?.bot_account;
    const isDeleted = this.props.creator?.deleted;
    const isNewAccount = !isWeekOld(new Date(this.props.creator.published_at));
    const showCounts = this.props.showCounts ?? false;

    const localUserView = this.props.myUserInfo?.local_user_view;
    // Only show the person votes if:
    const showPersonVotes =
      // the setting is turned on,
      localUserView?.local_user.show_person_votes &&
      // for other users,
      localUserView.person?.id !== this.props.creator?.id &&
      // and theres at least one up or downvote
      (this.props.personActions?.upvotes !== 0 ||
        this.props.personActions?.downvotes !== 0);

    const personNote = this.props.personActions?.note;

    return (
      (this.props.isBanned ||
        this.props.isBannedFromCommunity ||
        isDeleted ||
        this.props.isModerator ||
        this.props.isAdmin ||
        isBot ||
        isNewAccount ||
        showCounts ||
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
              <RoleLabelPill
                label={I18NextService.i18n.t("banned")}
                tooltip={I18NextService.i18n.t("banned")}
                classes="badge text-bg-danger"
              />
            </span>
          )}
          {this.props.isBannedFromCommunity && (
            <span className="col">
              <RoleLabelPill
                label={I18NextService.i18n.t("banned_from_community_badge")}
                tooltip={I18NextService.i18n.t("banned_from_community_badge")}
                classes="badge text-bg-danger"
              />
            </span>
          )}
          {isDeleted && (
            <span className="col">
              <RoleLabelPill
                label={I18NextService.i18n.t("deleted")}
                tooltip={I18NextService.i18n.t("deleted")}
              />
            </span>
          )}

          {this.props.isModerator && (
            <span className="col">
              <RoleLabelIcon
                icon="shield"
                tooltip={I18NextService.i18n.t("mod")}
                classes="text-primary"
              />
            </span>
          )}
          {this.props.isAdmin && (
            <span className="col">
              <RoleLabelIcon
                icon="shield"
                tooltip={I18NextService.i18n.t("admin")}
                classes="text-danger"
              />
            </span>
          )}
          {isBot && (
            <span className="col">
              <RoleLabelPill
                label={I18NextService.i18n.t("bot_account").toLowerCase()}
                tooltip={I18NextService.i18n.t("bot_account")}
              />
            </span>
          )}
          {showPersonVotes && (
            <span className="col">
              <RoleLabelPill
                label={personVotesLabel(this.props.personActions)}
                tooltip={I18NextService.i18n.t("vote_totals_for_user")}
              />
            </span>
          )}
          {personNote && (
            <span className="col">
              <RoleLabelPill
                label={personNote}
                tooltip={I18NextService.i18n.t("note_for_user")}
              />
            </span>
          )}
          {isNewAccount && (
            <span className="col">
              <RoleLabelIcon
                icon="user-plus"
                tooltip={I18NextService.i18n.t("new_account_label")}
                classes="text-muted"
              />
            </span>
          )}
          {showCounts && (
            <>
              <span className="col">
                <RoleLabelPill
                  label={I18NextService.i18n.t("number_of_posts", {
                    count: Number(this.props.creator.post_count),
                    formattedCount: numToSI(this.props.creator.post_count),
                  })}
                  classes="list-inline-item badge text-bg-light"
                />
              </span>
              <span className="col">
                <RoleLabelPill
                  label={I18NextService.i18n.t("number_of_comments", {
                    count: Number(this.props.creator.comment_count),
                    formattedCount: numToSI(this.props.creator.comment_count),
                  })}
                  classes="list-inline-item badge text-bg-light"
                />
              </span>
            </>
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
