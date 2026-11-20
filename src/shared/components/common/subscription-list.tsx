import classNames from "classnames";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { Community, MultiCommunity, MyUserInfo } from "lemmy-js-client";
import { hideAnimatedImage, showAvatars, showMedia } from "@utils/app.ts";
import { communityLink } from "../community/community-link.tsx";
import { multiCommunityLink } from "../multi-community/multi-community-link.tsx";
import { PictrsImage } from "./pictrs-image";
import { Icon } from "./icon.tsx";

type SubscriptionListProps = {
  manageTo?: string;
  manageLabel?: string;
  myUserInfo?: MyUserInfo;
  shouldUseFirstLetterFallback?: boolean;
} & (
  | { itemType: "community"; items: Community[] }
  | { itemType: "multiCommunity"; items: MultiCommunity[] }
);

interface SubscriptionLinkProps {
  to: string;
  label: string;
  serverStr?: string;
  iconSrc?: string;
  iconName?: string;
  nsfw?: boolean;
  shouldUseFirstLetterFallback?: boolean;
  isAction?: boolean;
}

interface CommunitySubscriptionLinkProps {
  community: Community;
  myUserInfo?: MyUserInfo;
  shouldUseFirstLetterFallback?: boolean;
}

interface MultiCommunitySubscriptionLinkProps {
  multiCommunity: MultiCommunity;
  shouldUseFirstLetterFallback?: boolean;
}

export class SubscriptionList extends Component<SubscriptionListProps, never> {
  render() {
    const { manageTo, manageLabel, myUserInfo, shouldUseFirstLetterFallback } =
      this.props;

    return (
      <div className="subscription-list">
        {manageTo && manageLabel && (
          <SubscriptionLink
            to={manageTo}
            label={manageLabel}
            iconName="settings"
            isAction
          />
        )}
        <ul className="list-unstyled mb-0">
          {this.props.itemType === "community"
            ? this.props.items.map(community => (
                <li key={community.id}>
                  <CommunitySubscriptionLink
                    community={community}
                    myUserInfo={myUserInfo}
                    shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
                  />
                </li>
              ))
            : this.props.items.map(multiCommunity => (
                <li key={multiCommunity.id}>
                  <MultiCommunitySubscriptionLink
                    multiCommunity={multiCommunity}
                    shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
                  />
                </li>
              ))}
        </ul>
      </div>
    );
  }
}

export class SubscriptionLink extends Component<SubscriptionLinkProps, never> {
  render() {
    const { to, label, serverStr, isAction } = this.props;
    const fullTitle = serverStr ? `${label}${serverStr}` : label;

    return (
      <Link
        title={fullTitle}
        className={classNames("subscription-link", {
          "fw-medium": isAction,
        })}
        to={to}
      >
        {this.renderIcon()}
        <span className="text-truncate">
          {label}
          {serverStr && <small className="text-muted">{serverStr}</small>}
        </span>
      </Link>
    );
  }

  private renderIcon() {
    const { iconSrc, iconName, nsfw, label, shouldUseFirstLetterFallback } =
      this.props;

    if (iconSrc) {
      return <PictrsImage src={iconSrc} type="icon" nsfw={nsfw} />;
    }

    if (iconName) {
      return (
        <span
          className="subscription-link-icon text-body-secondary"
          aria-hidden="true"
        >
          <Icon icon={iconName} />
        </span>
      );
    }

    if (shouldUseFirstLetterFallback) {
      return (
        <span
          className="subscription-link-icon subscription-link-icon-fallback"
          aria-hidden="true"
        >
          {getFirstCharacter(label)}
        </span>
      );
    }

    return null;
  }
}

export class CommunitySubscriptionLink extends Component<
  CommunitySubscriptionLinkProps,
  never
> {
  render() {
    const { community, myUserInfo, shouldUseFirstLetterFallback } = this.props;
    const { link, serverStr } = communityLink(community);
    const icon = community.icon;
    const hideAvatar =
      !icon ||
      community.removed ||
      hideAnimatedImage(icon, myUserInfo) ||
      !showAvatars(myUserInfo) ||
      !showMedia(myUserInfo);

    return (
      <SubscriptionLink
        to={link}
        label={community.name}
        serverStr={serverStr}
        iconSrc={!hideAvatar ? icon : undefined}
        nsfw={community.nsfw}
        shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
      />
    );
  }
}

export class MultiCommunitySubscriptionLink extends Component<
  MultiCommunitySubscriptionLinkProps,
  never
> {
  render() {
    const { multiCommunity, shouldUseFirstLetterFallback } = this.props;
    const { link, serverStr } = multiCommunityLink(multiCommunity);

    return (
      <SubscriptionLink
        to={link}
        label={multiCommunity.name}
        serverStr={serverStr}
        shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
      />
    );
  }
}

function getFirstCharacter(text: string): string {
  const trimmed = text.trim();
  // Use codePointAt so titles starting with an emoji don't split into a broken surrogate char
  const codePoint = trimmed.codePointAt(0);
  return codePoint !== undefined
    ? String.fromCodePoint(codePoint).toUpperCase()
    : "";
}
