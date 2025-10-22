import {
  colorList,
  userNotLoggedInOrBanned,
  getCommentParentId,
} from "@utils/app";
import { numToSI } from "@utils/helpers";
import { futureDaysToUnixTime } from "@utils/date";
import classNames from "classnames";
import { isBefore, parseISO, subMinutes } from "date-fns";
import { Component, InfernoNode, InfernoMouseEvent, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  CommentId,
  CommentSlimView,
  CommentView,
  Comment,
  Community,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  DeleteComment,
  DistinguishComment,
  EditComment,
  GetComments,
  Language,
  LocalSite,
  LockComment,
  MyUserInfo,
  NotePerson,
  PersonId,
  PersonView,
  PurgeComment,
  PurgePerson,
  RemoveComment,
  SaveComment,
  TransferCommunity,
} from "lemmy-js-client";
import { commentTreeMaxDepth } from "@utils/config";
import {
  CommentViewType,
  isCommentNodeFull,
  CommentNodeType,
} from "@utils/types";
import { mdToHtml, mdToHtmlNoImages } from "@utils/markdown";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { UserBadges } from "../common/user-badges";
import { VoteButtonsCompact } from "../common/vote-buttons";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { CommentForm } from "./comment-form";
import { CommentNodes } from "./comment-nodes";
import { BanUpdateForm } from "../common/modal/mod-action-form-modal";
import CommentActionDropdown from "../common/content-actions/comment-action-dropdown";
import { VoteDisplay } from "../common/vote-display";
import { canAdmin } from "@utils/roles";

type CommentNodeState = {
  showReply: boolean;
  showEdit: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  createOrEditCommentLoading: boolean;
  upvoteLoading: boolean;
  downvoteLoading: boolean;
  markLoading: boolean;
  fetchChildrenLoading: boolean;
};

type CommentNodeProps = {
  node: CommentNodeType;
  admins: PersonView[];
  readCommentsAt?: string;
  noBorder?: boolean;
  isTopLevel?: boolean;
  viewOnly?: boolean;
  postLockedOrRemovedOrDeleted?: boolean;
  showContext: boolean;
  showCommunity?: boolean;
  viewType: CommentViewType;
  allLanguages: Language[];
  siteLanguages: number[];
  hideImages: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  onSaveComment(form: SaveComment): void;
  onCreateComment(form: CreateComment): void;
  onEditComment(form: EditComment): void;
  onCommentVote(form: CreateCommentLike): void;
  onBlockPerson(form: BlockPerson): void;
  onBlockCommunity(form: BlockCommunity): void;
  onDeleteComment(form: DeleteComment): void;
  onRemoveComment(form: RemoveComment): void;
  onDistinguishComment(form: DistinguishComment): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onTransferCommunity(form: TransferCommunity): void;
  onFetchChildren?(form: GetComments): void;
  onCommentReport(form: CreateCommentReport): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgeComment(form: PurgeComment): void;
  onPersonNote(form: NotePerson): void;
  onLockComment(form: LockComment): void;
};

function handleToggleViewSource(i: CommentNode) {
  i.setState(({ viewSource, ...restPrev }) => ({
    viewSource: !viewSource,
    ...restPrev,
  }));
}

@tippyMixin
export class CommentNode extends Component<CommentNodeProps, CommentNodeState> {
  state: CommentNodeState = {
    showReply: false,
    showEdit: false,
    // Collapse comments that have no children and are removed by default
    collapsed:
      !this.commentView.comment.child_count && this.commentView.comment.removed,
    viewSource: false,
    showAdvanced: false,
    createOrEditCommentLoading: false,
    upvoteLoading: false,
    downvoteLoading: false,
    markLoading: false,
    fetchChildrenLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & CommentNodeProps>,
  ) {
    if (this.props.node.view !== nextProps.node.view) {
      this.setState({ markLoading: false });
    }
  }

