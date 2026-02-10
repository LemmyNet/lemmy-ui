import { Component, InfernoNode } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  EditPost,
  FeaturePost,
  HidePost,
  Language,
  LocalSite,
  LockPost,
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PersonView,
  PostListingMode,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  CommunityTag,
  TransferCommunity,
} from "lemmy-js-client";
import {
  ShowBodyType,
  ShowCrossPostsType,
  ShowMarkReadType,
} from "@utils/types";
import { tippyMixin } from "../mixins/tippy-mixin";
import { PostForm } from "./post-form";
import { PostListingList } from "./post-listing-list";
import { PostListingCard } from "./post-listing-card";
import { masonryUpdate } from "@utils/browser";

type PostListingState = {
  showEdit: boolean;
};

type PostListingProps = {
  postView: PostView;
  postListingMode: PostListingMode;
  crossPosts: PostView[];
  admins: PersonView[];
  allLanguages: Language[];
  communityTags: CommunityTag[];
  siteLanguages: number[];
  showCommunity: boolean;
  showBody: ShowBodyType;
  hideImage: boolean;
  enableNsfw: boolean;
  viewOnly: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  showCrossPosts: ShowCrossPostsType;
  showMarkRead: ShowMarkReadType;
  disableAutoMarkAsRead: boolean;
  editLoading: boolean;
  notificationRead?: boolean;
  markReadLoading: boolean;
  onPostEdit(form: EditPost): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onBlockPerson(form: BlockPerson): void;
  onBlockCommunity(form: BlockCommunity): void;
  onLockPost(form: LockPost): void;
  onDeletePost(form: DeletePost): void;
  onRemovePost(form: RemovePost): void;
  onSavePost(form: SavePost): void;
  onFeaturePost(form: FeaturePost): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgePost(form: PurgePost): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onTransferCommunity(form: TransferCommunity): void;
  onHidePost(form: HidePost): void;
  onPersonNote(form: NotePerson): void;
  onScrollIntoCommentsClick(e: MouseEvent): void;
  onMarkPostAsRead(form: MarkPostAsRead): void;
};

@tippyMixin
export class PostListing extends Component<PostListingProps, PostListingState> {
  state: PostListingState = {
    showEdit: false,
  };

  unlisten = () => {};

  componentWillMount(): void {
    // Leave edit mode on navigation
    this.unlisten = this.context.router.history.listen(() => {
      if (this.state.showEdit) {
        this.setState({ showEdit: false });
      }
    });
  }

  componentWillUnmount(): void {
    this.unlisten();
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostListingProps>,
  ): void {
    // Close the post edit form if it goes from loading to not.
    if (this.props.editLoading && !nextProps.editLoading) {
      this.setState({ showEdit: false });
    }
  }

  render() {
    const p = this.props;
    return (
      <div className="post-listing mt-2">
        {!this.state.showEdit ? (
          this.renderListingMode()
        ) : (
          <PostForm
            post_view={p.postView}
            selectedCommunityTags={this.props.communityTags}
            crossPosts={p.crossPosts}
            admins={p.admins}
            enableNsfw={p.enableNsfw}
            showAdultConsentModal={p.showAdultConsentModal}
            allLanguages={p.allLanguages}
            siteLanguages={p.siteLanguages}
            loading={p.editLoading}
            isNsfwCommunity={p.postView.community.nsfw}
            myUserInfo={p.myUserInfo}
            localSite={p.localSite}
            onEdit={p.onPostEdit}
            onCancel={() => handleEditCancel(this)}
          />
        )}
      </div>
    );
  }

  renderListingMode() {
    const p = this.props;
    switch (p.postListingMode) {
      case "list":
        return (
          <PostListingList
            postView={p.postView}
            crossPosts={p.crossPosts}
            allLanguages={p.allLanguages}
            showCommunity={p.showCommunity}
            hideImage={p.hideImage}
            viewOnly={p.viewOnly}
            myUserInfo={p.myUserInfo}
            localSite={p.localSite}
            showCrossPosts={p.showCrossPosts}
            onPostVote={p.onPostVote}
            onScrollIntoCommentsClick={p.onScrollIntoCommentsClick}
          />
        );
      case "card":
      case "small_card":
        return (
          <PostListingCard
            smallCard={p.postListingMode === "small_card"}
            postView={p.postView}
            crossPosts={p.crossPosts}
            admins={p.admins}
            allLanguages={p.allLanguages}
            siteLanguages={p.siteLanguages}
            showCommunity={p.showCommunity}
            showBody={p.showBody}
            hideImage={p.hideImage}
            enableNsfw={p.enableNsfw}
            viewOnly={p.viewOnly}
            showAdultConsentModal={p.showAdultConsentModal}
            myUserInfo={p.myUserInfo}
            localSite={p.localSite}
            showCrossPosts={p.showCrossPosts}
            showMarkRead={p.showMarkRead}
            disableAutoMarkAsRead={p.disableAutoMarkAsRead}
            editLoading={p.editLoading}
            notificationRead={p.notificationRead}
            markReadLoading={p.markReadLoading}
            onEditClick={() => handleEditClick(this)}
            onPostEdit={p.onPostEdit}
            onPostVote={p.onPostVote}
            onPostReport={p.onPostReport}
            onBlockPerson={p.onBlockPerson}
            onBlockCommunity={p.onBlockCommunity}
            onLockPost={p.onLockPost}
            onDeletePost={p.onDeletePost}
            onRemovePost={p.onRemovePost}
            onSavePost={p.onSavePost}
            onFeaturePost={p.onFeaturePost}
            onPurgePerson={p.onPurgePerson}
            onPurgePost={p.onPurgePost}
            onBanPersonFromCommunity={p.onBanPersonFromCommunity}
            onBanPerson={p.onBanPerson}
            onAddModToCommunity={p.onAddModToCommunity}
            onAddAdmin={p.onAddAdmin}
            onTransferCommunity={p.onTransferCommunity}
            onHidePost={p.onHidePost}
            onPersonNote={p.onPersonNote}
            onMarkPostAsRead={p.onMarkPostAsRead}
            onScrollIntoCommentsClick={p.onScrollIntoCommentsClick}
          />
        );
    }
  }
}

async function handleEditClick(i: PostListing) {
  i.setState({ showEdit: true });
  await masonryUpdate();
}

async function handleEditCancel(i: PostListing) {
  i.setState({ showEdit: false });
  await masonryUpdate();
}
