import { showAvatars } from "@utils/app";
import { getStaticDir } from "@utils/env";
import { hostname, isCakeDay } from "@utils/helpers";
import { Component, InfernoNode } from "inferno";
import { Link } from "inferno-router";
import { Person } from "lemmy-js-client";
import { relTags } from "../../config";
import { PictrsImage } from "../common/pictrs-image";
import { CakeDay } from "./cake-day";

interface PersonListingProps {
  person: Person;
  profile?: boolean;
}

export class PersonListing extends Component<PersonListingProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const {
      person: {
        local,
        name,
        actor_id,
        display_name,
        published,
        avatar,
        banned,
      },
      profile,
    } = this.props;
    const domain = hostname(actor_id);
    const apubName = `@${name}@${domain}`;
    const link = profile ? actor_id : `/u/${name}${!local && `@${domain}`}`;

    function linkify(node: InfernoNode, isApubName?: boolean) {
      const className = `text-${display_name || profile ? "muted" : "info"}`;

      if (local && profile) {
        return isApubName ? <div className={className}>{node}</div> : node;
      } else if (profile) {
        return (
          <a title={apubName} href={link} rel={relTags} className={className}>
            {node}
          </a>
        );
      } else {
        return (
          <Link title={apubName} to={link} className={className}>
            {node}
          </Link>
        );
      }
    }

    return (
      <>
        <div className="person-listing d-inline-flex align-items-center">
          {!(profile || banned) &&
            showAvatars() &&
            linkify(
              <PictrsImage
                src={avatar ?? `${getStaticDir()}/assets/icons/icon-96x96.png`}
                icon
              />,
            )}
          <div>
            {display_name && !profile && (
              <div className="text-info">{display_name}</div>
            )}
            {linkify(apubName, true)}
          </div>
        </div>

        {isCakeDay(published) && <CakeDay creatorName={apubName} />}
      </>
    );
  }
}
