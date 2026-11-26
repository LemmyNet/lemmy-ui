import classNames from "classnames";
import { Link } from "inferno-router";
import { Community, MultiCommunity, MyUserInfo } from "lemmy-js-client";
import { hideAnimatedImage, showAvatars, showMedia } from "@utils/app.ts";
import { communityLink } from "../community/community-link.tsx";
import { multiCommunityLink } from "../multi-community/multi-community-link.tsx";
import { PictrsImage } from "./pictrs-image";
import { Icon } from "./icon.tsx";
import { getFirstCharacter } from "@utils/helpers";

type IconOrFirstLetterProps = {
  iconSrc?: string;
  iconName?: string;
  nsfw?: boolean;
  label: string;
  shouldUseFirstLetterFallback?: boolean;
};

type ItemTypeAndItems =
  | { itemType: "community"; items: Community[] }
  | { itemType: "multiCommunity"; items: MultiCommunity[] };

type SubscriptionListProps = {
  manageTo: string;
  manageLabel: string;
  myUserInfo?: MyUserInfo;
  shouldUseFirstLetterFallback?: boolean;
} & ItemTypeAndItems;

type SubscriptionLinkProps = {
  to: string;
  label: string;
  serverStr?: string;
  iconSrc?: string;
  iconName?: string;
  nsfw?: boolean;
  shouldUseFirstLetterFallback?: boolean;
  isAction?: boolean;
};

type CommunitySubscriptionLinkProps = {
  community: Community;
  myUserInfo?: MyUserInfo;
  shouldUseFirstLetterFallback?: boolean;
};

type MultiCommunitySubscriptionLinkProps = {
  multiCommunity: MultiCommunity;
  shouldUseFirstLetterFallback?: boolean;
};

export function SubscriptionList({
  manageTo,
  manageLabel,
  myUserInfo,
  itemType,
  items,
  shouldUseFirstLetterFallback,
}: SubscriptionListProps) {
  return (
    <div className="subscription-list list-group">
      {manageTo && manageLabel && (
        <SubscriptionLink
          to={manageTo}
          label={manageLabel}
          iconName="settings"
          isAction
        />
      )}
      <ul className="list-unstyled mb-0">
        {itemType === "community"
          ? items.map(community => (
              <li key={community.id}>
                <CommunitySubscriptionLink
                  community={community}
                  myUserInfo={myUserInfo}
                  shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
                />
              </li>
            ))
          : items.map(multiCommunity => (
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

export function SubscriptionLink({
  to,
  label,
  serverStr,
  iconSrc,
  iconName,
  nsfw,
  shouldUseFirstLetterFallback,
  isAction,
}: SubscriptionLinkProps) {
  const fullTitle = serverStr ? `${label}${serverStr}` : label;

  return (
    <Link
      title={fullTitle}
      className={classNames(
        "list-group-item-action d-flex align-items-center gap-1 py-2 py-md-1 px-2 rounded text-body text-decoration-none small",
        {
          "fw-medium": isAction,
        },
      )}
      to={to}
    >
      <IconOrFirstLetter
        iconSrc={iconSrc}
        iconName={iconName}
        nsfw={nsfw}
        label={label}
        shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
      />
      <span className="text-truncate">
        {label}
        {serverStr && <small className="text-muted">{serverStr}</small>}
      </span>
    </Link>
  );
}

function IconOrFirstLetter({
  iconSrc,
  iconName,
  nsfw,
  label,
  shouldUseFirstLetterFallback,
}: IconOrFirstLetterProps) {
  if (iconSrc) {
    return (
      <span className="img-icon me-1 rounded-circle overflow-hidden d-inline-flex flex-shrink-0">
        <PictrsImage src={iconSrc} type="icon" nsfw={nsfw} />
      </span>
    );
  } else if (iconName) {
    return (
      <span
        className="img-icon me-1 d-inline-flex align-items-center justify-content-center flex-shrink-0 text-body-secondary"
        aria-hidden="true"
      >
        <Icon icon={iconName} />
      </span>
    );
  } else if (shouldUseFirstLetterFallback) {
    return (
      <span
        className="img-icon me-1 rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 bg-body-secondary text-body-secondary fw-semibold"
        aria-hidden="true"
      >
        {getFirstCharacter(label)}
      </span>
    );
  } else {
    return null;
  }
}

export function CommunitySubscriptionLink({
  community,
  myUserInfo,
  shouldUseFirstLetterFallback,
}: CommunitySubscriptionLinkProps) {
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
      label={community.title ?? community.name}
      serverStr={serverStr}
      iconSrc={!hideAvatar ? icon : undefined}
      nsfw={community.nsfw}
      shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
    />
  );
}

export function MultiCommunitySubscriptionLink({
  multiCommunity,
  shouldUseFirstLetterFallback,
}: MultiCommunitySubscriptionLinkProps) {
  const { link, serverStr } = multiCommunityLink(multiCommunity);

  return (
    <SubscriptionLink
      to={link}
      label={multiCommunity.title ?? multiCommunity.name}
      serverStr={serverStr}
      shouldUseFirstLetterFallback={shouldUseFirstLetterFallback}
    />
  );
}
