import { colorList, getCommentParentId, showScores } from "@utils/app";
import { futureDaysToUnixTime, numToSI } from "@utils/helpers";
import classNames from "classnames";
import { isBefore, parseISO, subMinutes } from "date-fns";
import { Component, InfernoNode, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentId,
  CommentReplyView,
  CommentResponse,
  CommunityModeratorView,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  DeleteComment,
  DistinguishComment,
  EditComment,
  GetComments,
  Language,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  PersonMentionView,
  PersonView,
  PurgeComment,
  PurgePerson,
  RemoveComment,
  SaveComment,
  TransferCommunity,
} from "lemmy-js-client";
import deepEqual from "lodash.isequal";
import { commentTreeMaxDepth } from "../../config";
import {
  CommentNodeI,
  CommentNodeView,
  CommentViewType,
  VoteContentType,
} from "../../interfaces";
import { mdToHtml, mdToHtmlNoImages } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { setupTippy } from "../../tippy";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { UserBadges } from "../common/user-badges";
import { VoteButtonsCompact } from "../common/vote-buttons";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { CommentForm } from "./comment-form";
import { CommentNodes } from "./comment-nodes";
import { BanUpdateForm } from "../common/mod-action-form-modal";
import CommentActionDropdown from "../common/content-actions/comment-action-dropdown";
import { RequestState } from "../../services/HttpService";

type CommentNodeState = {
  showReply: boolean;
  showEdit: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  createOrEditCommentLoading: boolean;
  upvoteLoading: boolean;
  downvoteLoading: boolean;
  readLoading: boolean;
  fetchChildrenLoading: boolean;
};

interface CommentNodeProps {
  node: CommentNodeI;
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
  noBorder?: boolean;
  isTopLevel?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  enableDownvotes?: boolean;
  viewType: CommentViewType;
  allLanguages: Language[];
  siteLanguages: number[];
  hideImages?: boolean;
  finished: Map<CommentId, boolean | undefined>;
  onSaveComment(form: SaveComment): Promise<void>;
  onCommentReplyRead(form: MarkCommentReplyAsRead): void;
  onPersonMentionRead(form: MarkPersonMentionAsRead): void;
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
}

function handleToggleViewSource(i: CommentNode) {
  i.setState(({ viewSource, ...restPrev }) => ({
    viewSource: !viewSource,
    ...restPrev,
  }));
}

export class CommentNode extends Component<CommentNodeProps, CommentNodeState> {
  state: CommentNodeState = {
    showReply: false,
    showEdit: false,
    collapsed: false,
    viewSource: false,
    showAdvanced: false,
    createOrEditCommentLoading: false,
    upvoteLoading: false,
    downvoteLoading: false,
    readLoading: false,
    fetchChildrenLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleReplyCancel = this.handleReplyCancel.bind(this);
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
  }

  get commentView(): CommentNodeView {
    return this.props.node.comment_view;
  }

  get commentId(): CommentId {
    return this.commentView.comment.id;
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & CommentNodeProps>,
  ): void {
    if (!deepEqual(this.props, nextProps)) {
      this.setState({
        showEdit: false,
        showAdvanced: false,
        createOrEditCommentLoading: false,
        upvoteLoading: false,
        downvoteLoading: false,
        readLoading: false,
        fetchChildrenLoading: false,
      });
    }
  }

