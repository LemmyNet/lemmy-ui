import { Component } from 'inferno';
import { Link } from 'inferno-router';
import { Community } from 'lemmy-js-client';
import { hostname, showAvatars } from '../utils';
import { PictrsImage } from './pictrs-image';

interface CommunityOther {
  name: string;
  id?: number; // Necessary if its federated
  icon?: string;
  local?: boolean;
  actor_id?: string;
}

interface CommunityLinkProps {
  community: Community | CommunityOther;
  realLink?: boolean;
  useApubName?: boolean;
  muted?: boolean;
  hideAvatar?: boolean;
}

export class CommunityLink extends Component<CommunityLinkProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let community = this.props.community;
    let name_: string, link: string;
    let local = community.local == null ? true : community.local;
    if (local) {
      name_ = community.name;
      link = `/c/${community.name}`;
    } else {
      name_ = `${community.name}@${hostname(community.actor_id)}`;
      link = !this.props.realLink
        ? `/community/${community.id}`
        : community.actor_id;
    }

    let apubName = `!${name_}`;
    let displayName = this.props.useApubName ? apubName : name_;
    return (
      <Link
        title={apubName}
        className={`${this.props.muted ? 'text-muted' : ''}`}
        to={link}
        target={!local ? '_blank' : ''}
      >
        {!this.props.hideAvatar && community.icon && showAvatars() && (
          <PictrsImage src={community.icon} icon />
        )}
        <span>{displayName}</span>
      </Link>
    );
  }
}
