import { SubscribeButton } from "@components/common/subscribe-button";
import { I18NextService } from "@services/I18NextService";
import { numToSI } from "@utils/helpers";
import { Component } from "inferno";
import { CommunityView, MyUserInfo } from "lemmy-js-client";
import { CommunityLink } from "./community-link";

interface CommunityListItemProps {
  communityView: CommunityView;
  myUserInfo: MyUserInfo | undefined;
  onFollow: (communityId: number, follow: boolean) => Promise<void>;
}

interface CommunityListItemState {
  loading: boolean;
}

export class CommunityListItem extends Component<
  CommunityListItemProps,
  CommunityListItemState
> {
  state: CommunityListItemState = {
    loading: false,
  };

  async handleFollow(follow: boolean) {
    if (this.state.loading) return;
    this.setState({ loading: true });
    try {
      await this.props.onFollow(this.props.communityView.community.id, follow);
    } finally {
      this.setState({ loading: false });
    }
  }

  render() {
    const { communityView, myUserInfo } = this.props;
    const { community, community_actions } = communityView;

    return (
      <li className="list-group-item bg-transparent community-list-item px-0 py-2 py-md-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="fw-semibold min-w-0">
            <CommunityLink
              community={community}
              myUserInfo={myUserInfo}
              muted={false}
              className="text-decoration-none small"
            />
          </div>

          <div className="flex-shrink-0">
            <SubscribeButton
              followState={community_actions?.follow_state}
              apId={community.ap_id}
              onFollow={() => this.handleFollow(true)}
              onUnFollow={() => this.handleFollow(false)}
              loading={this.state.loading}
              compact
              modalId={`remoteFetchModal-${community.id}`}
              showRemoteFetch={!myUserInfo}
            />
          </div>
        </div>

        {community.summary && (
          <p className="mt-1 mb-0 text-body-secondary fs-xs line-clamp-2">
            {community.summary}
          </p>
        )}

        <div className="d-flex flex-wrap align-items-center column-gap-2 column-gap-sm-3 row-gap-1 mt-1 text-body-secondary fs-xs">
          <div>
            <span className="fw-semibold text-body">
              {numToSI(community.users_active_month)}
            </span>{" "}
            {I18NextService.i18n.t("users")} / {I18NextService.i18n.t("month")}
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
      </li>
    );
  }
}
