import { Icon } from "@components/common/icon";
import { MomentTime } from "@components/common/moment-time";
import { UserBadges } from "@components/common/user-badges";
import { VoteButtons } from "@components/common/vote-buttons";
import { CommunityLink } from "@components/community/community-link";
import { PersonListing } from "@components/person/person-listing";
import { I18NextService } from "@services/index";
import { hostname, unreadCommentsCount } from "@utils/helpers";
import { mdToHtmlInline } from "@utils/markdown";
import { ShowCrossPostsType } from "@utils/types";
import { Link } from "inferno-router";
import { PostView, MyUserInfo, LocalSite } from "lemmy-js-client";

type CrossPostsProps = {
  crossPosts?: PostView[];
  type_: ShowCrossPostsType;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
};
export function CrossPosts({
  crossPosts,
  type_,
  myUserInfo,
  localSite,
}: CrossPostsProps) {
  switch (type_) {
    case "small":
      return <SmallCrossPosts crossPosts={crossPosts} />;
    case "expanded":
      return (
        <ExpandedCrossPosts
          crossPosts={crossPosts}
          myUserInfo={myUserInfo}
          localSite={localSite}
        />
      );
    case "show_separately":
      return <></>;
  }
}

type SmallCrossPostsProps = {
  crossPosts?: PostView[];
};
function SmallCrossPosts({ crossPosts }: SmallCrossPostsProps) {
  return crossPosts && crossPosts.length > 0 ? (
    <ul className="list-inline mb-1 small text-muted">
      <>
        <li className="list-inline-item me-2">
          {I18NextService.i18n.t("cross_posted_to")}
        </li>
        {crossPosts.map(pv => (
          <li key={pv.post.id} className="list-inline-item me-2">
            <Link to={`/post/${pv.post.id}`}>
              {pv.community.local
                ? pv.community.name
                : `${pv.community.name}@${hostname(pv.community.ap_id)}`}
            </Link>
          </li>
        ))}
      </>
    </ul>
  ) : (
    <></>
  );
}

type ExpandedCrossPostsProps = {
  crossPosts?: PostView[];
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
};
function ExpandedCrossPosts({
  crossPosts,
  myUserInfo,
  localSite,
}: ExpandedCrossPostsProps) {
  return crossPosts && crossPosts.length > 0 ? (
    <div>
      <div className="row mb-3">
        <div className="col">{I18NextService.i18n.t("cross_posts")}</div>
      </div>
      <div className="row">
        {crossPosts.map(pv => {
          const title = I18NextService.i18n.t("number_of_comments", {
            count: Number(pv.post.comments),
            formattedCount: Number(pv.post.comments),
          });
          const unreadCount = unreadCommentsCount(pv);

          return (
            <div className="d-flex col-sm-12 col-md-6 col-lg-4 mb-3">
              <VoteButtons
                voteContentType={"post"}
                id={pv.post.id}
                subject={pv.post}
                myVoteIsUpvote={pv.post_actions?.vote_is_upvote}
                myUserInfo={myUserInfo}
                localSite={localSite}
                disabled
                onVote={() => null}
              />
              <div className="col">
                <div className="post-title">
                  <h1 className="h5 d-inline text-break">
                    <Link
                      className="d-inline text-body"
                      to={`/post/${pv.post.id}`}
                      title={I18NextService.i18n.t("comments")}
                    >
                      <span
                        className="d-inline"
                        dangerouslySetInnerHTML={mdToHtmlInline(pv.post.name)}
                      />
                    </Link>
                  </h1>
                </div>

                <div className="small mb-1 mb-md-0">
                  <Link
                    className="btn btn-sm btn-link text-muted ps-0"
                    title={title}
                    to={`/post/${pv.post.id}?scrollToComments=true`}
                    data-tippy-content={title}
                  >
                    <Icon icon="message-square" classes="me-1" inline />
                    {pv.post.comments}
                    {unreadCount && (
                      <>
                        {" "}
                        <span className="fst-italic">
                          ({unreadCount} {I18NextService.i18n.t("new")})
                        </span>
                      </>
                    )}
                  </Link>
                  <PersonListing person={pv.creator} myUserInfo={myUserInfo} />
                  <UserBadges
                    classNames="ms-1"
                    isModerator={pv.creator_is_moderator}
                    isAdmin={pv.creator_is_admin}
                    creator={pv.creator}
                    isBanned={pv.creator_banned}
                    isBannedFromCommunity={pv.creator_banned_from_community}
                    myUserInfo={myUserInfo}
                    personActions={pv.person_actions}
                  />
                  <>
                    {" "}
                    {I18NextService.i18n.t("to")}{" "}
                    <CommunityLink
                      community={pv.community}
                      myUserInfo={myUserInfo}
                    />
                  </>
                  {" · "}
                  <MomentTime
                    published={pv.post.published_at}
                    updated={pv.post.updated_at}
                    showAgo={false}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <></>
  );
}
