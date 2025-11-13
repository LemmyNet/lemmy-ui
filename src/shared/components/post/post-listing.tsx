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
  TransferCommunity,
} from "lemmy-js-client";
import { ShowBodyType, ShowCrossPostsType } from "@utils/types";
import { tippyMixin } from "../mixins/tippy-mixin";
import { PostForm } from "./post-form";
import { PostListingList } from "./post-listing-list";
import { PostListingCard } from "./post-listing-card";
import { masonryUpdate } from "@utils/browser";
import {
  areKeyboardShortcutsEnabled,
  shouldIgnoreEvent,
} from "@utils/keyboard-shortcuts";
import {
  handleKeyboardShortcut,
  type KeyboardShortcutHandlers,
} from "@utils/keyboard-shortcuts-actions";
import classNames from "classnames";

type PostListingState = {
  showEdit: boolean;
  imageExpanded: boolean;
};

type PostListingProps = {
  postView: PostView;
  postListingMode: PostListingMode;
  crossPosts: PostView[];
  admins: PersonView[];
  allLanguages: Language[];
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
  markable: boolean;
  disableAutoMarkAsRead: boolean;
  editLoading: boolean;
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
  // Keyboard navigation props
  isHighlighted?: boolean;
  isExpanded?: boolean;
  postIndex?: number;
  postId?: number;
  onHighlight?: (idx?: number) => void;
  onToggleExpand?: () => void;
};

@tippyMixin
export class PostListing extends Component<PostListingProps, PostListingState> {
  state: PostListingState = {
    showEdit: false,
    // imageExpanded set in componentWillMount based on postListingMode
    imageExpanded: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  unlisten = () => {};

  // Public method for parent components to trigger edit mode
  enterEditMode() {
    this.setState({ showEdit: true });
  }

  componentWillMount(): void {
    // Images should be full width (expanded) by default only in regular card mode
    // In small_card and list modes, they should start as thumbnails
    this.setState({
      imageExpanded: this.props.postListingMode === "card",
    });
    // Leave edit mode on navigation
    this.unlisten = this.context.router.history.listen(() => {
      if (this.state.showEdit) {
        this.setState({ showEdit: false });
      }
    });
  }

  componentDidUpdate(
    prevProps: Readonly<{ children?: InfernoNode } & PostListingProps>,
    prevState: Readonly<PostListingState>,
    _snapshot: any,
  ) {
    // Reset image expansion when view mode changes
    if (prevProps.postListingMode !== this.props.postListingMode) {
      this.setState({
        imageExpanded: this.props.postListingMode === "card",
      });
      masonryUpdate();
    }

    // Focus when highlighted
    if (
      !prevProps.isHighlighted &&
      this.props.isHighlighted &&
      !this.props.viewOnly
    ) {
      this.focusListing();
    }

    // Update layout when highlight changes
    // This ensures geometry updates correctly when navigating between posts
    if (prevProps.isHighlighted !== this.props.isHighlighted) {
      // Layout needs to recalculate
      masonryUpdate();
    }

    // Handle expand/collapse when isExpanded changes
    if (prevProps.isExpanded !== this.props.isExpanded) {
      // For highlighted posts, toggle image expansion to match body expansion
      if (this.props.isHighlighted) {
        this.setState(prev => ({ imageExpanded: !prev.imageExpanded }));
      }
      // Update layout once for all isExpanded changes
      masonryUpdate();
    }

    // Update layout when entering/leaving edit mode
    if (prevState.showEdit !== this.state.showEdit) {
      // Wait for PostForm to render and expand to full height before recalculating layout
      // Triple RAF to handle timing variations in form rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            masonryUpdate();
          });
        });
      });
    }
  }

  componentWillUnmount(): void {
    this.unlisten();
  }

  focusListing() {
    const postElement = document.querySelector(
      `[data-post-index="${this.props.postIndex}"]`,
    ) as HTMLElement;
    if (postElement) {
      postElement.focus();
      postElement.scrollIntoView({ behavior: "instant", block: "nearest" });
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    const p = this.props;

    // On post detail page, isHighlighted is undefined (treat as always highlighted)
    // On listing pages, only process if explicitly highlighted
    const shouldHandle = p.isHighlighted === undefined ? true : p.isHighlighted;

    if (
      !areKeyboardShortcutsEnabled() ||
      shouldIgnoreEvent(event) ||
      p.viewOnly ||
      !shouldHandle
    ) {
      return;
    }

    const { creator } = p.postView;

    const handlers: KeyboardShortcutHandlers = {
      myUserInfo: p.myUserInfo,
      router: this.context.router,
      onPostVote: p.onPostVote,
      onSavePost: p.onSavePost,
      onExpand: () => {
        if (p.onToggleExpand) {
          // Listing page: toggle both body and image via parent
          p.onToggleExpand();
        } else {
          // Post detail page: only toggle image (body already full)
          this.setState({ imageExpanded: !this.state.imageExpanded });
        }
      },
      onEdit: () => this.setState({ showEdit: true }),
      canEdit: () => {
        return (
          p.myUserInfo !== undefined &&
          p.myUserInfo.local_user_view.person.id === creator.id
        );
      },
    };

    const handled = handleKeyboardShortcut(event, p.postView, handlers);

    if (handled) {
      event.preventDefault();
      event.stopPropagation(); // Prevent parent handlers from also processing
    }
  }

  render() {
    const p = this.props;
    const isEditing = this.state.showEdit;
    return (
      <div
        className={classNames("post-listing mt-2", {
          "keyboard-selected": p.isHighlighted,
        })}
        onKeyDown={!isEditing ? this.handleKeyDown : undefined}
        onClick={
          !isEditing && p.onHighlight
            ? () => p.onHighlight!(p.postIndex!)
            : undefined
        }
        role="region"
        aria-label={`Post: ${p.postView.post.name}`}
        tabIndex={!isEditing && p.isHighlighted ? 0 : -1}
        {...(!isEditing &&
          p.postIndex !== undefined && { "data-post-index": p.postIndex })}
        {...(p.postId !== undefined && { "data-post-id": p.postId })}
      >
        {!this.state.showEdit ? (
          this.renderListingMode()
        ) : (
          <PostForm
            post_view={p.postView}
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
            showBody={p.showBody}
            hideImage={p.hideImage}
            viewOnly={p.viewOnly}
            showAdultConsentModal={p.showAdultConsentModal}
            myUserInfo={p.myUserInfo}
            localSite={p.localSite}
            showCrossPosts={p.showCrossPosts}
            onPostVote={p.onPostVote}
            onScrollIntoCommentsClick={p.onScrollIntoCommentsClick}
            imageExpanded={this.state.imageExpanded}
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
            markable={p.markable}
            disableAutoMarkAsRead={p.disableAutoMarkAsRead}
            editLoading={p.editLoading}
            imageExpanded={this.state.imageExpanded}
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
