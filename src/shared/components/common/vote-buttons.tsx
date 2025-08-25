import { calculateUpvotePct, newVote } from "@utils/app";
import { numToSI } from "@utils/helpers";
import { Component, InfernoNode, linkEvent } from "inferno";
import {
  Comment,
  CreateCommentLike,
  CreatePostLike,
  LocalSite,
  LocalUser,
  MyUserInfo,
  PersonId,
  Post,
} from "lemmy-js-client";
import { VoteContentType, VoteType } from "@utils/types";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { tippyMixin } from "../mixins/tippy-mixin";
import classNames from "classnames";

interface VoteButtonsProps {
  voteContentType: VoteContentType;
  id: number;
  onVote: (i: CreateCommentLike | CreatePostLike) => void;
  subject: Post | Comment;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  myVote?: number;
  disabled: boolean;
}

interface VoteButtonsState {
  upvoteLoading: boolean;
  downvoteLoading: boolean;
}

export function showUpvotes(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  type: VoteContentType,
): boolean {
  return enableUpvotes(localSite, type) && (localUser?.show_upvotes ?? true);
}

export function showDownvotes(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  type: VoteContentType,
  creatorId: PersonId,
): boolean {
  const show =
    localUser?.show_downvotes === "Show" ||
    (localUser?.show_downvotes === "ShowForOthers" &&
      localUser?.person_id !== creatorId);
  return enableDownvotes(localSite, type) && show;
}

export function showScore(localUser: LocalUser | undefined): boolean {
  return !localUser || localUser?.show_score || localUser?.show_upvotes;
}

export function showPercentage(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  type: VoteContentType,
): boolean {
  return (
    (localUser?.show_upvote_percentage ?? true) &&
    enableUpvotes(localSite, type) &&
    enableDownvotes(localSite, type)
  );
}

export function enableDownvotes(
  localSite: LocalSite,
  type: VoteContentType,
): boolean {
  if (type === VoteContentType.Comment) {
    return localSite.comment_downvotes !== "Disable";
  } else {
    return localSite.post_downvotes !== "Disable";
  }
}

export function enableUpvotes(
  localSite: LocalSite,
  type: VoteContentType,
): boolean {
  if (type === VoteContentType.Comment) {
    return localSite.comment_upvotes !== "Disable";
  } else {
    return localSite.post_upvotes !== "Disable";
  }
}

function tippy(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  counts: Comment | Post,
  type: VoteContentType,
  creatorId: PersonId,
): string {
  const scoreStr =
    localUser?.show_score &&
    I18NextService.i18n.t("number_of_points", {
      count: Number(counts.score),
      formattedCount: Number(counts.score),
    });

  const pct = calculateUpvotePct(counts.upvotes, counts.downvotes);

  const upvotePctStr =
    showPercentage(localUser, localSite, type) &&
    I18NextService.i18n.t("upvote_percentage", {
      count: Number(pct),
      formattedCount: Number(pct),
    });

  const upvoteStr =
    showUpvotes(localUser, localSite, type) &&
    I18NextService.i18n.t("number_of_upvotes", {
      count: Number(counts.upvotes),
      formattedCount: Number(counts.upvotes),
    });

  const downvoteStr =
    showDownvotes(localUser, localSite, type, creatorId) &&
    I18NextService.i18n.t("number_of_downvotes", {
      count: Number(counts.downvotes),
      formattedCount: Number(counts.downvotes),
    });

  return [scoreStr, upvotePctStr, upvoteStr, downvoteStr]
    .filter(Boolean)
    .join(" · ");
}

function handleUpvote(i: VoteButtons | VoteButtonsCompact) {
  i.setState({ upvoteLoading: true });

  switch (i.props.voteContentType) {
    case VoteContentType.Comment:
      i.props.onVote({
        comment_id: i.props.id,
        score: newVote(VoteType.Upvote, i.props.myVote),
      });
      break;
    case VoteContentType.Post:
    default:
      i.props.onVote({
        post_id: i.props.id,
        score: newVote(VoteType.Upvote, i.props.myVote),
      });
  }
}

function handleDownvote(i: VoteButtons | VoteButtonsCompact) {
  i.setState({ downvoteLoading: true });
  switch (i.props.voteContentType) {
    case VoteContentType.Comment:
      i.props.onVote({
        comment_id: i.props.id,
        score: newVote(VoteType.Downvote, i.props.myVote),
      });
      break;
    case VoteContentType.Post:
    default:
      i.props.onVote({
        post_id: i.props.id,
        score: newVote(VoteType.Downvote, i.props.myVote),
      });
  }
}

@tippyMixin
export class VoteButtonsCompact extends Component<
  VoteButtonsProps,
  VoteButtonsState
