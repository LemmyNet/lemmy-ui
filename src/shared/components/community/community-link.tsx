import { showAvatars } from "@utils/app";
import { getCommunityDetails } from "@utils/helpers";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { Community } from "lemmy-js-client";
import { relTags } from "../../config";
import { PictrsImage } from "../common/pictrs-image";

interface CommunityLinkProps {
  community: Community;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
}

export class CommunityLink extends Component<CommunityLinkProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const [name_, title, link] = getCommunityDetails(this.props.community);
    const apubName = `!${name_}`;
    const displayName = this.props.useApubName ? apubName : title;
    return !this.props.realLink ? (
      <Link
        title={apubName}
        className={`community-link ${this.props.muted ? "text-muted" : ""}`}
        to={link}
      >
        {this.avatarAndName(displayName)}
      </Link>
    ) : (
      <a
        title={apubName}
        className={`community-link ${this.props.muted ? "text-muted" : ""}`}
        href={link}
        rel={relTags}
      >
        {this.avatarAndName(displayName)}
      </a>
    );
  }

  avatarAndName(displayName: string) {
    const icon = this.props.community.icon;
    return (
      <>
        {!this.props.hideAvatar &&
          !this.props.community.removed &&
          showAvatars() &&
          icon && <PictrsImage src={icon} icon />}
        <span className="overflow-wrap-anywhere">{displayName}</span>
      </>
    );
  }
}
