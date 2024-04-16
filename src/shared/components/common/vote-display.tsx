import { numToSI } from "@utils/helpers";
import { Component } from "inferno";
import {
  CommentAggregates,
  LocalUserVoteDisplayMode,
  PostAggregates,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Icon } from "./icon";
import classNames from "classnames";
import { calculateUpvotePct } from "@utils/app";

interface Props {
  voteDisplayMode: LocalUserVoteDisplayMode;
  counts: CommentAggregates | PostAggregates;
  myVote?: number;
}

const BADGE_CLASSES = "unselectable";
const UPVOTE_PCT_THRESHOLD = 90;

@tippyMixin
export class VoteDisplay extends Component<Props, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const {
      voteDisplayMode,
      counts: { score, upvotes },
    } = this.props;

    // If the score is the same as the upvotes,
    // and both score and upvotes are enabled,
    // only show the upvotes.
    const hideScore =
      voteDisplayMode.score && voteDisplayMode.upvotes && score === upvotes;

    return (
      <div>
        {voteDisplayMode.score && !hideScore && this.score()}
        {voteDisplayMode.upvote_percentage && this.upvotePct()}
        {this.upvotesAndDownvotes()}
      </div>
    );
  }

  score() {
    const {
      myVote,
      counts: { score },
    } = this.props;
    const scoreStr = numToSI(score);

    const scoreTippy = I18NextService.i18n.t("number_of_points", {
      count: Number(score),
      formattedCount: scoreStr,
    });

    return (
      <span
        className={`${BADGE_CLASSES} ${scoreColor(myVote)}`}
        aria-label={scoreTippy}
        data-tippy-content={scoreTippy}
      >
        <Icon icon="heart" classes="me-1 icon-inline small" />
        {scoreStr}
        <span className="mx-2">·</span>
      </span>
    );
  }

  upvotePct() {
    const { upvotes, downvotes } = this.props.counts;
    const pct = calculateUpvotePct(upvotes, downvotes);
    const pctStr = `${pct.toFixed(0)}%`;

    const thresholdCheck = pct < UPVOTE_PCT_THRESHOLD;

    const upvotesPctTippy = I18NextService.i18n.t("upvote_percentage", {
      count: Number(pct),
      formattedCount: Number(pct),
    });

    return (
      thresholdCheck && (
        <span
          className={BADGE_CLASSES}
          aria-label={upvotesPctTippy}
          data-tippy-content={upvotesPctTippy}
        >
          <Icon icon="smile" classes="me-1 icon-inline small" />
          {pctStr}
          <span className="mx-2">·</span>
        </span>
      )
    );
  }

  // A special case since they are both wrapped in a badge
  upvotesAndDownvotes() {
    const voteDisplayMode = this.props.voteDisplayMode;
    const votesCheck = voteDisplayMode.upvotes || voteDisplayMode.downvotes;
    const downvotesCheck = this.props.counts.downvotes > 0;

    return (
      votesCheck && (
        <span className={BADGE_CLASSES}>
          {voteDisplayMode.upvotes && (
            <span className={classNames({ "me-1": downvotesCheck })}>
              {this.upvotes()}
            </span>
          )}
          {voteDisplayMode.downvotes && downvotesCheck && this.downvotes()}
          <span className="mx-2">·</span>
        </span>
      )
    );
  }

  upvotes() {
    const {
      myVote,
      counts: { upvotes },
    } = this.props;
    const upvotesStr = numToSI(upvotes);

    const upvotesTippy = I18NextService.i18n.t("number_of_upvotes", {
      count: Number(upvotes),
      formattedCount: upvotesStr,
    });

    return (
      <span
        className={classNames({
          "text-info": myVote === 1,
        })}
        aria-label={upvotesTippy}
        data-tippy-content={upvotesTippy}
      >
        <Icon icon="arrow-up" classes="me-1 icon-inline small" />
        {upvotesStr}
      </span>
    );
  }

  downvotes() {
    const {
      myVote,
      counts: { downvotes },
    } = this.props;
    const downvotesStr = numToSI(downvotes);

    const downvotesTippy = I18NextService.i18n.t("number_of_downvotes", {
      count: Number(downvotes),
      formattedCount: downvotesStr,
    });

    return (
      <span
        className={classNames({
          "text-danger": myVote === -1,
        })}
        aria-label={downvotesTippy}
        data-tippy-content={downvotesTippy}
      >
        <Icon icon="arrow-down" classes="me-1 icon-inline small" />
        {downvotesStr}
      </span>
    );
  }
}

function scoreColor(myVote?: number): string {
  if (myVote === 1) {
    return "text-info";
  } else if (myVote === -1) {
    return "text-danger";
  } else {
    return "text-muted";
  }
}
