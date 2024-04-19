import { calculateUpvotePct, newVote, showScores } from "@utils/app";
import { numToSI } from "@utils/helpers";
import { Component, InfernoNode, linkEvent } from "inferno";
import {
  CommentAggregates,
  CreateCommentLike,
  CreatePostLike,
  LocalUserVoteDisplayMode,
  PostAggregates,
} from "lemmy-js-client";
import { VoteContentType, VoteType } from "../../interfaces";
import { I18NextService, UserService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { tippyMixin } from "../mixins/tippy-mixin";
import classNames from "classnames";

interface VoteButtonsProps {
  voteContentType: VoteContentType;
  id: number;
  onVote: (i: CreateCommentLike | CreatePostLike) => void;
  enableDownvotes?: boolean;
  counts: CommentAggregates | PostAggregates;
  voteDisplayMode: LocalUserVoteDisplayMode;
  myVote?: number;
}

interface VoteButtonsState {
  upvoteLoading: boolean;
  downvoteLoading: boolean;
}

function tippy(
  voteDisplayMode: LocalUserVoteDisplayMode,
  counts: CommentAggregates | PostAggregates,
): string {
  const scoreStr =
    voteDisplayMode.score &&
    I18NextService.i18n.t("number_of_points", {
      count: Number(counts.score),
      formattedCount: Number(counts.score),
    });

  const pct = calculateUpvotePct(counts.upvotes, counts.downvotes);

  const upvotePctStr =
    voteDisplayMode.upvote_percentage &&
    I18NextService.i18n.t("upvote_percentage", {
      count: Number(pct),
      formattedCount: Number(pct),
    });

  const upvoteStr =
    voteDisplayMode.upvotes &&
    I18NextService.i18n.t("number_of_upvotes", {
      count: Number(counts.upvotes),
      formattedCount: Number(counts.upvotes),
    });

  const downvoteStr =
    voteDisplayMode.downvotes &&
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
    return (
      <>
        <button
          type="button"
          className={`btn btn-animate btn-sm btn-link py-0 px-1 ${
            this.props.myVote === 1 ? "text-info" : "text-muted"
          }`}
          data-tippy-content={tippy(
            this.props.voteDisplayMode,
            this.props.counts,
          )}
          disabled={!UserService.Instance.myUserInfo}
          onClick={linkEvent(this, handleUpvote)}
          aria-label={I18NextService.i18n.t("upvote")}
          aria-pressed={this.props.myVote === 1}
        >
          {this.state.upvoteLoading ? (
            <Spinner />
          ) : (
            <>
              <Icon icon="arrow-up1" classes="icon-inline small" />
              {showScores() &&
                this.props.voteContentType === VoteContentType.Post && (
                  <span className="ms-2">
                    {numToSI(this.props.counts.upvotes)}
                  </span>
                )}
            </>
          )}
        </button>
        {this.props.enableDownvotes && (
          <button
            type="button"
            className={`ms-2 btn btn-sm btn-link btn-animate btn py-0 px-1 ${
              this.props.myVote === -1 ? "text-danger" : "text-muted"
            }`}
            disabled={!UserService.Instance.myUserInfo}
            onClick={linkEvent(this, handleDownvote)}
            data-tippy-content={tippy(
              this.props.voteDisplayMode,
              this.props.counts,
            )}
            aria-label={I18NextService.i18n.t("downvote")}
            aria-pressed={this.props.myVote === -1}
          >
            {this.state.downvoteLoading ? (
              <Spinner />
            ) : (
              <>
                <Icon icon="arrow-down1" classes="icon-inline small" />
                {showScores() &&
                  this.props.voteContentType === VoteContentType.Post && (
                    <span
                      className={classNames("ms-2", {
                        invisible: this.props.counts.downvotes === 0,
                      })}
                    >
                      {numToSI(this.props.counts.downvotes)}
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
    return (
      <div className="vote-bar small text-center">
        <button
          type="button"
          className={`btn-animate btn btn-link p-0 ${
            this.props.myVote === 1 ? "text-info" : "text-muted"
          }`}
          disabled={!UserService.Instance.myUserInfo}
          onClick={linkEvent(this, handleUpvote)}
          data-tippy-content={tippy(
            this.props.voteDisplayMode,
            this.props.counts,
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
        {showScores() ? (
          <div
            className="unselectable pointer text-muted post-score"
            data-tippy-content={tippy(
              this.props.voteDisplayMode,
              this.props.counts,
            )}
          >
            {numToSI(this.props.counts.score)}
          </div>
        ) : (
          <div className="p-1"></div>
        )}
        {this.props.enableDownvotes && (
          <button
            type="button"
            className={`btn-animate btn btn-link p-0 ${
              this.props.myVote === -1 ? "text-danger" : "text-muted"
            }`}
            disabled={!UserService.Instance.myUserInfo}
            onClick={linkEvent(this, handleDownvote)}
            data-tippy-content={tippy(
              this.props.voteDisplayMode,
              this.props.counts,
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
