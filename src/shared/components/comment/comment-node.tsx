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
  BlockPerson,
  CommentId,
  CommentResponse,
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
  CommentNodeI,
  CommentNodeView,
  CommentViewType,
  isCommentView,
  VoteContentType,
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
import { RequestState } from "../../services/HttpService";
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
  node: CommentNodeI;
  /**
   * Only use this for the CommentSlim variant.
   **/
  postCreatorId?: PersonId;
  /**
   * Only use this for the CommentSlim variant.
   **/
  community?: Community;
  admins: PersonView[];
  readCommentsAt?: string;
  noBorder?: boolean;
  isTopLevel?: boolean;
  viewOnly?: boolean;
  postLocked?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  viewType: CommentViewType;
  allLanguages: Language[];
  siteLanguages: number[];
  hideImages?: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  onSaveComment(form: SaveComment): Promise<void>;
  onCreateComment(
    form: EditComment | CreateComment,
  ): Promise<RequestState<CommentResponse>>;
  onEditComment(
    form: EditComment | CreateComment,
  ): Promise<RequestState<CommentResponse>>;
  onCommentVote(form: CreateCommentLike): Promise<void>;
  onBlockPerson(form: BlockPerson): Promise<void>;
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
  onPersonNote(form: NotePerson): Promise<void>;
  onLockComment(form: LockComment): Promise<void>;
} & (
  | { markable?: false }
  | {
      markable: true;
      read: boolean;
      onMarkRead(comment_id: number, read: boolean): void;
    }
);

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

    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleReportComment = this.handleReportComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleReplyClick = this.handleReplyClick.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleEditClick = this.handleEditClick.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanFromSite = this.handleBanFromSite.bind(this);
    this.handleAppointCommunityMod = this.handleAppointCommunityMod.bind(this);
    this.handleAppointAdmin = this.handleAppointAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handlePersonNote = this.handlePersonNote.bind(this);
    this.handleModLock = this.handleModLock.bind(this);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & CommentNodeProps>,
  ) {
    if (this.props.node.comment_view !== nextProps.node.comment_view) {
      this.setState({ markLoading: false });
    }
  }

  get commentView(): CommentNodeView {
    return this.props.node.comment_view;
  }

  get commentId(): CommentId {
    return this.commentView.comment.id;
  }

  /**
   * Gets the community correctly if its the commentSlim variant
   **/
  get community(): Community {
    if (isCommentView(this.commentView)) {
      return this.commentView.community;
    } else {
      return this.props.community!;
    }
  }

  /**
   * Gets the postCreatorId correctly if its the commentSlim variant
   **/
  get postCreatorId(): PersonId {
    if (isCommentView(this.commentView)) {
      return this.commentView.post.creator_id;
    } else {
      return this.props.postCreatorId!;
    }
  }

  render() {
    const node = this.props.node;
    const {
      creator_is_moderator,
      creator_banned_from_community,
      creator_banned,

      comment_actions: { like_score: my_vote } = {},
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

    const moreRepliesBorderColor = this.props.node.depth
      ? colorList[this.props.node.depth % colorList.length]
      : colorList[0];

    const showMoreChildren =
      this.props.viewType === CommentViewType.Tree &&
      !this.state.collapsed &&
      node.children.length === 0 &&
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
              onClick={linkEvent(this, this.handleCommentCollapse)}
              role="group"
            >
              <button
                className="btn btn-sm btn-link text-muted me-2"
                onClick={linkEvent(this, this.handleCommentCollapse)}
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

              {this.props.showCommunity && isCommentView(this.commentView) && (
                <>
                  <span className="mx-1">{I18NextService.i18n.t("to")}</span>
                  <CommunityLink
                    community={this.commentView.community}
                    myUserInfo={this.props.myUserInfo}
                  />
                  <span className="mx-2">•</span>
                  <Link className="me-2" to={`/post/${post_id}`}>
                    {this.commentView.post.name}
                  </Link>
                </>
              )}

              {this.getLinkButton(true)}

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
                myVote={my_vote}
                subject={this.props.node.comment_view.comment}
              />
              <span>
                <MomentTime published={published_at} updated={updated_at} />
              </span>
            </div>
            {/* end of user row */}
            {this.state.showEdit && (
              <CommentForm
                node={node}
                edit
                onReplyCancel={this.handleReplyCancel}
                disabled={!this.enableCommentForm}
                focus
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                containerClass="comment-comment-container"
                myUserInfo={this.props.myUserInfo}
                onUpsertComment={this.handleEditComment}
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
                  {this.props.showContext && this.getLinkButton()}
                  {this.props.markable && (
                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(this, this.handleMarkAsRead)}
                      data-tippy-content={
                        this.props.read
                          ? I18NextService.i18n.t("mark_as_unread")
                          : I18NextService.i18n.t("mark_as_read")
                      }
                      aria-label={
                        this.props.read
                          ? I18NextService.i18n.t("mark_as_unread")
                          : I18NextService.i18n.t("mark_as_read")
                      }
                    >
                      {this.state.markLoading ? (
                        <Spinner />
                      ) : (
                        <Icon
                          icon="check"
                          classes={`icon-inline ${
                            this.props.read && "text-success"
                          }`}
                        />
                      )}
                    </button>
                  )}
                  {this.props.myUserInfo &&
                    !(this.props.viewOnly || creator_banned_from_community) && (
                      <>
                        <VoteButtonsCompact
                          voteContentType={VoteContentType.Comment}
                          id={id}
                          onVote={this.props.onCommentVote}
                          myUserInfo={this.props.myUserInfo}
                          localSite={this.props.localSite}
                          subject={this.props.node.comment_view.comment}
                          myVote={my_vote}
                          disabled={userNotLoggedInOrBanned(
                            this.props.myUserInfo,
                          )}
                        />
                        <button
                          type="button"
                          className="btn btn-link btn-animate text-muted"
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
                          onReply={this.handleReplyClick}
                          onReport={this.handleReportComment}
                          onBlock={this.handleBlockPerson}
                          onSave={this.handleSaveComment}
                          onEdit={this.handleEditClick}
                          onDelete={this.handleDeleteComment}
                          onDistinguish={this.handleDistinguishComment}
                          onRemove={this.handleRemoveComment}
                          onBanFromCommunity={this.handleBanFromCommunity}
                          onAppointCommunityMod={this.handleAppointCommunityMod}
                          onTransferCommunity={this.handleTransferCommunity}
                          onPurgeUser={this.handlePurgePerson}
                          onPurgeContent={this.handlePurgeComment}
                          onBanFromSite={this.handleBanFromSite}
                          onAppointAdmin={this.handleAppointAdmin}
                          onPersonNote={this.handlePersonNote}
                          onLock={this.handleModLock}
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
              className="btn btn-link text-muted"
              onClick={linkEvent(this, this.handleFetchChildren)}
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
            onReplyCancel={this.handleReplyCancel}
            disabled={!this.enableCommentForm}
            focus
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            containerClass="comment-comment-container"
            myUserInfo={this.props.myUserInfo}
            onUpsertComment={this.handleCreateComment}
          />
        )}
        {!this.state.collapsed && node.children.length > 0 && (
          <CommentNodes
            nodes={node.children}
            postCreatorId={this.postCreatorId}
            community={this.community}
            postLocked={this.props.postLocked}
            admins={this.props.admins}
            readCommentsAt={this.props.readCommentsAt}
            viewType={this.props.viewType}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            hideImages={this.props.hideImages}
            isChild={!this.props.isTopLevel}
            depth={this.props.node.depth + 1}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
            onCreateComment={this.props.onCreateComment}
            onEditComment={this.props.onEditComment}
            onCommentVote={this.props.onCommentVote}
            onBlockPerson={this.props.onBlockPerson}
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

  getLinkButton(small = false) {
    const cv = this.commentView;

    const classnames = classNames("btn btn-link btn-animate text-muted", {
      "btn-sm": small,
    });

    const title = this.props.showContext
      ? I18NextService.i18n.t("show_context")
      : I18NextService.i18n.t("link");

    const commentId =
      (this.props.showContext && getCommentParentId(cv.comment)) ||
      cv.comment.id;
    return (
      <>
        <Link
          className={classnames}
          to={`/post/${cv.comment.post_id}/${commentId}#comment-${commentId}`}
          title={title}
        >
          <Icon icon="link" classes="icon-inline" />
        </Link>
        <a
          className={classnames}
          title={I18NextService.i18n.t("fedilink")}
          href={cv.comment.ap_id}
        >
          <Icon icon="fedilink" classes="icon-inline" />
        </a>
      </>
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
    const canModOrAdmin =
      this.commentView.can_mod ||
      canAdmin(
        this.commentView.creator.id,
        this.props.admins,
        this.props.myUserInfo,
      );

    return (
      canModOrAdmin ||
      (!this.props.postLocked && !this.commentView.comment.locked)
    );
  }

  handleReplyClick() {
    this.setState({ showReply: true });
  }

  handleEditClick() {
    this.setState({ showEdit: true });
  }

  handleReplyCancel() {
    this.setState({ showReply: false, showEdit: false });
  }

  async handleCreateComment(
    form: CreateComment,
  ): Promise<RequestState<CommentResponse>> {
    const res = await this.props.onCreateComment(form);
    if (res.state !== "failed") {
      this.setState({ showReply: false, showEdit: false });
    }
    return res;
  }

  async handleEditComment(
    form: EditComment,
  ): Promise<RequestState<CommentResponse>> {
    const res = await this.props.onEditComment(form);
    if (res.state !== "failed") {
      this.setState({ showReply: false, showEdit: false });
    }
    return res;
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

  handleCommentCollapse(i: CommentNode, event: InfernoMouseEvent<any>) {
    event.stopPropagation();
    i.setState({ collapsed: !i.state.collapsed });
  }

  handleShowAdvanced(i: CommentNode) {
    i.setState({ showAdvanced: !i.state.showAdvanced });
  }

  async handleSaveComment() {
    this.props.onSaveComment({
      comment_id: this.commentView.comment.id,
      save: !this.commentView.comment_actions?.saved_at,
    });
  }

  async handleBlockPerson() {
    this.props.onBlockPerson({
      person_id: this.commentView.creator.id,
      block: true,
    });
  }

  handleMarkAsRead(i: CommentNode) {
    if (i.props.markable) {
      i.setState({ markLoading: true });
      const cv = i.commentView;
      i.props.onMarkRead(cv.comment.id, !i.props.read);
    }
  }

  async handleDeleteComment() {
    this.props.onDeleteComment({
      comment_id: this.commentId,
      deleted: !this.commentView.comment.deleted,
    });
  }

  async handleRemoveComment(reason: string) {
    this.props.onRemoveComment({
      comment_id: this.commentId,
      removed: !this.commentView.comment.removed,
      reason,
    });
  }

  async handleDistinguishComment() {
    this.props.onDistinguishComment({
      comment_id: this.commentId,
      distinguished: !this.commentView.comment.distinguished,
    });
  }

  async handleBanFromCommunity({
    daysUntilExpires,
    reason,
    shouldRemoveOrRestoreData,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id },
      creator_banned_from_community,
    } = this.commentView;
    const community_id = this.community.id;

    const ban = !creator_banned_from_community;
    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemoveOrRestoreData = true;
    }
    const expires_at = futureDaysToUnixTime(daysUntilExpires);

    this.props.onBanPersonFromCommunity({
      community_id,
      person_id,
      ban,
      remove_or_restore_data: shouldRemoveOrRestoreData,
      reason,
      expires_at,
    });
  }

  async handleBanFromSite({
    daysUntilExpires,
    reason,
    shouldRemoveOrRestoreData,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id },
      creator_banned,
    } = this.commentView;

    const ban = !creator_banned;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemoveOrRestoreData = true;
    }
    const expires_at = futureDaysToUnixTime(daysUntilExpires);

    this.props.onBanPerson({
      person_id,
      ban,
      remove_or_restore_data: shouldRemoveOrRestoreData,
      reason,
      expires_at,
    });
  }

  async handleReportComment(reason: string) {
    this.props.onCommentReport({
      comment_id: this.commentId,
      reason,
    });
  }

  async handleAppointCommunityMod() {
    this.props.onAddModToCommunity({
      community_id: this.community.id,
      person_id: this.commentView.creator.id,
      added: !this.commentView.creator_is_moderator,
    });
  }

  async handleAppointAdmin() {
    this.props.onAddAdmin({
      person_id: this.commentView.creator.id,
      added: !this.commentView.creator_is_admin,
    });
  }

  async handlePersonNote(form: NotePerson) {
    this.props.onPersonNote(form);
  }

  async handleModLock(reason: string) {
    return this.props.onLockComment({
      comment_id: this.commentId,
      locked: !this.commentView.comment.locked,
      reason,
    });
  }

  async handlePurgePerson(reason: string) {
    this.props.onPurgePerson({
      person_id: this.commentView.creator.id,
      reason,
    });
  }

  async handlePurgeComment(reason: string) {
    this.props.onPurgeComment({
      comment_id: this.commentId,
      reason,
    });
  }

  async handleTransferCommunity() {
    this.props.onTransferCommunity({
      community_id: this.community.id,
      person_id: this.commentView.creator.id,
    });
  }

  handleFetchChildren(i: CommentNode) {
    i.setState({ fetchChildrenLoading: true });
    i.props.onFetchChildren?.({
      parent_id: i.commentId,
      max_depth: commentTreeMaxDepth,
      limit: 999, // TODO
      type_: "All",
    });
  }
}
