import { showAvatars } from "@utils/app";
import { hostname } from "@utils/helpers";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { Community, MyUserInfo } from "lemmy-js-client";
import { relTags } from "@utils/config";
import { PictrsImage } from "../common/pictrs-image";

interface CommunityLinkProps {
  community: Community;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

export class CommunityLink extends Component<CommunityLinkProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { community, useApubName } = this.props;

    const title = useApubName
      ? community.name
      : (community.title ?? community.name);

    const { link, serverStr } = communityLink(community, this.props.realLink);

    const classes = `community-link ${this.props.muted ? "text-muted" : ""}`;

    return !this.props.realLink ? (
      <Link title={title} className={classes} to={link}>
        {this.avatarAndName(title, serverStr)}
      </Link>
    ) : (
      <a title={title} className={classes} href={link} rel={relTags}>
        {this.avatarAndName(title, serverStr)}
      </a>
    );
  }

  avatarAndName(title: string, serverStr?: string) {
    const icon = this.props.community.icon;
    const nsfw = this.props.community.nsfw;

    return (
      <>
        {!this.props.hideAvatar &&
          !this.props.community.removed &&
          showAvatars(this.props.myUserInfo) &&
          icon && <PictrsImage src={icon} icon nsfw={nsfw} />}
        <span className="overflow-wrap-anywhere">
          {title}
          {serverStr && <small className="text-muted">{serverStr}</small>}
        </span>
      </>
    );
  }
}

export type CommunityLinkAndServerStr = {
  link: string;
  serverStr?: string;
};

export function communityLink(
  community: Community,
  realLink: boolean = false,
): CommunityLinkAndServerStr {
  const local = community.local === null ? true : community.local;

  if (local) {
    return { link: `/c/${community.name}` };
  } else {
    const serverStr = `@${hostname(community.ap_id)}`;
    const link = realLink
      ? community.ap_id
      : `/c/${community.name}${serverStr}`;

    return { link, serverStr };
  }
}
