import { numToSI } from "@utils/helpers";
import { Component } from "inferno";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Icon } from "./icon";
import classNames from "classnames";
import { calculateUpvotePct } from "@utils/app";
import getVoteDisplayInfo from "@utils/helpers/get-vote-display-info";

interface Props {
  myVote?: number;
  score: number;
  upvotes: number;
  downvotes: number;
}

const BADGE_CLASSES = "unselectable";
const UPVOTE_PCT_THRESHOLD = 90;

@tippyMixin
export class VoteDisplay extends Component<Props, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { score, upvotes } = this.props;

    const { show_upvotes, show_score, show_upvote_percentage } =
      getVoteDisplayInfo();

    // If the score is the same as the upvotes,
    // and both score and upvotes are enabled,
    // only show the upvotes.
    const hideScore = show_score && show_upvotes && score === upvotes;

    return (
      <div>
        {show_score && !hideScore && this.score()}
        {show_upvote_percentage && this.upvotePct()}
        {this.upvotesAndDownvotes()}
      </div>
    );
  }

  score() {
    const { myVote, score } = this.props;
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
    const { upvotes, downvotes } = this.props;
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
    const { show_upvotes, show_downvotes } = getVoteDisplayInfo();
    const votesCheck = show_upvotes || show_downvotes;
    const downvotesCheck = this.props.downvotes > 0;

    return (
      votesCheck && (
        <span className={BADGE_CLASSES}>
          {show_upvotes && (
            <span className={classNames({ "me-1": downvotesCheck })}>
              {this.upvotes()}
            </span>
          )}
          {show_downvotes && downvotesCheck && this.downvotes()}
          <span className="mx-2">·</span>
        </span>
      )
    );
  }

  upvotes() {
    const { myVote, upvotes } = this.props;
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
    const { myVote, downvotes } = this.props;
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
