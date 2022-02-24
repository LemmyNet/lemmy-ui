import { Component } from "inferno";
import { Link } from "inferno-router";
import { CommunitySafe } from "lemmy-js-client";
import { hostname, relTags, showAvatars } from "../../utils";
import { PictrsImage } from "../common/pictrs-image";

interface CommunityLinkProps {
  // TODO figure this out better
  community: CommunitySafe;
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
    let community = this.props.community;
    let name_: string, title: string, link: string;
    let local = community.local == null ? true : community.local;
    if (local) {
      name_ = community.name;
      title = community.title;
      link = `/c/${community.name}`;
    } else {
      let domain = hostname(community.actor_id);
      name_ = `${community.name}@${domain}`;
      title = `${community.title}@${domain}`;
      link = !this.props.realLink ? `/c/${name_}` : community.actor_id;
    }

    let apubName = `!${name_}`;
    let displayName = this.props.useApubName ? apubName : title;
    return !this.props.realLink ? (
      <Link
        title={apubName}
        className={`${this.props.muted ? "text-muted" : ""}`}
        to={link}
      >
        {this.avatarAndName(displayName)}
      </Link>
    ) : (
      <a
        title={apubName}
        className={`${this.props.muted ? "text-muted" : ""}`}
        href={link}
        rel={relTags}
      >
        {this.avatarAndName(displayName)}
      </a>
    );
  }

  avatarAndName(displayName: string) {
    let community = this.props.community;
    return (
      <>
        {!this.props.hideAvatar && community.icon && showAvatars() && (
          <PictrsImage src={community.icon} icon />
        )}
        <span class="overflow-wrap-anywhere">{displayName}</span>
      </>
    );
  }
}