  get commentView(): CommentView | CommentSlimView {
    return this.props.node.view.comment_view;
  }

  get commentId(): CommentId {
    return this.commentView.comment.id;
  }

  /**
   * Gets the community correctly if its the commentSlim variant
   **/
  get community(): Community {
    if (isCommentNodeFull(this.props.node)) {
      return this.props.node.view.comment_view.community;
    } else {
      return this.props.node.community;
    }
  }

  /**
   * Gets the postCreatorId correctly if its the commentSlim variant
   **/
  get postCreatorId(): PersonId {
    if (isCommentNodeFull(this.props.node)) {
      return this.props.node.view.comment_view.post.creator_id;
    } else {
      return this.props.node.postCreatorId;
    }
  }

  render() {
    const node = this.props.node;
    const {
      creator_is_moderator,
      creator_banned_from_community,
      creator_banned,

      comment_actions: { vote_is_upvote: myVoteIsUpvote } = {},
      creator_is_admin,
      comment: {
        deleted,
        removed,
        id,
        language_id,
        published_at,
        distinguished,
        updated_at,
        child_count,
        locked,
        post_id,
      },
      creator,
      person_actions,
    } = this.commentView;

    const moreRepliesBorderColor = node.view.depth
      ? colorList[node.view.depth % colorList.length]
      : colorList[0];

    const showMoreChildren =
      this.props.viewType === "tree" &&
      !this.state.collapsed &&
      node.view.children.length === 0 &&
      child_count > 0;

    return (
      <li className="comment list-unstyled">
        <article
          id={`comment-${id}`}
          className={classNames(`details comment-node py-2`, {
            "border-top border-light": !this.props.noBorder,
            mark: this.isCommentNew || distinguished,
          })}
        >
          <div className="ms-2">
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
            <div
              className="d-flex flex-wrap align-items-center text-muted small"
              onClick={linkEvent(this, handleCommentCollapse)}
              role="group"
            >
              <button
                className="btn btn-sm btn-link text-muted me-2"
                onClick={linkEvent(this, handleCommentCollapse)}
                aria-label={this.expandText}
                data-tippy-content={this.expandText}
                aria-pressed={this.state.collapsed ? "true" : "false"}
              >
                <Icon
                  icon={`${this.state.collapsed ? "plus" : "minus"}-square`}
                  classes="icon-inline"
                />
              </button>

              <PersonListing
                person={creator}
                myUserInfo={this.props.myUserInfo}
              />

              {distinguished && (
                <Icon icon="shield" inline classes="text-danger ms-1" />
              )}

              <UserBadges
                classNames="ms-1"
                isPostCreator={this.isPostCreator}
                isModerator={creator_is_moderator}
                isAdmin={creator_is_admin}
                creator={creator}
                isBanned={creator_banned}
                isBannedFromCommunity={creator_banned_from_community}
                myUserInfo={this.props.myUserInfo}
                personActions={person_actions}
              />

              {this.props.showCommunity &&
                isCommentNodeFull(this.props.node) && (
                  <>
                    <span className="mx-1">{I18NextService.i18n.t("to")}</span>
                    <CommunityLink
                      community={this.community}
                      myUserInfo={this.props.myUserInfo}
                    />
                    <span className="mx-2">•</span>
                    <Link className="me-2" to={`/post/${post_id}`}>
                      {this.props.node.view.comment_view.post.name}
                    </Link>
                  </>
                )}

              <LinkButton
                comment={this.commentView.comment}
                showContext={this.props.showContext}
                small
              />

              {language_id !== 0 && (
                <span className="badge text-bg-light d-none d-sm-inline me-2">
                  {
                    this.props.allLanguages.find(
                      lang => lang.id === language_id,
                    )?.name
                  }
                </span>
              )}
              {locked && (
                <span
                  className="mx-1"
                  data-tippy-content={I18NextService.i18n.t("locked")}
                >
                  <Icon icon="lock" classes="icon-inline" />
                </span>
              )}
              {deleted && (
                <span
                  className="mx-1"
                  data-tippy-content={I18NextService.i18n.t("deleted")}
                >
                  <Icon icon={"trash"} classes="icon-inline" />
                </span>
              )}
              {removed && (
                <span
                  className="mx-1"
                  data-tippy-content={I18NextService.i18n.t("removed")}
                >
                  <Icon icon={"x"} classes="icon-inline text-danger" />
                </span>
              )}
              {/* This is an expanding spacer for mobile */}
              <div className="me-lg-5 flex-grow-1 flex-lg-grow-0 unselectable pointer mx-2" />

              <VoteDisplay
                myUserInfo={this.props.myUserInfo}
                localSite={this.props.localSite}
                myVoteIsUpvote={myVoteIsUpvote}
                subject={this.commentView.comment}
              />
              <span>
                <MomentTime
                  published={published_at}
                  updated={updated_at}
                  showAgo={false}
                />
              </span>
            </div>
            {/* end of user row */}
            {this.state.showEdit && (
              <CommentForm
                node={node}
                edit
                onReplyCancel={() => handleReplyCancel(this)}
                disabled={!this.enableCommentForm}
                focus
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                containerClass="comment-comment-container"
                myUserInfo={this.props.myUserInfo}
                onEditComment={form => handleEditComment(this, form)}
                onCreateComment={() => {}}
              />
            )}
            {!this.state.showEdit && !this.state.collapsed && (
              <>
                <div
                  className={classNames("comment-content", {
                    "text-muted": deleted || removed,
                  })}
                >
                  {this.state.viewSource ? (
                    <pre>{this.commentUnlessRemoved}</pre>
                  ) : (
                    <div
                      className="md-div"
                      dangerouslySetInnerHTML={
                        this.props.hideImages
                          ? mdToHtmlNoImages(this.commentUnlessRemoved, () =>
                              this.forceUpdate(),
                            )
                          : mdToHtml(this.commentUnlessRemoved, () =>
                              this.forceUpdate(),
                            )
                      }
                    />
                  )}
                </div>
                <div className="comment-bottom-btns d-flex justify-content-start column-gap-1.5 flex-wrap text-muted fw-bold mt-1 align-items-center">
                  {this.props.showContext && (
                    <LinkButton
                      comment={this.commentView.comment}
                      showContext={this.props.showContext}
                      small={false}
                    />
                  )}
                  {this.props.myUserInfo &&
                    (this.canModOrAdmin ||
                      !(
                        this.props.viewOnly || creator_banned_from_community
                      )) && (
                      <>
                        <VoteButtonsCompact
                          voteContentType={"comment"}
                          id={id}
                          onVote={this.props.onCommentVote}
                          myUserInfo={this.props.myUserInfo}
                          localSite={this.props.localSite}
                          subject={this.commentView.comment}
                          myVoteIsUpvote={myVoteIsUpvote}
                          disabled={userNotLoggedInOrBanned(
                            this.props.myUserInfo,
                          )}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-link btn-animate text-muted py-0"
                          onClick={linkEvent(this, handleToggleViewSource)}
                          data-tippy-content={I18NextService.i18n.t(
                            "view_source",
                          )}
                          aria-label={I18NextService.i18n.t("view_source")}
                        >
                          <Icon
                            icon="file-text"
                            classes={`icon-inline ${
                              this.state.viewSource && "text-success"
                            }`}
                          />
                        </button>
                        <CommentActionDropdown
                          commentView={this.commentView}
                          community={this.community}
                          admins={this.props.admins}
                          myUserInfo={this.props.myUserInfo}
                          onReply={() => handleReplyClick(this)}
                          onReport={reason => handleReportComment(this, reason)}
                          onBlockPerson={() => handleBlockPerson(this)}
                          onBlockCommunity={() => handleBlockCommunity(this)}
                          onSave={() => handleSaveComment(this)}
                          onEdit={() => handleEditClick(this)}
                          onDelete={() => handleDeleteComment(this)}
                          onDistinguish={() => handleDistinguishComment(this)}
                          onRemove={reason => handleRemoveComment(this, reason)}
                          onBanFromCommunity={form =>
                            handleBanFromCommunity(this, form)
                          }
                          onAppointCommunityMod={() =>
                            handleAppointCommunityMod(this)
                          }
                          onTransferCommunity={() =>
                            handleTransferCommunity(this)
                          }
                          onPurgeUser={reason =>
                            handlePurgePerson(this, reason)
                          }
                          onPurgeContent={reason =>
                            handlePurgeComment(this, reason)
                          }
                          onBanFromSite={form => handleBanFromSite(this, form)}
                          onAppointAdmin={() => handleAppointAdmin(this)}
                          onPersonNote={form => handlePersonNote(this, form)}
                          onLock={reason => handleModLock(this, reason)}
                        />
                      </>
                    )}
                </div>
              </>
            )}
          </div>
        </article>
        {showMoreChildren && (
          <div
            className={classNames("details ms-1 comment-node py-2", {
              "border-top border-light": !this.props.noBorder,
            })}
            style={`border-left: var(--comment-border-width) ${moreRepliesBorderColor} solid !important`}
          >
            <button
              className="btn btn-sm btn-link text-muted"
              onClick={() => handleFetchChildren(this)}
            >
              {this.state.fetchChildrenLoading ? (
                <Spinner />
              ) : (
                <>
                  {I18NextService.i18n.t("x_more_replies", {
                    count: child_count,
                    formattedCount: numToSI(child_count),
                  })}{" "}
                  ➔
                </>
              )}
            </button>
          </div>
        )}
        {this.state.showReply && (
          <CommentForm
            node={node}
            onReplyCancel={() => handleReplyCancel(this)}
            disabled={!this.enableCommentForm}
            focus
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            containerClass="comment-comment-container"
            myUserInfo={this.props.myUserInfo}
            onCreateComment={form => handleCreateComment(this, form)}
            onEditComment={() => {}}
          />
        )}
        {!this.state.collapsed && node.view.children.length > 0 && (
          <CommentNodes
            nodes={buildNodeChildren(this.props.node)}
            postCreatorId={this.postCreatorId}
            community={this.community}
            postLockedOrRemovedOrDeleted={
              this.props.postLockedOrRemovedOrDeleted
            }
            showContext={false}
            admins={this.props.admins}
            readCommentsAt={this.props.readCommentsAt}
            viewType={this.props.viewType}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            hideImages={this.props.hideImages}
            isChild={!this.props.isTopLevel}
            depth={this.props.node.view.depth + 1}
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
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div className="row col-12" />}
      </li>
    );
  }

  get myComment(): boolean {
    return (
      this.props.myUserInfo?.local_user_view.person.id ===
      this.commentView.creator.id
    );
  }

  get isPostCreator(): boolean {
    return this.commentView.creator.id === this.postCreatorId;
  }

  get expandText(): string {
    return this.state.collapsed
      ? I18NextService.i18n.t("expand")
      : I18NextService.i18n.t("collapse");
  }

  get commentUnlessRemoved(): string {
    const comment = this.commentView.comment;
    return comment.removed
      ? `*${I18NextService.i18n.t("removed")}*`
      : comment.deleted
        ? `*${I18NextService.i18n.t("deleted")}*`
        : comment.content;
  }

  /**
   * Only enable the comment form if its not locked, or you're a mod / admin
   **/
  get enableCommentForm(): boolean {
    return (
      this.canModOrAdmin ||
      (!this.props.postLockedOrRemovedOrDeleted &&
        !this.commentView.comment.locked)
    );
  }

  get canModOrAdmin(): boolean {
    return (
      this.commentView.can_mod ||
      canAdmin(
        this.commentView.creator.id,
        this.props.admins,
        this.props.myUserInfo,
      )
    );
  }

  /**
   * From the post screen, use the last readCommentsAt time.
   *
   * For everything else, use 10 minutes.
   **/
  get isCommentNew(): boolean {
    const checkTime = this.props.readCommentsAt
      ? parseISO(this.props.readCommentsAt)
      : subMinutes(new Date(), 10);
    const commentTime = parseISO(this.commentView.comment.published_at);
    return isBefore(checkTime, commentTime);
  }
}

function handleReplyClick(i: CommentNode) {
  i.setState({ showReply: true });
}

function handleEditClick(i: CommentNode) {
  i.setState({ showEdit: true });
}

function handleReplyCancel(i: CommentNode) {
  i.setState({ showReply: false, showEdit: false });
}

function handleCreateComment(i: CommentNode, form: CreateComment) {
  i.props.onCreateComment(form);
  i.setState({ showReply: false, showEdit: false });
}

function handleEditComment(i: CommentNode, form: EditComment) {
  i.props.onEditComment(form);
  i.setState({ showReply: false, showEdit: false });
}

function handleCommentCollapse(i: CommentNode, event: InfernoMouseEvent<any>) {
  event.stopPropagation();
  i.setState({ collapsed: !i.state.collapsed });
}

function handleSaveComment(i: CommentNode) {
  i.props.onSaveComment({
    comment_id: i.commentView.comment.id,
    save: !i.commentView.comment_actions?.saved_at,
  });
}

function handleBlockPerson(i: CommentNode) {
  i.props.onBlockPerson({
    person_id: i.commentView.creator.id,
    block: true,
  });
}

function handleBlockCommunity(i: CommentNode) {
  i.props.onBlockCommunity({
    community_id: i.community.id,
    block: true,
  });
}

function handleDeleteComment(i: CommentNode) {
  i.props.onDeleteComment({
    comment_id: i.commentId,
    deleted: !i.commentView.comment.deleted,
  });
}

function handleRemoveComment(i: CommentNode, reason: string) {
  i.props.onRemoveComment({
    comment_id: i.commentId,
    removed: !i.commentView.comment.removed,
    reason,
  });
}

function handleDistinguishComment(i: CommentNode) {
  i.props.onDistinguishComment({
    comment_id: i.commentId,
    distinguished: !i.commentView.comment.distinguished,
  });
}

function handleBanFromCommunity(i: CommentNode, form: BanUpdateForm) {
  const {
    creator: { id: person_id },
    creator_banned_from_community,
  } = i.commentView;
  const community_id = i.community.id;

  let shouldRemoveOrRestoreData = form.shouldRemoveOrRestoreData;

  const ban = !creator_banned_from_community;
  // If its an unban, restore all their data
  if (ban === false) {
    shouldRemoveOrRestoreData = true;
  }
  const expires_at = futureDaysToUnixTime(form.daysUntilExpires);

  i.props.onBanPersonFromCommunity({
    community_id,
    person_id,
    ban,
    remove_or_restore_data: shouldRemoveOrRestoreData,
    reason: form.reason,
    expires_at,
  });
}

function handleBanFromSite(i: CommentNode, form: BanUpdateForm) {
  const {
    creator: { id: person_id },
    creator_banned,
  } = i.commentView;

  let shouldRemoveOrRestoreData = form.shouldRemoveOrRestoreData;

  const ban = !creator_banned;

  // If its an unban, restore all their data
  if (ban === false) {
    shouldRemoveOrRestoreData = true;
  }
  const expires_at = futureDaysToUnixTime(form.daysUntilExpires);

  i.props.onBanPerson({
    person_id,
    ban,
    remove_or_restore_data: shouldRemoveOrRestoreData,
    reason: form.reason,
    expires_at,
  });
}

function handleReportComment(i: CommentNode, reason: string) {
  i.props.onCommentReport({
    comment_id: i.commentId,
    reason,
  });
}

function handleAppointCommunityMod(i: CommentNode) {
  i.props.onAddModToCommunity({
    community_id: i.community.id,
    person_id: i.commentView.creator.id,
    added: !i.commentView.creator_is_moderator,
  });
}

function handleAppointAdmin(i: CommentNode) {
  i.props.onAddAdmin({
    person_id: i.commentView.creator.id,
    added: !i.commentView.creator_is_admin,
  });
}

function handlePersonNote(i: CommentNode, form: NotePerson) {
  i.props.onPersonNote(form);
}

function handleModLock(i: CommentNode, reason: string) {
  return i.props.onLockComment({
    comment_id: i.commentId,
    locked: !i.commentView.comment.locked,
    reason,
  });
}

function handlePurgePerson(i: CommentNode, reason: string) {
  i.props.onPurgePerson({
    person_id: i.commentView.creator.id,
    reason,
  });
}

function handlePurgeComment(i: CommentNode, reason: string) {
  i.props.onPurgeComment({
    comment_id: i.commentId,
    reason,
  });
}

function handleTransferCommunity(i: CommentNode) {
  i.props.onTransferCommunity({
    community_id: i.community.id,
    person_id: i.commentView.creator.id,
  });
}

function handleFetchChildren(i: CommentNode) {
  i.setState({ fetchChildrenLoading: true });
  i.props.onFetchChildren?.({
    parent_id: i.commentId,
    max_depth: commentTreeMaxDepth,
    limit: 999, // TODO
    type_: "all",
  });
}

type LinkButtonProps = {
  comment: Comment;
  showContext: boolean;
  small: boolean;
};

function LinkButton({ comment, showContext, small }: LinkButtonProps) {
  const classnames = classNames("btn btn-link btn-animate text-muted", {
    "btn-sm": small,
  });

  const title = showContext
    ? I18NextService.i18n.t("show_context")
    : I18NextService.i18n.t("link");

  const commentId = (showContext && getCommentParentId(comment)) || comment.id;
  return (
    <>
      <Link
        className={classnames}
        to={`/post/${comment.post_id}/${commentId}#comment-${commentId}`}
        title={title}
      >
        <Icon icon="link" classes="icon-inline" />
      </Link>
      <a
        className={classnames}
        title={I18NextService.i18n.t("fedilink")}
        href={comment.ap_id}
      >
        <Icon icon="fedilink" classes="icon-inline" />
      </a>
    </>
  );
}

function buildNodeChildren(node: CommentNodeType): CommentNodeType[] {
  if (isCommentNodeFull(node)) {
    return node.view.children.map(c => {
      return {
        view: c,
      };
    });
  } else {
    return node.view.children.map(c => {
      return {
        view: c,
        community: node.community,
        postCreatorId: node.postCreatorId,
      };
    });
  }
}

// TODO this is currently unused, but the code may be useful for the notifications screen, when that gets fully added.
// function markAsRead() {
//   return (
//     this.props.markable && (
//       <button
//         className="btn btn-sm btn-link btn-animate text-muted"
//         onClick={linkEvent(this, this.handleMarkAsRead)}
//         data-tippy-content={
//           this.props.read
//             ? I18NextService.i18n.t("mark_as_unread")
//             : I18NextService.i18n.t("mark_as_read")
//         }
//         aria-label={
//           this.props.read
//             ? I18NextService.i18n.t("mark_as_unread")
//             : I18NextService.i18n.t("mark_as_read")
//         }
//       >
//         {this.state.markLoading ? (
//           <Spinner />
//         ) : (
//           <Icon
//             icon="check"
//             classes={`icon-inline ${this.props.read && "text-success"}`}
//           />
//         )}
//       </button>
//     )
//   );
// }
