import { Component, InfernoNode } from "inferno";
import {
  ApproveCommunityPendingFollower,
  MyUserInfo,
  PendingFollow as PendingFollowView,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { Spinner } from "./icon";
import { UserBadges } from "./user-badges";
import { linkEvent } from "inferno";

interface PendingFollowProps {
  pending_follow: PendingFollowView;
  myUserInfo: MyUserInfo | undefined;
  onApproveFollower(form: ApproveCommunityPendingFollower): void;
}

interface PendingFollowState {
  approveLoading: boolean;
  denyLoading: boolean;
}

export class PendingFollow extends Component<
  PendingFollowProps,
  PendingFollowState
> {
  state: PendingFollowState = {
    approveLoading: false,
    denyLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }
  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PendingFollowProps>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({
        approveLoading: false,
        denyLoading: false,
      });
    }
  }

  render() {
    const p = this.props.pending_follow;
    return (
      <div className="mb-3 row align-items-center">
        <span className="col col-md-3">
          <PersonListing
            person={p.person}
            showApubName
            myUserInfo={this.props.myUserInfo}
          />
          <UserBadges
            classNames="ms-1"
            myUserInfo={this.props.myUserInfo}
            creator={p.person}
            showCounts
          />
        </span>
        <span className="col">
          {p.follow_state === "approval_required" && (
            <>
              <button
                className="btn btn-secondary me-2 my-2"
                onClick={linkEvent(this, this.handleApprove)}
                aria-label={I18NextService.i18n.t("approve")}
              >
                {this.state.approveLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t("approve")
                )}
              </button>
              <button
                className="btn btn-secondary me-2"
                onClick={linkEvent(this, this.handleDeny)}
                aria-label={I18NextService.i18n.t("deny")}
              >
                {this.state.denyLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t("deny")
                )}
              </button>
            </>
          )}
        </span>
      </div>
    );
  }

  handleApprove(i: PendingFollow) {
    i.setState({ approveLoading: true });
    i.props.onApproveFollower({
      follower_id: i.props.pending_follow.person.id,
      community_id: i.props.pending_follow.community.id,
      approve: true,
    });
  }

  handleDeny(i: PendingFollow) {
    i.setState({ denyLoading: true });
    i.props.onApproveFollower({
      follower_id: i.props.pending_follow.person.id,
      community_id: i.props.pending_follow.community.id,
      approve: false,
    });
  }
}
