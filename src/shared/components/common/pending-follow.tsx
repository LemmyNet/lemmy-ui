import {
  ApproveCommunityPendingFollower,
  MyUserInfo,
  PendingFollow as PendingFollowView,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { Spinner } from "./icon";
import { UserBadges } from "./user-badges";

interface PendingFollowProps {
  pending_follow: PendingFollowView;
  myUserInfo: MyUserInfo | undefined;
  loading: boolean;
  onApproveFollower(form: ApproveCommunityPendingFollower): void;
}

export function PendingFollow(props: PendingFollowProps) {
  const p = props.pending_follow;

  return (
    <div className="mb-3 row align-items-center">
      <span className="col col-md-3">
        <PersonListing
          person={p.person}
          banned={false}
          showApubName
          myUserInfo={props.myUserInfo}
        />
        <UserBadges
          classNames="ms-1"
          myUserInfo={props.myUserInfo}
          creator={p.person}
          showCounts
        />
      </span>
      <span className="col">
        {p.follow_state === "approval_required" && (
          <>
            <button
              className="btn btn-light border-light-subtle me-2 my-2"
              onClick={() => handleApprove(props)}
              aria-label={I18NextService.i18n.t("approve")}
            >
              {props.loading ? <Spinner /> : I18NextService.i18n.t("approve")}
            </button>
            <button
              className="btn btn-light border-light-subtle me-2"
              onClick={() => handleDeny(props)}
              aria-label={I18NextService.i18n.t("deny")}
            >
              {props.loading ? <Spinner /> : I18NextService.i18n.t("deny")}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function handleApprove(i: PendingFollowProps) {
  i.onApproveFollower({
    follower_id: i.pending_follow.person.id,
    community_id: i.pending_follow.community.id,
    approve: true,
  });
}

function handleDeny(i: PendingFollowProps) {
  i.onApproveFollower({
    follower_id: i.pending_follow.person.id,
    community_id: i.pending_follow.community.id,
    approve: false,
  });
}
