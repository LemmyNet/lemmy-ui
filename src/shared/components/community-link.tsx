import { Component } from "inferno";
import { Link } from "inferno-router";
import { CommunitySafe } from "lemmy-js-client";
import { hostname, showAvatars } from "../utils";
import { PictrsImage } from "./pictrs-image";

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
      name_ = `${community.name}@${hostname(community.actor_id)}`;
      title = `${community.title}@${hostname(community.actor_id)}`;
      link = !this.props.realLink
        ? `/community/${community.id}`
        : community.actor_id;
    }

    let apubName = `!${name_}`;
    let displayName = this.props.useApubName ? apubName : title;
    return (
      <Link
        title={apubName}
        className={`${this.props.muted ? "text-muted" : ""}`}
        to={link}
      >
        {!this.props.hideAvatar && community.icon && showAvatars() && (
          <PictrsImage src={community.icon} icon />
        )}
        <span>{displayName}</span>
      </Link>
    );
  }
}
