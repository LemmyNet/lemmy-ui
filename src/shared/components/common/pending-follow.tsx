import {
  ApproveCommunityPendingFollower,
  MyUserInfo,
  PendingFollow as PendingFollowView,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { Spinner } from "./icon";
import { UserBadges } from "./user-badges";
import { CommunityLink } from "@components/community/community-link";

interface PendingFollowProps {
  pending_follow: PendingFollowView;
  myUserInfo: MyUserInfo | undefined;
  loading: boolean;
  onApproveFollower: (form: ApproveCommunityPendingFollower) => void;
}

export function PendingFollow(props: PendingFollowProps) {
  const { pending_follow: p, myUserInfo, loading } = props;

  return (
    <div className="mb-3 row align-items-center">
      <span className="col">
        <PersonListing
          person={p.person}
          banned={false}
          showApubName
          myUserInfo={myUserInfo}
          muted={false}
        />
        <UserBadges
          classNames="ms-1"
          myUserInfo={myUserInfo}
          creator={p.person}
          showCounts
        />{" "}
        {I18NextService.i18n.t("to")}{" "}
        <CommunityLink
          community={p.community}
          myUserInfo={myUserInfo}
          muted={false}
        />
      </span>
      <span className="col">
        {(p.follow_state === "approval_required" ||
          p.follow_state === "denied") && (
          <>
            <button
              className="btn btn-light border-light-subtle me-2 my-2"
              onClick={() => handleApprove(props)}
              aria-label={I18NextService.i18n.t("approve")}
            >
              {loading ? <Spinner /> : I18NextService.i18n.t("approve")}
            </button>
            {p.follow_state === "approval_required" && (
              <button
                className="btn btn-light border-light-subtle me-2"
                onClick={() => handleDeny(props)}
                aria-label={I18NextService.i18n.t("deny")}
              >
                {loading ? <Spinner /> : I18NextService.i18n.t("deny")}
              </button>
            )}
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
