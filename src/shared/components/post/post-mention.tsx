import { Component, InfernoNode } from "inferno";
import {
  LocalUserVoteDisplayMode,
  MyUserInfo,
  PersonPostMentionView,
  PostView,
} from "lemmy-js-client";
import { PostListing } from "./post-listing";
import { EMPTY_REQUEST } from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";

interface PostMentionProps {
  mention: PersonPostMentionView;
  enableDownvotes?: boolean;
  voteDisplayMode: LocalUserVoteDisplayMode;
  enableNsfw?: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
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
    const m = this.props.mention;
    const post = m.post;

    const pv: PostView = {
      post,
      creator: m.creator,
      community: m.community,
      creator_banned_from_community: m.creator_banned_from_community,
      counts: m.counts,
      subscribed: m.subscribed,
      saved: m.saved,
      read: m.person_post_mention.read, // using person_post_mention.read here
      creator_blocked: m.creator_blocked,
      my_vote: m.my_vote,
      unread_comments: m.unread_comments,
      creator_is_moderator: m.creator_is_moderator,
      creator_is_admin: m.creator_is_admin,
      banned_from_community: m.banned_from_community,
      hidden: m.hidden,
      tags: { tags: [] },
    };

    return (
      <div className="post-mention">
        <PostListing
          post_view={pv}
          markable={true}
          disableAutoMarkAsRead={true}
          showCommunity={true}
          enableDownvotes={this.props.enableDownvotes}
          voteDisplayMode={this.props.voteDisplayMode}
          enableNsfw={this.props.enableNsfw}
          showAdultConsentModal={this.props.showAdultConsentModal}
          viewOnly={true}
          allLanguages={[]}
          siteLanguages={[]}
          hideImage
          myUserInfo={this.props.myUserInfo}
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
          onHidePost={async () => {}}
        />
      </div>
    );
  }
}
