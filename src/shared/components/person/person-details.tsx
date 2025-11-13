import { Component, InfernoNode } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentResponse,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditPost,
  FeaturePost,
  GetComments,
  Language,
  LockPost,
  MarkPostAsRead,
  PersonView,
  PostResponse,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  PostSortType,
  TransferCommunity,
  MyUserInfo,
  PersonContentCombinedView,
  LocalSite,
  NotePerson,
  LockComment,
  BlockCommunity,
} from "lemmy-js-client";
import { CommentNodes } from "../comment/comment-nodes";
import { PostListing } from "../post/post-listing";
import { RequestState } from "../../services/HttpService";
import { commentToFlatNode } from "@utils/app";
import { ensureInView } from "@utils/keyboard-shortcuts";
import { getPersonDetailIndexSelector } from "@utils/keyboard-shortcuts-constants";
import {
  toggleExpansion,
  getShowBodyMode,
  type KeyboardNavigationState,
} from "@utils/keyboard-shortcuts-expansion";
import {
  keyboardShortcutsMixin,
  type KeyboardShortcutsComponent,
} from "../mixins/keyboard-shortcuts-mixin";

interface PersonDetailsProps {
  content: PersonContentCombinedView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  limit: number;
  sort: PostSortType;
  enableNsfw: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  onSaveComment(form: SaveComment): Promise<void>;
  onCreateComment(form: CreateComment): Promise<RequestState<CommentResponse>>;
  onEditComment(form: EditComment): Promise<RequestState<CommentResponse>>;
  onCommentVote(form: CreateCommentLike): Promise<void>;
  onBlockPerson(form: BlockPerson): Promise<void>;
  onBlockCommunity(form: BlockCommunity): Promise<void>;
  onDeleteComment(form: DeleteComment): Promise<void>;
  onRemoveComment(form: RemoveComment): Promise<void>;
  onDistinguishComment(form: DistinguishComment): Promise<void>;
  onAddModToCommunity(form: AddModToCommunity): Promise<void>;
  onAddAdmin(form: AddAdmin): Promise<void>;
  onBanPersonFromCommunity(form: BanFromCommunity): Promise<void>;
  onBanPerson(form: BanPerson): Promise<void>;
  onTransferCommunity(form: TransferCommunity): Promise<void>;
  onFetchChildren?(form: GetComments): void;
  onCommentReport(form: CreateCommentReport): Promise<void>;
  onPurgePerson(form: PurgePerson): Promise<void>;
  onPurgeComment(form: PurgeComment): Promise<void>;
  onPostEdit(form: EditPost): Promise<RequestState<PostResponse>>;
  onPostVote(form: CreatePostLike): Promise<RequestState<PostResponse>>;
  onPostReport(form: CreatePostReport): Promise<void>;
  onLockPost(form: LockPost): Promise<void>;
  onDeletePost(form: DeletePost): Promise<void>;
  onRemovePost(form: RemovePost): Promise<void>;
  onSavePost(form: SavePost): Promise<void>;
  onFeaturePost(form: FeaturePost): Promise<void>;
  onPurgePost(form: PurgePost): Promise<void>;
  onMarkPostAsRead(form: MarkPostAsRead): Promise<void>;
  onPersonNote(form: NotePerson): Promise<void>;
  onLockComment(form: LockComment): Promise<void>;
  onNextPage?(): void;
  onPrevPage?(): void;
  onFirstPage?(): void;
}

