import { Component } from "inferno";
import { Link } from "inferno-router";
import { PersonSafe } from "lemmy-js-client";
import { showAvatars, hostname, isCakeDay } from "../utils";
import { CakeDay } from "./cake-day";
import { PictrsImage } from "./pictrs-image";

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
      apubName = `@${person.name}@${hostname(person.actor_id)}`;
      link = !this.props.realLink ? `/user/${person.id}` : person.actor_id;
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
        <Link
          title={apubName}
          className={this.props.muted ? "text-muted" : "text-info"}
          to={link}
        >
          {!this.props.hideAvatar && person.avatar && showAvatars() && (
            <PictrsImage src={person.avatar} icon />
          )}
          <span>{displayName}</span>
        </Link>

        {isCakeDay(person.published) && <CakeDay creatorName={apubName} />}
      </>
    );
  }
}
