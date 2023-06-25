import { myAuthRequired, newVote, showScores } from "@utils/app";
import { numToSI } from "@utils/helpers";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import {
  CommentAggregates,
  CreateCommentLike,
  CreatePostLike,
  PostAggregates,
} from "lemmy-js-client";
import { VoteContentType, VoteType } from "../../interfaces";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";

interface VoteButtonsProps {
  voteContentType: VoteContentType;
  id: number;
  onVote: (i: CreateCommentLike | CreatePostLike) => void;
  enableDownvotes?: boolean;
  counts: CommentAggregates | PostAggregates;
  my_vote?: number;
}

interface VoteButtonsState {
  upvoteLoading: boolean;
  downvoteLoading: boolean;
}

const tippy = (counts: CommentAggregates | PostAggregates): string => {
  const points = I18NextService.i18n.t("number_of_points", {
    count: Number(counts.score),
    formattedCount: Number(counts.score),
  });

  const upvotes = I18NextService.i18n.t("number_of_upvotes", {
    count: Number(counts.upvotes),
    formattedCount: Number(counts.upvotes),
  });

  const downvotes = I18NextService.i18n.t("number_of_downvotes", {
    count: Number(counts.downvotes),
    formattedCount: Number(counts.downvotes),
  });

  return `${points} • ${upvotes} • ${downvotes}`;
};

const handleUpvote = (i: VoteButtons) => {
  i.setState({ upvoteLoading: true });

  switch (i.props.voteContentType) {
    case VoteContentType.Comment:
      i.props.onVote({
        comment_id: i.props.id,
        score: newVote(VoteType.Upvote, i.props.my_vote),
        auth: myAuthRequired(),
      });
      break;
    case VoteContentType.Post:
    default:
      i.props.onVote({
        post_id: i.props.id,
        score: newVote(VoteType.Upvote, i.props.my_vote),
        auth: myAuthRequired(),
      });
  }

  i.setState({ upvoteLoading: false });
};

const handleDownvote = (i: VoteButtons) => {
  i.setState({ downvoteLoading: true });
  switch (i.props.voteContentType) {
    case VoteContentType.Comment:
      i.props.onVote({
        comment_id: i.props.id,
        score: newVote(VoteType.Downvote, i.props.my_vote),
        auth: myAuthRequired(),
      });
      break;
    case VoteContentType.Post:
    default:
      i.props.onVote({
        post_id: i.props.id,
        score: newVote(VoteType.Downvote, i.props.my_vote),
        auth: myAuthRequired(),
      });
  }
  i.setState({ downvoteLoading: false });
};

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

  render() {
    return (
      <div>
        <button
          type="button"
          className={`btn-animate btn py-0 px-1 ${
            this.props.my_vote === 1 ? "text-info" : "text-muted"
          }`}
          data-tippy-content={tippy(this.props.counts)}
          onClick={linkEvent(this, handleUpvote)}
          aria-label={I18NextService.i18n.t("upvote")}
          aria-pressed={this.props.my_vote === 1}
        >
          {this.state.upvoteLoading ? (
            <Spinner />
          ) : (
            <>
              <Icon icon="arrow-up1" classes="icon-inline small" />
              {showScores() && (
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
            className={`ms-2 btn-animate btn py-0 px-1 ${
              this.props.my_vote === -1 ? "text-danger" : "text-muted"
            }`}
            onClick={linkEvent(this, handleDownvote)}
            data-tippy-content={tippy(this.props.counts)}
            aria-label={I18NextService.i18n.t("downvote")}
            aria-pressed={this.props.my_vote === -1}
          >
            {this.state.downvoteLoading ? (
              <Spinner />
            ) : (
              <>
                <Icon icon="arrow-down1" classes="icon-inline small" />
                {showScores() && (
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
      </div>
    );
  }
}

export class VoteButtons extends Component<VoteButtonsProps, VoteButtonsState> {
  state: VoteButtonsState = {
    upvoteLoading: false,
    downvoteLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div
        className={`vote-bar col-1 pe-0 small text-center d-flex flex-column justify-content-center`}
      >
        <button
          type="button"
          className={`btn-animate btn btn-link p-0 ${
            this.props.my_vote == 1 ? "text-info" : "text-muted"
          }`}
          onClick={linkEvent(this, handleUpvote)}
          data-tippy-content={I18NextService.i18n.t("upvote")}
          aria-label={I18NextService.i18n.t("upvote")}
          aria-pressed={this.props.my_vote === 1}
        >
          {this.state.upvoteLoading ? (
            <Spinner />
          ) : (
            <Icon icon="arrow-up1" classes="upvote" />
          )}
        </button>
        {showScores() ? (
          <div
            className={`unselectable pointer text-muted px-1 post-score`}
            data-tippy-content={tippy(this.props.counts)}
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
              this.props.my_vote == -1 ? "text-danger" : "text-muted"
            }`}
            onClick={linkEvent(this, handleDownvote)}
            data-tippy-content={I18NextService.i18n.t("downvote")}
            aria-label={I18NextService.i18n.t("downvote")}
            aria-pressed={this.props.my_vote === -1}
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