@keyboardShortcutsMixin
export class PersonDetails
  extends Component<PersonDetailsProps, KeyboardNavigationState>
  implements KeyboardShortcutsComponent<PersonContentCombinedView>
{
  state: KeyboardNavigationState = {
    highlightedIndex: 0,
    expandedPostIndices: new Set<number>(),
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleHighlight = this.handleHighlight.bind(this);
    this.togglePostExpand = this.togglePostExpand.bind(this);
  }

  // KeyboardShortcutsComponent interface implementation
  getItems() {
    return this.props.content;
  }

  getCurrentIndex() {
    return this.state.highlightedIndex;
  }

  setCurrentIndex(index: number) {
    this.setState({ highlightedIndex: index });
  }

  scrollToIndex(index: number) {
    this.scrollToItem(index);
  }

  // Custom key handler for component-specific keys
  handleCustomKeys(
    event: KeyboardEvent,
    currentItem: PersonContentCombinedView,
  ): boolean {
    // Pagination shortcuts (work even when no items)
    if (event.key === "n" && this.props.onNextPage) {
      this.props.onNextPage();
      return true;
    }

    if (event.key === "P" && this.props.onFirstPage) {
      this.props.onFirstPage();
      return true;
    }

    if (event.key === "p" && this.props.onPrevPage) {
      this.props.onPrevPage();
      return true;
    }

    // For comments, let certain keys (r, e) bubble down to CommentNode
    // where the actual handlers are
    const isCommentItem =
      currentItem && "type_" in currentItem && currentItem.type_ === "comment";
    if (isCommentItem && (event.key === "r" || event.key === "e")) {
      // Don't handle these at PersonDetails level - let CommentNode handle them
      return false;
    }
    return false;
  }

  scrollToItem(index: number) {
    requestAnimationFrame(() => {
      const wrapperElement = document.querySelector(
        getPersonDetailIndexSelector(index),
      ) as HTMLElement;

      if (wrapperElement) {
        ensureInView(wrapperElement);

        // Focus the actual component (PostListing or CommentNode article) inside the wrapper
        // so that their onKeyDown handlers can fire
        const focusableElement = wrapperElement.querySelector(
          '.post-listing[tabindex="0"], article[tabindex="0"]',
        ) as HTMLElement;

        if (focusableElement) {
          focusableElement.focus();
        } else {
          // Fallback to wrapper if no focusable element found
          wrapperElement.focus();
        }
      }
    });
  }

  handleHighlight(itemIndex: number) {
    this.setState({ highlightedIndex: itemIndex });
  }

  togglePostExpand(postIndex: number) {
    this.setState(prevState => ({
      expandedPostIndices: toggleExpansion(
        prevState.expandedPostIndices,
        postIndex,
      ),
    }));
  }

  renderItemType(i: PersonContentCombinedView, idx: number): InfernoNode {
    const isHighlighted = this.state.highlightedIndex === idx;

    switch (i.type_) {
      case "comment": {
        return (
          <CommentNodes
            key={i.comment.id}
            nodes={[commentToFlatNode(i)]}
            viewType={"flat"}
            admins={this.props.admins}
            noBorder
            showCommunity
            showContext
            hideImages={false}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
            onCreateComment={this.props.onCreateComment}
            onEditComment={this.props.onEditComment}
            onCommentVote={this.props.onCommentVote}
            onBlockPerson={this.props.onBlockPerson}
            onBlockCommunity={this.props.onBlockCommunity}
            onSaveComment={this.props.onSaveComment}
            onDeleteComment={this.props.onDeleteComment}
            onRemoveComment={this.props.onRemoveComment}
            onDistinguishComment={this.props.onDistinguishComment}
            onAddModToCommunity={this.props.onAddModToCommunity}
            onAddAdmin={this.props.onAddAdmin}
            onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
            onBanPerson={this.props.onBanPerson}
            onTransferCommunity={this.props.onTransferCommunity}
            onFetchChildren={this.props.onFetchChildren}
            onCommentReport={this.props.onCommentReport}
            onPurgePerson={this.props.onPurgePerson}
            onPurgeComment={this.props.onPurgeComment}
            onPersonNote={this.props.onPersonNote}
            onLockComment={this.props.onLockComment}
            highlightedCommentId={isHighlighted ? i.comment.id : undefined}
          />
        );
      }
      case "post": {
        const isExpanded = this.state.expandedPostIndices.has(idx);
        return (
          <PostListing
            key={i.post.id}
            postView={i}
            showCrossPosts="show_separately"
            admins={this.props.admins}
            postListingMode="small_card"
            showCommunity
            crossPosts={[]}
            showBody={getShowBodyMode(this.state.expandedPostIndices, idx)}
            isExpanded={isExpanded}
            isHighlighted={isHighlighted}
            postIndex={idx}
            onToggleExpand={() => this.togglePostExpand(idx)}
            hideImage={false}
            viewOnly={false}
            disableAutoMarkAsRead={false}
            editLoading={false}
            enableNsfw={this.props.enableNsfw}
            showAdultConsentModal={this.props.showAdultConsentModal}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
            onPostEdit={this.props.onPostEdit}
            onPostVote={this.props.onPostVote}
            onPostReport={this.props.onPostReport}
            onBlockPerson={this.props.onBlockPerson}
            onBlockCommunity={this.props.onBlockCommunity}
            onLockPost={this.props.onLockPost}
            onDeletePost={this.props.onDeletePost}
            onRemovePost={this.props.onRemovePost}
            onSavePost={this.props.onSavePost}
            onFeaturePost={this.props.onFeaturePost}
            onPurgePerson={this.props.onPurgePerson}
            onPurgePost={this.props.onPurgePost}
            onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
            onBanPerson={this.props.onBanPerson}
            onAddModToCommunity={this.props.onAddModToCommunity}
            onAddAdmin={this.props.onAddAdmin}
            onTransferCommunity={this.props.onTransferCommunity}
            onHidePost={async () => {}}
            markable
            onMarkPostAsRead={this.props.onMarkPostAsRead}
            onPersonNote={this.props.onPersonNote}
            onScrollIntoCommentsClick={() => {}}
          />
        );
      }
    }
  }

  render(): InfernoNode {
    const combined: PersonContentCombinedView[] = this.props.content;

    return (
      <div
        className="person-details"
        role="feed"
        aria-label="User posts and comments"
        tabIndex={-1}
      >
        {combined.map((i, idx) => (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div
            key={
              i.type_ === "post"
                ? `post-${i.post.id}`
                : `comment-${i.comment.id}`
            }
            data-person-detail-index={idx}
            onClick={() => this.handleHighlight(idx)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                this.handleHighlight(idx);
                e.preventDefault();
              }
            }}
          >
            {this.renderItemType(i, idx)}
            {idx + 1 !== combined.length && <hr className="my-3" />}
          </div>
        ))}
      </div>
    );
  }
}
