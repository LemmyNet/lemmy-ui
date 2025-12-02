import { calculateUpvotePct, newVoteIsUpvote } from "@utils/app";
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
import { PostOrCommentType } from "@utils/types";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { tippyMixin } from "../mixins/tippy-mixin";
import classNames from "classnames";

const UPVOTE_PCT_THRESHOLD = 90;

interface VoteButtonsProps {
  voteContentType: PostOrCommentType;
  id: number;
  onVote: (i: CreateCommentLike | CreatePostLike) => void;
  subject: Post | Comment;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  myVoteIsUpvote?: boolean;
  disabled: boolean;
}

interface VoteButtonsState {
  upvoteLoading: boolean;
  downvoteLoading: boolean;
}

function showUpvotes(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  type: PostOrCommentType,
): boolean {
  return enableUpvotes(localSite, type) && (localUser?.show_upvotes ?? true);
}

function showDownvotes(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  type: PostOrCommentType,
  creatorId: PersonId,
): boolean {
  const show =
    localUser?.show_downvotes === "show" ||
    (localUser?.show_downvotes === "show_for_others" &&
      localUser?.person_id !== creatorId);
  return enableDownvotes(localSite, type) && show;
}

function showScore(localUser: LocalUser | undefined): boolean {
  return !localUser || localUser?.show_score;
}

function showPercentage(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  type: PostOrCommentType,
): boolean {
  return (
    (localUser?.show_upvote_percentage ?? true) &&
    enableUpvotes(localSite, type) &&
    enableDownvotes(localSite, type)
  );
}

function enableDownvotes(
  localSite: LocalSite,
  type: PostOrCommentType,
): boolean {
  if (type === "comment") {
    return localSite.comment_downvotes !== "disable";
  } else {
    return localSite.post_downvotes !== "disable";
  }
}

function enableUpvotes(localSite: LocalSite, type: PostOrCommentType): boolean {
  if (type === "comment") {
    return localSite.comment_upvotes !== "disable";
  } else {
    return localSite.post_upvotes !== "disable";
  }
}

function tippy(
  localUser: LocalUser | undefined,
  localSite: LocalSite,
  counts: Comment | Post,
  type: PostOrCommentType,
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
    case "comment":
      i.props.onVote({
        comment_id: i.props.id,
        is_upvote: newVoteIsUpvote("upvote", i.props.myVoteIsUpvote),
      });
      break;
    case "post":
    default:
      i.props.onVote({
        post_id: i.props.id,
        is_upvote: newVoteIsUpvote("upvote", i.props.myVoteIsUpvote),
      });
  }
}

function handleDownvote(i: VoteButtons | VoteButtonsCompact) {
  i.setState({ downvoteLoading: true });
  switch (i.props.voteContentType) {
    case "comment":
      i.props.onVote({
        comment_id: i.props.id,
        is_upvote: newVoteIsUpvote("downvote", i.props.myVoteIsUpvote),
      });
      break;
    case "post":
    default:
      i.props.onVote({
        post_id: i.props.id,
        is_upvote: newVoteIsUpvote("downvote", i.props.myVoteIsUpvote),
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
      subject: { upvotes, score },
      voteContentType,
      subject: { creator_id },
      subject,
    } = this.props;

    const noDownvotes = this.props.subject.downvotes === 0;

    const showScore_ = showScore(localUser);
    const showUpvotes_ = showUpvotes(localUser, localSite, voteContentType);
    const showPct = showPercentage(localUser, localSite, voteContentType);

    // If the score is the same as the upvotes,
    // and both score and upvotes are enabled,
    // only show the upvotes.
    const hideScore = !showScore_ || (showUpvotes_ && score === upvotes);

    return (
      <>
        {showScore_ && !hideScore && (
          <Score myVoteIsUpvote={this.props.myVoteIsUpvote} score={score} />
        )}
        {showPct && <UpvotePct subject={subject} />}
        {enableUpvotes(localSite, voteContentType) && (
          <button
            type="button"
            className={`btn btn-animate btn-sm btn-link py-0 px-1 ${
              this.props.myVoteIsUpvote === true ? "text-primary" : "text-muted"
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
            aria-pressed={this.props.myVoteIsUpvote === true}
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
              this.props.myVoteIsUpvote === false ? "text-danger" : "text-muted"
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
            aria-pressed={this.props.myVoteIsUpvote === false}
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
                ) &&
                  !noDownvotes && (
                    <span className="ms-2">
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
              this.props.myVoteIsUpvote === true ? "text-primary" : "text-muted"
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
            aria-pressed={this.props.myVoteIsUpvote === true}
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
              this.props.myVoteIsUpvote === false ? "text-danger" : "text-muted"
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
            aria-pressed={this.props.myVoteIsUpvote === false}
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

type ScoreProps = {
  myVoteIsUpvote?: boolean;
  score: number;
};
function Score({ myVoteIsUpvote, score }: ScoreProps) {
  const scoreStr = numToSI(score);

  const scoreTippy = I18NextService.i18n.t("number_of_points", {
    count: Number(score),
    formattedCount: scoreStr,
  });

  return (
    <button
      className={classNames(
        "btn btn-animate btn-sm btn-link py-0 px-1",
        scoreColor(myVoteIsUpvote),
      )}
      aria-label={scoreTippy}
      data-tippy-content={scoreTippy}
    >
      <Icon icon="heart" classes="me-1 icon-inline small" />
      {scoreStr}
    </button>
  );
}

type UpvotePctProps = {
  subject: Post | Comment;
};
function UpvotePct(props: UpvotePctProps) {
  const { upvotes, downvotes } = props.subject;
  const pct = calculateUpvotePct(upvotes, downvotes);
  const pctStr = `${pct.toFixed(0)}%`;

  const thresholdCheck = pct < UPVOTE_PCT_THRESHOLD;

  const upvotesPctTippy = I18NextService.i18n.t("upvote_percentage", {
    count: Number(pct),
    formattedCount: Number(pct),
  });

  return (
    thresholdCheck && (
      <button
        className={"btn btn-animate btn-sm btn-link py-0 px-1"}
        aria-label={upvotesPctTippy}
        data-tippy-content={upvotesPctTippy}
      >
        <Icon icon="smile" classes="me-1 icon-inline small" />
        {pctStr}
      </button>
    )
  );
}

function scoreColor(myVoteIsUpvote: boolean | undefined): string {
  if (myVoteIsUpvote === true) {
    return "text-info";
  } else if (myVoteIsUpvote === false) {
    return "text-danger";
  } else {
    return "text-muted";
  }
}
