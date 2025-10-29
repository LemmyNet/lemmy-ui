import { hideAnimatedImage, hideImages, showAvatars } from "@utils/app";
import { hostname } from "@utils/helpers";
import classNames from "classnames";
import { Link } from "inferno-router";
import { MyUserInfo, Person } from "lemmy-js-client";
import { relTags } from "@utils/config";
import { PictrsImage } from "../common/pictrs-image";
import { CakeDay } from "./cake-day";
import { isCakeDay } from "@utils/date";

interface PersonListingProps {
  person: Person;
  banned: boolean;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
  showApubName?: boolean;
  badgeForPostCreator?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

export function PersonListing({
  person,
  banned,
  realLink,
  useApubName,
  muted,
  hideAvatar,
  badgeForPostCreator,
  myUserInfo,
}: PersonListingProps) {
  const name = useApubName ? person.name : (person.display_name ?? person.name);
  const { link, serverStr } = personLink(person, realLink);

  const classes = classNames(
    "person-listing d-inline-flex align-items-baseline",
    {
      "text-muted": muted,
      "text-info": !muted,
    },
  );
  return (
    <>
      {!realLink ? (
        <Link title={name} className={classes} to={link}>
          <AvatarAndName
            name={name}
            banned={banned}
            serverStr={serverStr}
            avatar={person.avatar}
            hideAvatar={hideAvatar}
            badgeForPostCreator={badgeForPostCreator}
            myUserInfo={myUserInfo}
          />
        </Link>
      ) : (
        <a title={name} className={classes} href={link} rel={relTags}>
          <AvatarAndName
            name={name}
            banned={banned}
            serverStr={serverStr}
            avatar={person.avatar}
            hideAvatar={hideAvatar}
            badgeForPostCreator={badgeForPostCreator}
            myUserInfo={myUserInfo}
          />
        </a>
      )}

      {isCakeDay(person.published_at) && <CakeDay creatorName={name} />}
    </>
  );
}

type AvatarAndNameProps = {
  name: string;
  serverStr?: string;
  banned: boolean;
  avatar?: string;
  hideAvatar?: boolean;
  badgeForPostCreator?: boolean;
  myUserInfo: MyUserInfo | undefined;
};

function AvatarAndName({
  name,
  serverStr,
  banned,
  avatar,
  hideAvatar,
  badgeForPostCreator,
  myUserInfo,
}: AvatarAndNameProps) {
  const nameClasses = classNames({
    "badge text-bg-info": badgeForPostCreator,
  });
  const hideAvatar_ =
    // Hide the avatar if you have hide images on
    hideImages(hideAvatar ?? false, myUserInfo) ||
    // Or its an animated image
    hideAnimatedImage(avatar ?? "", myUserInfo) ||
    // Or you have hide avatars in your user settings
    !showAvatars(myUserInfo);

  return (
    <>
      {!hideAvatar_ && !banned && avatar && <PictrsImage src={avatar} icon />}
      <span className={nameClasses}>{name}</span>
      {serverStr && <small className="text-muted">{serverStr}</small>}
    </>
  );
}

type PersonLinkAndServerStr = {
  link: string;
  serverStr?: string;
};

function personLink(
  person: Person,
  realLink: boolean = false,
): PersonLinkAndServerStr {
  const local = person.local;
  let link: string;
  let serverStr: string | undefined = undefined;

  if (local) {
    link = `/u/${person.name}`;
  } else {
    serverStr = `@${hostname(person.ap_id)}`;
    link = !realLink ? `/u/${person.name}${serverStr}` : person.ap_id;
  }

  return { link, serverStr };
}
