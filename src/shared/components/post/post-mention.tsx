import { Component, InfernoNode } from "inferno";
import {
  MyUserInfo,
  MarkPostAsRead,
  PostView,
  PersonView,
  LocalSite,
} from "lemmy-js-client";
import { PostListing } from "./post-listing";
import { EMPTY_REQUEST } from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";

interface PostMentionProps {
  post: PostView;
  enableNsfw?: boolean;
  readOverride?: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  onMarkPostMentionAsRead(form: MarkPostAsRead): Promise<void>;
}

interface PostMentionState {
  loading: boolean;
}

@tippyMixin
export class PostMention extends Component<PostMentionProps, PostMentionState> {
  state: PostMentionState = {
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostMentionProps>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({ loading: false });
    }
  }

  render() {
    const m = this.props.post;
    const post = m.post;

    const pv: PostView = {
      post,
      creator: m.creator,
      community: m.community,
      image_details: m.image_details,
      community_actions: m.community_actions,
      person_actions: m.person_actions,
      post_actions: m.post_actions,
      creator_is_admin: m.creator_is_admin,
      creator_is_moderator: m.creator_is_moderator,
      can_mod: m.can_mod,
      creator_banned: m.creator_banned,
      creator_banned_from_community: m.creator_banned_from_community,
      tags: m.tags,
    };

    return (
      <div className="post-mention">
        <PostListing
          post_view={pv}
          markable={true}
          readOverride={this.props.readOverride}
          disableAutoMarkAsRead={true}
          showCommunity={true}
          enableNsfw={this.props.enableNsfw}
          showAdultConsentModal={this.props.showAdultConsentModal}
          viewOnly={true}
          allLanguages={[]}
          siteLanguages={[]}
          hideImage
          myUserInfo={this.props.myUserInfo}
          localSite={this.props.localSite}
          admins={this.props.admins}
          // All of these are unused, since its view only
          onPostEdit={async () => EMPTY_REQUEST}
          onPostVote={async () => EMPTY_REQUEST}
          onPostReport={async () => {}}
          onBlockPerson={async () => {}}
          onLockPost={async () => {}}
          onDeletePost={async () => {}}
          onRemovePost={async () => {}}
          onSavePost={async () => {}}
          onFeaturePost={async () => {}}
          onPurgePerson={async () => {}}
          onPurgePost={async () => {}}
          onBanPersonFromCommunity={async () => {}}
          onBanPerson={async () => {}}
          onAddModToCommunity={async () => {}}
          onAddAdmin={async () => {}}
          onTransferCommunity={async () => {}}
          onMarkPostAsRead={this.props.onMarkPostMentionAsRead}
          onHidePost={async () => {}}
        />
      </div>
    );
  }
}
