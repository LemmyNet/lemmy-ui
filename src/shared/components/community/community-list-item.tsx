import { PictrsImage } from "@components/common/pictrs-image";
import { SubscribeButton } from "@components/common/subscribe-button";
import { I18NextService } from "@services/I18NextService";
import { hideAnimatedImage, showAvatars, showMedia } from "@utils/app";
import { getFirstCharacter, numToSI } from "@utils/helpers";
import { Link } from "inferno-router";
import { CommunityView, MyUserInfo } from "lemmy-js-client";
import { communityLink } from "./community-link";

interface CommunityListItemProps {
  communityView: CommunityView;
  myUserInfo: MyUserInfo | undefined;
  onFollow: (communityId: number, follow: boolean) => void;
  followLoading?: boolean;
}

export function CommunityListItem({
  communityView,
  myUserInfo,
  onFollow,
  followLoading = false,
}: CommunityListItemProps) {
  const { community, community_actions } = communityView;
  const { link, serverStr } = communityLink(community);

  const hideAvatar =
    hideAnimatedImage(community.icon ?? "", myUserInfo) ||
    !showAvatars(myUserInfo) ||
    !showMedia(myUserInfo);
  const showIcon = !hideAvatar && !community.removed && !!community.icon;

  return (
    <li className="list-group-item bg-transparent community-list-item px-0 py-2 py-md-3">
      <div className="d-flex align-items-start gap-2 gap-sm-3">
        <div className="flex-shrink-0">
          {showIcon && community.icon ? (
            <PictrsImage
              src={community.icon}
              type="icon"
              nsfw={community.nsfw}
            />
          ) : (
            <span
              className="img-icon community-avatar-fallback d-inline-flex align-items-center justify-content-center bg-body-secondary text-body-secondary border fw-semibold small"
              aria-hidden="true"
            >
              {getFirstCharacter(community.title ?? community.name)}
            </span>
          )}
        </div>

        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-start justify-content-between gap-2">
            <Link
              to={link}
              className="fw-semibold text-decoration-none overflow-wrap-anywhere min-w-0"
            >
              {community.title ?? community.name}
              {serverStr && (
                <small className="text-body-secondary fw-normal">
                  {serverStr}
                </small>
              )}
            </Link>

            <div className="flex-shrink-0">
              <SubscribeButton
                followState={community_actions?.follow_state}
                apId={community.ap_id}
                onFollow={() => onFollow(community.id, true)}
                onUnFollow={() => onFollow(community.id, false)}
                loading={followLoading}
                compact
                modalId={`remoteFetchModal-${community.id}`}
                showRemoteFetch={!myUserInfo}
              />
            </div>
          </div>

          {community.summary && (
            <p className="mt-1 mb-0 text-body-secondary small community-list-summary">
              {community.summary}
            </p>
          )}

          <div className="d-flex flex-wrap align-items-center column-gap-3 row-gap-1 mt-1 text-body-secondary community-list-stats">
            <div>
              <span className="fw-semibold text-body">
                {numToSI(community.users_active_month)}
              </span>{" "}
              {I18NextService.i18n.t("users")} /{" "}
              {I18NextService.i18n.t("month")}
            </div>
            <div>
              <span className="fw-semibold text-body">
                {numToSI(community.posts)}
              </span>{" "}
              {I18NextService.i18n.t("posts")}
            </div>
            <div>
              <span className="fw-semibold text-body">
                {numToSI(community.comments)}
              </span>{" "}
              {I18NextService.i18n.t("comments")}
            </div>
            <div>
              {I18NextService.i18n.t(
                `community_visibility_${community.visibility}`,
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
