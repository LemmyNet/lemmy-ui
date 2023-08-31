import { showAvatars } from "@utils/app";
import { hostname } from "@utils/helpers";
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
    const community = this.props.community;
    let title: string, link: string;
    const local = community.local === null ? true : community.local;
    const domain = hostname(community.actor_id);
    if (local) {
      title = community.title;
      link = `/c/${community.name}`;
    } else {
      const name_ = `${community.name}@${domain}`;
      title = `${community.title}@${domain}`;
      link = !this.props.realLink ? `/c/${name_}` : community.actor_id;
    }

    const apubName = `!${community.name}@${domain}`;
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
    const nsfw = this.props.community.nsfw;

    return (
      <>
        {!this.props.hideAvatar &&
          !this.props.community.removed &&
          showAvatars() &&
          icon && <PictrsImage src={icon} icon nsfw={nsfw} />}
        <span className="overflow-wrap-anywhere">{displayName}</span>
      </>
    );
  }
}
