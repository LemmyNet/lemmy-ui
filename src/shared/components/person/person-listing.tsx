import { hideAnimatedImage, hideImages, showAvatars } from "@utils/app";
import { hostname } from "@utils/helpers";
import classNames from "classnames";
import { Component } from "inferno";
import { Link } from "inferno-router";
import { MyUserInfo, Person } from "lemmy-js-client";
import { relTags } from "@utils/config";
import { PictrsImage } from "../common/pictrs-image";
import { CakeDay } from "./cake-day";
import { isCakeDay } from "@utils/date";

interface PersonListingProps {
  person: Person;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
  showApubName?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

export class PersonListing extends Component<PersonListingProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { person, useApubName } = this.props;
    const local = person.local;
    let link: string;
    let serverStr: string | undefined = undefined;

    const name = useApubName
      ? person.name
      : (person.display_name ?? person.name);

    if (local) {
      link = `/u/${person.name}`;
    } else {
      serverStr = `@${hostname(person.ap_id)}`;
      link = !this.props.realLink
        ? `/u/${person.name}${serverStr}`
        : person.ap_id;
    }

    const classes = classNames(
      "person-listing d-inline-flex align-items-baseline",
      {
        "text-muted": this.props.muted,
        "text-info": !this.props.muted,
      },
    );
    return (
      <>
        {!this.props.realLink ? (
          <Link title={name} className={classes} to={link}>
            {this.avatarAndName(this.props.myUserInfo, name, serverStr)}
          </Link>
        ) : (
          <a title={name} className={classes} href={link} rel={relTags}>
            {this.avatarAndName(this.props.myUserInfo, name, serverStr)}
          </a>
        )}

        {isCakeDay(person.published_at) && <CakeDay creatorName={name} />}
      </>
    );
  }

  avatarAndName(
    myUserInfo: MyUserInfo | undefined,
    name: string,
    serverStr?: string,
  ) {
    const avatar = this.props.person.avatar;

    const hideAvatar =
      // Hide the avatar if you have hide images on
      hideImages(this.props.hideAvatar ?? false, myUserInfo) ||
      // Or its an animated image
      hideAnimatedImage(avatar ?? "", myUserInfo) ||
      // Or you have hide avatars in your user settings
      !showAvatars(this.props.myUserInfo);

    return (
      <>
        {!hideAvatar && avatar && <PictrsImage src={avatar} icon />}
        <span>{name}</span>
        {serverStr && <small className="text-muted">{serverStr}</small>}
      </>
    );
  }
}
