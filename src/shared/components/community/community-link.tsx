import { Component } from "inferno";
import { Link } from "inferno-router";
import { Community } from "lemmy-js-client";
import { hostname, relTags, showAvatars } from "../../utils";
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
    let name_: string, title: string, link: string;
    const local = community.local == null ? true : community.local;
    if (local) {
      name_ = community.name;
      title = community.title;
      link = `/c/${community.name}`;
    } else {
      const domain = hostname(community.actor_id);
      name_ = `${community.name}@${domain}`;
      title = `${community.title}@${domain}`;
      link = !this.props.realLink ? `/c/${name_}` : community.actor_id;
    }

    const apubName = `!${name_}`;
    const displayName = this.props.useApubName ? apubName : title;
    return !this.props.realLink ? (
      <Link
        title={apubName}
        className={[
          "community-link__root",
          `${this.props.muted ? "text-muted" : ""}`,
        ].join(" ")}
        to={link}
      >
        {this.avatarAndName(displayName)}
      </Link>
    ) : (
      <a
        title={apubName}
        className={[
          "community-link__root",
          `${this.props.muted ? "text-muted" : ""}`,
        ].join(" ")}
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
