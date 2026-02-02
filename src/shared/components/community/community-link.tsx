import { hideAnimatedImage, hideImages, showAvatars } from "@utils/app";
import { hostname } from "@utils/helpers";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { Community, MyUserInfo } from "lemmy-js-client";
import { relTags } from "@utils/config";
import { PictrsImage } from "../common/pictrs-image";
import classNames from "classnames";
import { I18NextService } from "@services/index";

interface CommunityLinkProps {
  community: Community;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

export class CommunityLink extends Component<CommunityLinkProps, any> {
  render() {
    const { community, useApubName } = this.props;

    const title = useApubName
      ? community.name
      : (community.title ?? community.name);

    const { link, serverStr } = communityLink(community, this.props.realLink);

    const classes = `community-link ${this.props.muted ? "text-muted" : ""}`;

    return !this.props.realLink ? (
      <Link title={title} className={classes} to={link}>
        {this.avatarAndName(this.props.myUserInfo, title, serverStr)}
      </Link>
    ) : (
      <a title={title} className={classes} href={link} rel={relTags}>
        {this.avatarAndName(this.props.myUserInfo, title, serverStr)}
      </a>
    );
  }

  avatarAndName(
    myUserInfo: MyUserInfo | undefined,
    title: string,
    serverStr?: string,
  ) {
    const icon = this.props.community.icon;
    const nsfw = this.props.community.nsfw;

    const hideAvatar =
      // Hide the avatar if you have hide images on
      hideImages(this.props.hideAvatar ?? false, myUserInfo) ||
      // Or its an animated image
      hideAnimatedImage(icon ?? "", myUserInfo) ||
      // Or you have hide avatars in your user settings
      !showAvatars(this.props.myUserInfo);

    return (
      <>
        {!hideAvatar && !this.props.community.removed && icon && (
          <PictrsImage src={icon} icon nsfw={nsfw} />
        )}
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

type CommunitySettingLinkProps = {
  community: Community;
};
export function CommunitySettingsLink({
  community,
}: CommunitySettingLinkProps) {
  const classes = classNames(
    "btn btn-light border-light-subtle d-block mb-2 w-100",
    {
      "no-click": community.removed,
    },
  );

  const link = `${communityLink(community).link}/settings`;

  return (
    <Link className={classes} to={link}>
      {I18NextService.i18n.t("settings")}
    </Link>
  );
}

export function communityName(community: Community): string {
  return `!${community.name}@${hostname(community.ap_id)}`;
}
