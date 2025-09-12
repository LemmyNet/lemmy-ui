import { showAvatars } from "@utils/app";
import { getStaticDir } from "@utils/env";
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
            {this.avatarAndName(name, serverStr)}
          </Link>
        ) : (
          <a title={name} className={classes} href={link} rel={relTags}>
            {this.avatarAndName(name, serverStr)}
          </a>
        )}

        {isCakeDay(person.published_at) && <CakeDay creatorName={name} />}
      </>
    );
  }

  avatarAndName(name: string, serverStr?: string) {
    const avatar = this.props.person.avatar;
    return (
      <>
        {!this.props.hideAvatar &&
          /* TODO: hide avatar of banned person */
          showAvatars(this.props.myUserInfo) && (
            <PictrsImage
              src={avatar ?? `${getStaticDir()}/assets/icons/icon-96x96.png`}
              icon
            />
          )}
        <span>{name}</span>
        {serverStr && <small className="text-muted">{serverStr}</small>}
      </>
    );
  }
}