  render() {
    const node = this.props.node;
    const cv = this.commentView;
    const {
      creator_is_moderator,
      creator_is_admin,
      comment: { id, language_id, published, distinguished, updated },
      creator,
      community,
      post,
      counts,
      my_vote,
      banned_from_community,
    } = this.commentView;

    const moreRepliesBorderColor = this.props.node.depth
      ? colorList[this.props.node.depth % colorList.length]
      : colorList[0];

    const showMoreChildren =
      this.props.viewType === CommentViewType.Tree &&
      !this.state.collapsed &&
      node.children.length === 0 &&
      node.comment_view.counts.child_count > 0;

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
            <div className="d-flex flex-wrap align-items-center text-muted small">
              <button
                className="btn btn-sm btn-link text-muted me-2"
                onClick={linkEvent(this, this.handleCommentCollapse)}
                aria-label={this.expandText}
                data-tippy-content={this.expandText}
              >
                <Icon
                  icon={`${this.state.collapsed ? "plus" : "minus"}-square`}
                  classes="icon-inline"
                />
              </button>

              <PersonListing person={creator} />

              {cv.comment.distinguished && (
                <Icon icon="shield" inline classes="text-danger ms-1" />
              )}

              <UserBadges
                classNames="ms-1"
                isPostCreator={this.isPostCreator}
                isMod={creator_is_moderator}
                isAdmin={creator_is_admin}
                isBot={cv.creator.bot_account}
              />

              {this.props.showCommunity && (
                <>
                  <span className="mx-1">{I18NextService.i18n.t("to")}</span>
                  <CommunityLink community={community} />
                  <span className="mx-2">•</span>
                  <Link className="me-2" to={`/post/${cv.post.id}`}>
                    {post.name}
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
              {/* This is an expanding spacer for mobile */}
              <div className="me-lg-5 flex-grow-1 flex-lg-grow-0 unselectable pointer mx-2" />

              {showScores() && (
                <>
                  <span
                    className={`me-1 fw-bold ${this.scoreColor}`}
                    aria-label={I18NextService.i18n.t("number_of_points", {
                      count: Number(counts.score),
                      formattedCount: numToSI(counts.score),
                    })}
                  >
                    {numToSI(counts.score)}
                  </span>
                  <span className="me-1">•</span>
                </>
              )}
              <span>
                <MomentTime published={published} updated={updated} />
              </span>
            </div>
            {/* end of user row */}
            {this.state.showEdit && (
              <CommentForm
                node={node}
                edit
                onReplyCancel={this.handleReplyCancel}
                disabled={this.props.locked}
                finished={this.props.finished.get(id)}
                focus
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                containerClass="comment-comment-container"
                onUpsertComment={this.props.onEditComment}
              />
            )}
            {!this.state.showEdit && !this.state.collapsed && (
              <>
                <div className="comment-content">
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
                <div className="comment-bottom-btns d-flex justify-content-between justify-content-lg-start flex-wrap text-muted fw-bold mt-1">
                  {this.props.showContext && this.getLinkButton()}
                  {this.props.markable && (
                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(this, this.handleMarkAsRead)}
                      data-tippy-content={
                        this.commentReplyOrMentionRead
                          ? I18NextService.i18n.t("mark_as_unread")
                          : I18NextService.i18n.t("mark_as_read")
                      }
                      aria-label={
                        this.commentReplyOrMentionRead
                          ? I18NextService.i18n.t("mark_as_unread")
                          : I18NextService.i18n.t("mark_as_read")
                      }
                    >
                      {this.state.readLoading ? (
                        <Spinner />
                      ) : (
                        <Icon
                          icon="check"
                          classes={`icon-inline ${
                            this.commentReplyOrMentionRead && "text-success"
                          }`}
                        />
                      )}
                    </button>
                  )}
                  {UserService.Instance.myUserInfo &&
                    !(this.props.viewOnly || banned_from_community) && (
                      <>
                        <VoteButtonsCompact
                          voteContentType={VoteContentType.Comment}
                          id={id}
                          onVote={this.props.onCommentVote}
                          enableDownvotes={this.props.enableDownvotes}
                          counts={counts}
                          my_vote={my_vote}
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
                          admins={this.props.admins}
                          moderators={this.props.moderators}
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
            style={`border-left: 2px ${moreRepliesBorderColor} solid !important`}
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
                    count: counts.child_count,
                    formattedCount: numToSI(counts.child_count),
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
            disabled={this.props.locked}
            finished={this.props.finished.get(id)}
            focus
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            containerClass="comment-comment-container"
            onUpsertComment={this.props.onCreateComment}
          />
        )}
        {!this.state.collapsed && node.children.length > 0 && (
          <CommentNodes
            nodes={node.children}
            locked={this.props.locked}
            moderators={this.props.moderators}
            admins={this.props.admins}
            enableDownvotes={this.props.enableDownvotes}
            viewType={this.props.viewType}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            hideImages={this.props.hideImages}
            isChild={!this.props.isTopLevel}
            depth={this.props.node.depth + 1}
            finished={this.props.finished}
            onCommentReplyRead={this.props.onCommentReplyRead}
            onPersonMentionRead={this.props.onPersonMentionRead}
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
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div className="row col-12" />}
      </li>
    );
  }

  get commentReplyOrMentionRead(): boolean {
    const cv = this.commentView;

    if (this.isPersonMentionType(cv)) {
      return cv.person_mention.read;
    } else if (this.isCommentReplyType(cv)) {
      return cv.comment_reply.read;
    } else {
      return false;
    }
  }

  getLinkButton(small = false) {
    const cv = this.commentView;

    const classnames = classNames("btn btn-link btn-animate text-muted", {
      "btn-sm": small,
    });

    const title = this.props.showContext
      ? I18NextService.i18n.t("show_context")
      : I18NextService.i18n.t("link");

    return (
      <>
        <Link
          className={classnames}
          to={`/comment/${
            (this.props.showContext && getCommentParentId(cv.comment)) ||
            cv.comment.id
          }`}
          title={title}
        >
          <Icon icon="link" classes="icon-inline" />
        </Link>
        <a
          className={classnames}
          title={I18NextService.i18n.t("link")}
          href={cv.comment.ap_id}
        >
          <Icon icon="fedilink" classes="icon-inline" />
        </a>
      </>
    );
  }

  get myComment(): boolean {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ===
      this.commentView.creator.id
    );
  }

  get isPostCreator(): boolean {
    return this.commentView.creator.id === this.commentView.post.creator_id;
  }

  get scoreColor() {
    if (this.commentView.my_vote === 1) {
      return "text-info";
    } else if (this.commentView.my_vote === -1) {
      return "text-danger";
    } else {
      return "text-muted";
    }
  }

  get pointsTippy(): string {
    const points = I18NextService.i18n.t("number_of_points", {
      count: Number(this.commentView.counts.score),
      formattedCount: numToSI(this.commentView.counts.score),
    });

    const upvotes = I18NextService.i18n.t("number_of_upvotes", {
      count: Number(this.commentView.counts.upvotes),
      formattedCount: numToSI(this.commentView.counts.upvotes),
    });

    const downvotes = I18NextService.i18n.t("number_of_downvotes", {
      count: Number(this.commentView.counts.downvotes),
      formattedCount: numToSI(this.commentView.counts.downvotes),
    });

    return `${points} • ${upvotes} • ${downvotes}`;
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

  handleReplyClick() {
    this.setState({ showReply: true });
  }

  handleEditClick() {
    this.setState({ showEdit: true });
  }

  handleReplyCancel() {
    this.setState({ showReply: false, showEdit: false });
  }

  isPersonMentionType(item: CommentNodeView): item is PersonMentionView {
    return item.person_mention?.id !== undefined;
  }

  isCommentReplyType(item: CommentNodeView): item is CommentReplyView {
    return item.comment_reply?.id !== undefined;
  }

  get isCommentNew(): boolean {
    const now = subMinutes(new Date(), 10);
    const then = parseISO(this.commentView.comment.published);
    return isBefore(now, then);
  }

  handleCommentCollapse(i: CommentNode) {
    i.setState({ collapsed: !i.state.collapsed });
    setupTippy();
  }

  handleShowAdvanced(i: CommentNode) {
    i.setState({ showAdvanced: !i.state.showAdvanced });
    setupTippy();
  }

  async handleSaveComment() {
    this.props.onSaveComment({
      comment_id: this.commentView.comment.id,
      save: !this.commentView.saved,
    });
  }

  async handleBlockPerson() {
    this.props.onBlockPerson({
      person_id: this.commentView.creator.id,
      block: true,
    });
  }

  handleMarkAsRead(i: CommentNode) {
    i.setState({ readLoading: true });
    const cv = i.commentView;
    if (i.isPersonMentionType(cv)) {
      i.props.onPersonMentionRead({
        person_mention_id: cv.person_mention.id,
        read: !cv.person_mention.read,
      });
    } else if (i.isCommentReplyType(cv)) {
      i.props.onCommentReplyRead({
        comment_reply_id: cv.comment_reply.id,
        read: !cv.comment_reply.read,
      });
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
    shouldRemove,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id },
      creator_banned_from_community,
      community: { id: community_id },
    } = this.commentView;

    const ban = !creator_banned_from_community;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemove = false;
    }
    const expires = futureDaysToUnixTime(daysUntilExpires);

    this.props.onBanPersonFromCommunity({
      community_id,
      person_id,
      ban,
      remove_data: shouldRemove,
      reason,
      expires,
    });
  }

  async handleBanFromSite({
    daysUntilExpires,
    reason,
    shouldRemove,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id, banned },
    } = this.commentView;

    const ban = !banned;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemove = false;
    }
    const expires = futureDaysToUnixTime(daysUntilExpires);

    this.props.onBanPerson({
      person_id,
      ban,
      remove_data: shouldRemove,
      reason,
      expires,
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
      community_id: this.commentView.community.id,
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
      community_id: this.commentView.community.id,
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
      saved_only: false,
    });
  }
}