> {
  state: VoteButtonsState = {
    upvoteLoading: false,
    downvoteLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: VoteButtonsProps & { children?: InfernoNode },
  ) {
    if (this.props !== nextProps) {
      this.setState({
        upvoteLoading: false,
        downvoteLoading: false,
      });
    }
  }

  render() {
    const localUser = this.props.myUserInfo?.local_user_view.local_user;
    const {
      localSite,
      subject,
      voteContentType,
      subject: { creator_id },
    } = this.props;
    return (
      <>
        {enableUpvotes(localSite, voteContentType) && (
          <button
            type="button"
            className={`btn btn-animate btn-sm btn-link py-0 px-1 ${
              this.props.myVote === 1 ? "text-info" : "text-muted"
            }`}
            data-tippy-content={tippy(
              localUser,
              localSite,
              subject,
              voteContentType,
              creator_id,
            )}
            disabled={this.props.disabled}
            onClick={linkEvent(this, handleUpvote)}
            aria-label={I18NextService.i18n.t("upvote")}
            aria-pressed={this.props.myVote === 1}
          >
            {this.state.upvoteLoading ? (
              <Spinner />
            ) : (
              <>
                <Icon icon="arrow-up1" classes="icon-inline small" />
                {showUpvotes(localUser, localSite, voteContentType) && (
                  <span className="ms-2">
                    {numToSI(this.props.subject.upvotes)}
                  </span>
                )}
              </>
            )}
          </button>
        )}
        {enableDownvotes(localSite, voteContentType) && (
          <button
            type="button"
            className={`ms-2 btn btn-sm btn-link btn-animate btn py-0 px-1 ${
              this.props.myVote === -1 ? "text-danger" : "text-muted"
            }`}
            disabled={this.props.disabled}
            onClick={linkEvent(this, handleDownvote)}
            data-tippy-content={tippy(
              localUser,
              localSite,
              subject,
              voteContentType,
              creator_id,
            )}
            aria-label={I18NextService.i18n.t("downvote")}
            aria-pressed={this.props.myVote === -1}
          >
            {this.state.downvoteLoading ? (
              <Spinner />
            ) : (
              <>
                <Icon icon="arrow-down1" classes="icon-inline small" />
                {showDownvotes(
                  localUser,
                  localSite,
                  voteContentType,
                  creator_id,
                ) && (
                  <span
                    className={classNames("ms-2", {
                      invisible: this.props.subject.downvotes === 0,
                    })}
                  >
                    {numToSI(this.props.subject.downvotes)}
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </>
    );
  }
}

@tippyMixin
export class VoteButtons extends Component<VoteButtonsProps, VoteButtonsState> {
  state: VoteButtonsState = {
    upvoteLoading: false,
    downvoteLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: VoteButtonsProps & { children?: InfernoNode },
  ) {
    if (this.props !== nextProps) {
      this.setState({
        upvoteLoading: false,
        downvoteLoading: false,
      });
    }
  }

  render() {
    const localUser = this.props.myUserInfo?.local_user_view.local_user;
    const {
      localSite,
      subject,
      voteContentType,
      subject: { creator_id },
    } = this.props;
    return (
      <div className="vote-bar small text-center">
        {enableUpvotes(localSite, voteContentType) && (
          <button
            type="button"
            className={`btn-animate btn btn-link p-0 ${
              this.props.myVote === 1 ? "text-info" : "text-muted"
            }`}
            disabled={this.props.disabled}
            onClick={linkEvent(this, handleUpvote)}
            data-tippy-content={tippy(
              localUser,
              localSite,
              subject,
              voteContentType,
              creator_id,
            )}
            aria-label={I18NextService.i18n.t("upvote")}
            aria-pressed={this.props.myVote === 1}
          >
            {this.state.upvoteLoading ? (
              <Spinner />
            ) : (
              <Icon icon="arrow-up1" classes="upvote" />
            )}
          </button>
        )}
        {showScore(localUser) ? (
          <div
            className="unselectable pointer text-muted post-score"
            data-tippy-content={tippy(
              localUser,
              localSite,
              subject,
              voteContentType,
              creator_id,
            )}
          >
            {numToSI(this.props.subject.score)}
          </div>
        ) : (
          <div className="p-1"></div>
        )}
        {enableDownvotes(localSite, voteContentType) && (
          <button
            type="button"
            className={`btn-animate btn btn-link p-0 ${
              this.props.myVote === -1 ? "text-danger" : "text-muted"
            }`}
            disabled={this.props.disabled}
            onClick={linkEvent(this, handleDownvote)}
            data-tippy-content={tippy(
              localUser,
              localSite,
              subject,
              voteContentType,
              creator_id,
            )}
            aria-label={I18NextService.i18n.t("downvote")}
            aria-pressed={this.props.myVote === -1}
          >
            {this.state.downvoteLoading ? (
              <Spinner />
            ) : (
              <Icon icon="arrow-down1" classes="downvote" />
            )}
          </button>
        )}
      </div>
    );
  }
}
