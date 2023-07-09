import { Community } from "lemmy-js-client";
import hostname from "./hostname";

export default function getCommunityDetails(community: Community) {
  let name_: string, title: string, link: string;
  const local = community.local == null ? true : community.local;
  if (local) {
    name_ = community.name;
    title = community.title;
    link = `/c/${community.name}`;
  } else {
    const domain = hostname(community.actor_id);
    name_ = `${community.name}@${domain}`;
    title = `${community.title}@${domain}`;
    link = !this.props.realLink ? `/c/${name_}` : community.actor_id;
  }

  return [name_, title, link];
}
