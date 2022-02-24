import { Component } from "inferno";
import { Link } from "inferno-router";
import { PersonSafe } from "lemmy-js-client";
import { hostname, isCakeDay, relTags, showAvatars } from "../../utils";
import { PictrsImage } from "../common/pictrs-image";
import { CakeDay } from "./cake-day";

interface PersonListingProps {
  person: PersonSafe;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
  showApubName?: boolean;
}

export class PersonListing extends Component<PersonListingProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let person = this.props.person;
    let local = person.local == null ? true : person.local;
    let apubName: string, link: string;

    if (local) {
      apubName = `@${person.name}`;
      link = `/u/${person.name}`;
    } else {
      let domain = hostname(person.actor_id);
      apubName = `@${person.name}@${domain}`;
      link = !this.props.realLink
        ? `/u/${person.name}@${domain}`
        : person.actor_id;
    }

    let displayName = this.props.useApubName
      ? apubName
      : person.display_name
      ? person.display_name
      : apubName;

    if (this.props.showApubName && !local && person.display_name) {
      displayName = `${displayName} (${apubName})`;
    }

    return (
      <>
        {!this.props.realLink ? (
          <Link
            title={apubName}
            className={this.props.muted ? "text-muted" : "text-info"}
            to={link}
          >
            {this.avatarAndName(displayName)}
          </Link>
        ) : (
          <a
            title={apubName}
            className={this.props.muted ? "text-muted" : "text-info"}
            href={link}
            rel={relTags}
          >
            {this.avatarAndName(displayName)}
          </a>
        )}

        {isCakeDay(person.published) && <CakeDay creatorName={apubName} />}
      </>
    );
  }

  avatarAndName(displayName: string) {
    let person = this.props.person;
    return (
      <>
        {!this.props.hideAvatar && person.avatar && showAvatars() && (
          <PictrsImage src={person.avatar} icon />
        )}
        <span>{displayName}</span>
      </>
    );
  }
}
