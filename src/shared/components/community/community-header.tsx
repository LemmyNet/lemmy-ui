import { Component } from "inferno";
import { Community, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { CommunityLink } from "./community-link";
import { LoadingEllipses } from "../common/loading-ellipses";

type CommunityHeaderProps = {
  community?: Community;
  urlCommunityName?: string;
  myUserInfo: MyUserInfo | undefined;
};

export class CommunityHeader extends Component<CommunityHeaderProps> {
  render() {
    const { community, urlCommunityName } = this.props;
    return (
      <div className="mb-2">
        {community && (
          <BannerIconHeader banner={community.banner} icon={community.icon} />
        )}
        <div>
          <h1
            className="h4 mb-0 overflow-wrap-anywhere d-inline"
            data-tippy-content={
              community?.posting_restricted_to_mods
                ? I18NextService.i18n.t("community_locked")
                : ""
            }
          >
            {community?.title ?? (
              <>
                {urlCommunityName}
                <LoadingEllipses />
              </>
            )}
          </h1>
          {community?.posting_restricted_to_mods && (
            <Icon icon="lock" inline classes="text-danger fs-4 ms-2" />
          )}
        </div>
        {(community && (
          <CommunityLink
            community={community}
            realLink
            useApubName
            muted
            hideAvatar
            myUserInfo={this.props.myUserInfo}
          />
        )) ??
          urlCommunityName}
      </div>
    );
  }
}
