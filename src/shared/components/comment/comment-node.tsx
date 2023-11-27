import { colorList, getCommentParentId, showScores } from "@utils/app";
import { futureDaysToUnixTime, numToSI } from "@utils/helpers";
import classNames from "classnames";
import isBefore from "date-fns/isBefore";
import parseISO from "date-fns/parseISO";
import subMinutes from "date-fns/subMinutes";
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
  CommentView,
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
  BanType,
  CommentNodeI,
  CommentViewType,
  PurgeType,
  VoteContentType,
} from "../../interfaces";
import { mdToHtml, mdToHtmlNoImages } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { setupTippy } from "../../tippy";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { UserBadges } from "../common/user-badges";
import { VoteButtonsCompact } from "../common/vote-buttons";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { CommentForm } from "./comment-form";
import { CommentNodes } from "./comment-nodes";
import ModerationActionForm from "../common/mod-action-form";
import CommentActionDropdown from "../common/content-actions/comment-action-dropdown";

interface CommentNodeState {
  showReply: boolean;
  showEdit: boolean;
  showRemoveDialog: boolean;
  removeReason?: string;
  showBanDialog: boolean;
  removeData: boolean;
  banReason?: string;
  banExpireDays?: number;
  banType: BanType;
  showPurgeDialog: boolean;
  purgeReason?: string;
  purgeType: PurgeType;
  showConfirmTransferSite: boolean;
  showConfirmTransferCommunity: boolean;
  showConfirmAppointAsMod: boolean;
  showConfirmAppointAsAdmin: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showReportDialog: boolean;
  createOrEditCommentLoading: boolean;
  upvoteLoading: boolean;
  downvoteLoading: boolean;
  saveLoading: boolean;
  readLoading: boolean;
  blockPersonLoading: boolean;
  deleteLoading: boolean;
  removeLoading: boolean;
  distinguishLoading: boolean;
  banLoading: boolean;
  addModLoading: boolean;
  addAdminLoading: boolean;
  transferCommunityLoading: boolean;
  fetchChildrenLoading: boolean;
  purgeLoading: boolean;
}

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
  onSaveComment(form: SaveComment): void;
  onCommentReplyRead(form: MarkCommentReplyAsRead): void;
  onPersonMentionRead(form: MarkPersonMentionAsRead): void;
  onCreateComment(form: EditComment | CreateComment): void;
  onEditComment(form: EditComment | CreateComment): void;
  onCommentVote(form: CreateCommentLike): void;
  onBlockPerson(form: BlockPerson): void;
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
}

export class CommentNode extends Component<CommentNodeProps, CommentNodeState> {
  state: CommentNodeState = {
    showReply: false,
    showEdit: false,
    showRemoveDialog: false,
    showBanDialog: false,
    removeData: false,
    banType: BanType.Community,
    showPurgeDialog: false,
    purgeType: PurgeType.Person,
    collapsed: false,
    viewSource: false,
    showAdvanced: false,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    showConfirmAppointAsMod: false,
    showConfirmAppointAsAdmin: false,
    showReportDialog: false,
    createOrEditCommentLoading: false,
    upvoteLoading: false,
    downvoteLoading: false,
    saveLoading: false,
    readLoading: false,
    blockPersonLoading: false,
    deleteLoading: false,
    removeLoading: false,
    distinguishLoading: false,
    banLoading: false,
    addModLoading: false,
    addAdminLoading: false,
    transferCommunityLoading: false,
    fetchChildrenLoading: false,
    purgeLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handleReportComment = this.handleReportComment.bind(this);
    this.handleReplyClick = this.handleReplyClick.bind(this);
    this.handleShowReportDialog = this.handleShowReportDialog.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleEditClick = this.handleEditClick.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleModRemoveShow = this.handleModRemoveShow.bind(this);
    this.handleModBanFromCommunityShow =
      this.handleModBanFromCommunityShow.bind(this);
    this.handleShowConfirmAppointAsMod =
      this.handleShowConfirmAppointAsMod.bind(this);
    this.handleShowConfirmTransferCommunity;
    this.handlePurgePersonShow = this.handlePurgePersonShow.bind(this);
    this.handlePurgeCommentShow = this.handlePurgeCommentShow.bind(this);
    this.handleModBanShow = this.handleModBanShow.bind(this);
    this.handleShowConfirmAppointAsAdmin =
      this.handleShowConfirmAppointAsAdmin.bind(this);
  }

  get commentView(): CommentView {
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
        showRemoveDialog: false,
        showBanDialog: false,
        removeData: false,
        banType: BanType.Community,
        showPurgeDialog: false,
        purgeType: PurgeType.Person,
        collapsed: false,
        viewSource: false,
        showAdvanced: false,
        showConfirmTransferSite: false,
        showConfirmTransferCommunity: false,
        showConfirmAppointAsMod: false,
        showConfirmAppointAsAdmin: false,
        showReportDialog: false,
        createOrEditCommentLoading: false,
        upvoteLoading: false,
        downvoteLoading: false,
        saveLoading: false,
        readLoading: false,
        blockPersonLoading: false,
        deleteLoading: false,
        removeLoading: false,
        distinguishLoading: false,
        banLoading: false,
        addModLoading: false,
        addAdminLoading: false,
        transferCommunityLoading: false,
        fetchChildrenLoading: false,
        purgeLoading: false,
      });
    }
  }

  render() {
    const node = this.props.node;
    const cv = this.commentView;

    const purgeTypeText =
      this.state.purgeType === PurgeType.Comment
        ? I18NextService.i18n.t("purge_comment")
        : `${I18NextService.i18n.t("purge")} ${cv.creator.name}`;

    const isMod_ = cv.creator_is_moderator;
    const isAdmin_ = cv.creator_is_admin;

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
          id={`comment-${cv.comment.id}`}
          className={classNames(`details comment-node py-2`, {
            "border-top border-light": !this.props.noBorder,
            mark: this.isCommentNew || this.commentView.comment.distinguished,
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

              <PersonListing person={cv.creator} />

              {cv.comment.distinguished && (
                <Icon icon="shield" inline classes="text-danger ms-1" />
              )}

              <UserBadges
                classNames="ms-1"
                isPostCreator={this.isPostCreator}
                isMod={isMod_}
                isAdmin={isAdmin_}
                isBot={cv.creator.bot_account}
              />

              {this.props.showCommunity && (
                <>
                  <span className="mx-1">{I18NextService.i18n.t("to")}</span>
                  <CommunityLink community={cv.community} />
                  <span className="mx-2">•</span>
                  <Link className="me-2" to={`/post/${cv.post.id}`}>
                    {cv.post.name}
                  </Link>
                </>
              )}

              {this.getLinkButton(true)}

              {cv.comment.language_id !== 0 && (
                <span className="badge text-bg-light d-none d-sm-inline me-2">
                  {
                    this.props.allLanguages.find(
                      lang => lang.id === cv.comment.language_id,
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
                      count: Number(this.commentView.counts.score),
                      formattedCount: numToSI(this.commentView.counts.score),
                    })}
                  >
                    {numToSI(this.commentView.counts.score)}
                  </span>
                  <span className="me-1">•</span>
                </>
              )}
              <span>
                <MomentTime
                  published={cv.comment.published}
                  updated={cv.comment.updated}
                />
              </span>
            </div>
            {/* end of user row */}
            {this.state.showEdit && (
              <CommentForm
                node={node}
                edit
                onReplyCancel={this.handleReplyCancel}
                disabled={this.props.locked}
                finished={this.props.finished.get(
                  this.props.node.comment_view.comment.id,
                )}
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
                          ? mdToHtmlNoImages(this.commentUnlessRemoved)
                          : mdToHtml(this.commentUnlessRemoved)
                      }
                    />
                  )}
                </div>
                <div className="comment-bottom-btns d-flex justify-content-between justify-content-lg-start flex-wrap text-muted fw-bold">
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
                  {UserService.Instance.myUserInfo && !this.props.viewOnly && (
                    <>
                      <VoteButtonsCompact
                        voteContentType={VoteContentType.Comment}
                        id={this.commentView.comment.id}
                        onVote={this.props.onCommentVote}
                        enableDownvotes={this.props.enableDownvotes}
                        counts={this.commentView.counts}
                        my_vote={this.commentView.my_vote}
                      />
                      <CommentActionDropdown
                        commentView={this.commentView}
                        admins={this.props.admins}
                        moderators={this.props.moderators}
                        onReply={this.handleReplyClick}
                        onReport={this.handleShowReportDialog}
                        onBlock={this.handleBlockPerson}
                        onSave={this.handleSaveComment}
                        onEdit={this.handleEditClick}
                        onDelete={this.handleDeleteComment}
                        onDistinguish={this.handleDistinguishComment}
                        onRemove={this.handleModRemoveShow}
                        onBanFromCommunity={this.handleModBanFromCommunityShow}
                        onAddCommunityMod={this.handleShowConfirmAppointAsMod}
                        onTransferCommunity={
                          this.handleShowConfirmTransferCommunity
                        }
                        onPurgeUser={this.handlePurgePersonShow}
                        onPurgeContent={this.handlePurgeCommentShow}
                        onBanFromLocal={this.handleModBanShow}
                        onAddAdmin={this.handleShowConfirmAppointAsAdmin}
                      />
                    </>
                  )}
                </div>
                {/* end of button group */}
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
                    count: node.comment_view.counts.child_count,
                    formattedCount: numToSI(
                      node.comment_view.counts.child_count,
                    ),
                  })}{" "}
                  ➔
                </>
              )}
            </button>
          </div>
        )}
        {/* end of details */}
        {this.state.showRemoveDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleRemoveComment)}
          >
            <label
              className="visually-hidden"
              htmlFor={`mod-remove-reason-${cv.comment.id}`}
            >
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              id={`mod-remove-reason-${cv.comment.id}`}
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("reason")}
              value={this.state.removeReason}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={I18NextService.i18n.t("remove_comment")}
            >
              {I18NextService.i18n.t("remove_comment")}
            </button>
          </form>
        )}
        {this.state.showReportDialog && (
          <ModerationActionForm
            onSubmit={this.handleReportComment}
            modActionType="report"
            onCancel={() => {}}
          />
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div className="mb-3 row col-12">
              <label
                className="col-form-label"
                htmlFor={`mod-ban-reason-${cv.comment.id}`}
              >
                {I18NextService.i18n.t("reason")}
              </label>
              <input
                type="text"
                id={`mod-ban-reason-${cv.comment.id}`}
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("reason")}
                value={this.state.banReason}
                onInput={linkEvent(this, this.handleModBanReasonChange)}
              />
              <label
                className="col-form-label"
                htmlFor={`mod-ban-expires-${cv.comment.id}`}
              >
                {I18NextService.i18n.t("expires")}
              </label>
              <input
                type="number"
                id={`mod-ban-expires-${cv.comment.id}`}
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("number_of_days")}
                value={this.state.banExpireDays}
                onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
              />
              <div className="input-group mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    id="mod-ban-remove-data"
                    type="checkbox"
                    checked={this.state.removeData}
                    onChange={linkEvent(this, this.handleModRemoveDataChange)}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="mod-ban-remove-data"
                    title={I18NextService.i18n.t("remove_content_more")}
                  >
                    {I18NextService.i18n.t("remove_content")}
                  </label>
                </div>
              </div>
            </div>
            {/* TODO hold off on expires until later */}
            {/* <div class="mb-3 row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control me-2" placeholder={I18NextService.i18n.t('expires')} value={this.state.banExpires} onInput={linkEvent(this, this.handleModBanExpiresChange)} /> */}
            {/* </div> */}
            <div className="mb-3 row">
              <button
                type="submit"
                className="btn btn-secondary"
                aria-label={I18NextService.i18n.t("ban")}
              >
                {this.state.banLoading ? (
                  <Spinner />
                ) : (
                  <span>
                    {I18NextService.i18n.t("ban")} {cv.creator.name}
                  </span>
                )}
              </button>
            </div>
          </form>
        )}

        {this.state.showPurgeDialog && (
          <form onSubmit={linkEvent(this, this.handlePurgeBothSubmit)}>
            <PurgeWarning />
            <label className="visually-hidden" htmlFor="purge-reason">
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              id="purge-reason"
              className="form-control my-3"
              placeholder={I18NextService.i18n.t("reason")}
              value={this.state.purgeReason}
              onInput={linkEvent(this, this.handlePurgeReasonChange)}
            />
            <div className="mb-3 row col-12">
              {this.state.purgeLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary"
                  aria-label={purgeTypeText}
                >
                  {purgeTypeText}
                </button>
              )}
            </div>
          </form>
        )}
        {this.state.showReply && (
          <CommentForm
            node={node}
            onReplyCancel={this.handleReplyCancel}
            disabled={this.props.locked}
            finished={this.props.finished.get(
              this.props.node.comment_view.comment.id,
            )}
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

    // The context button should show the parent comment by default
    const parentCommentId = getCommentParentId(cv.comment) ?? cv.comment.id;

    return (
      <>
        <Link
          className={classnames}
          to={`/comment/${parentCommentId}`}
          title={title}
        >
          <Icon icon="link" classes="icon-inline" />
        </Link>
        {
          <a className={classnames} title={title} href={cv.comment.ap_id}>
            <Icon icon="fedilink" classes="icon-inline" />
          </a>
        }
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

  handleShowReportDialog() {
    this.setState(prev => ({
      ...prev,
      showReportDialog: !prev.showReportDialog,
    }));
  }

  handleModRemoveShow() {
    this.setState({
      showRemoveDialog: !this.state.showRemoveDialog,
      showBanDialog: false,
    });
  }

  handleModRemoveReasonChange(i: CommentNode, event: any) {
    i.setState({ removeReason: event.target.value });
  }

  handleModRemoveDataChange(i: CommentNode, event: any) {
    i.setState({ removeData: event.target.checked });
  }

  isPersonMentionType(
    item: CommentView | PersonMentionView | CommentReplyView,
  ): item is PersonMentionView {
    return (item as PersonMentionView).person_mention?.id !== undefined;
  }

  isCommentReplyType(
    item: CommentView | PersonMentionView | CommentReplyView,
  ): item is CommentReplyView {
    return (item as CommentReplyView).comment_reply?.id !== undefined;
  }

  handleModBanFromCommunityShow() {
    this.setState({
      showBanDialog: true,
      banType: BanType.Community,
      showRemoveDialog: false,
    });
  }

  handleModBanShow() {
    this.setState({
      showBanDialog: true,
      banType: BanType.Site,
      showRemoveDialog: false,
    });
  }

  handleModBanReasonChange(i: CommentNode, event: any) {
    i.setState({ banReason: event.target.value });
  }

  handleModBanExpireDaysChange(i: CommentNode, event: any) {
    i.setState({ banExpireDays: event.target.value });
  }

  handlePurgePersonShow() {
    this.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Person,
      showRemoveDialog: false,
    });
  }

  handlePurgeCommentShow() {
    this.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Comment,
      showRemoveDialog: false,
    });
  }

  handlePurgeReasonChange(i: CommentNode, event: any) {
    i.setState({ purgeReason: event.target.value });
  }

  handleShowConfirmAppointAsMod() {
    this.setState({ showConfirmAppointAsMod: true });
  }

  handleCancelConfirmAppointAsMod(i: CommentNode) {
    i.setState({ showConfirmAppointAsMod: false });
  }

  handleShowConfirmAppointAsAdmin() {
    this.setState({ showConfirmAppointAsAdmin: true });
  }

  handleCancelConfirmAppointAsAdmin(i: CommentNode) {
    i.setState({ showConfirmAppointAsAdmin: false });
  }

  handleShowConfirmTransferCommunity() {
    this.setState({ showConfirmTransferCommunity: true });
  }

  handleCancelShowConfirmTransferCommunity(i: CommentNode) {
    i.setState({ showConfirmTransferCommunity: false });
  }

  handleShowConfirmTransferSite(i: CommentNode) {
    i.setState({ showConfirmTransferSite: true });
  }

  handleCancelShowConfirmTransferSite(i: CommentNode) {
    i.setState({ showConfirmTransferSite: false });
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

  handleViewSource(i: CommentNode) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowAdvanced(i: CommentNode) {
    i.setState({ showAdvanced: !i.state.showAdvanced });
    setupTippy();
  }

  handleSaveComment() {
    this.props.onSaveComment({
      comment_id: this.commentView.comment.id,
      save: !this.commentView.saved,
    });
  }

  handleBlockPerson() {
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

  handleDeleteComment() {
    this.props.onDeleteComment({
      comment_id: this.commentId,
      deleted: !this.commentView.comment.deleted,
    });
  }

  handleRemoveComment(i: CommentNode, event: any) {
    event.preventDefault();
    i.setState({ removeLoading: true });
    i.props.onRemoveComment({
      comment_id: i.commentId,
      removed: !i.commentView.comment.removed,
      reason: i.state.removeReason,
    });
  }

  handleDistinguishComment() {
    this.props.onDistinguishComment({
      comment_id: this.commentId,
      distinguished: !this.commentView.comment.distinguished,
    });
  }

  handleBanPersonFromCommunity(i: CommentNode) {
    i.setState({ banLoading: true });
    i.props.onBanPersonFromCommunity({
      community_id: i.commentView.community.id,
      person_id: i.commentView.creator.id,
      ban: !i.commentView.creator_banned_from_community,
      reason: i.state.banReason,
      remove_data: i.state.removeData,
      expires: futureDaysToUnixTime(i.state.banExpireDays),
    });
  }

  handleBanPerson(i: CommentNode) {
    i.setState({ banLoading: true });
    i.props.onBanPerson({
      person_id: i.commentView.creator.id,
      ban: !i.commentView.creator_banned_from_community,
      reason: i.state.banReason,
      remove_data: i.state.removeData,
      expires: futureDaysToUnixTime(i.state.banExpireDays),
    });
  }

  handleModBanBothSubmit(i: CommentNode, event: any) {
    event.preventDefault();
    if (i.state.banType === BanType.Community) {
      i.handleBanPersonFromCommunity(i);
    } else {
      i.handleBanPerson(i);
    }
  }

  handleAddModToCommunity(i: CommentNode) {
    i.setState({ addModLoading: true });

    const added = !i.commentView.creator_is_moderator;
    i.props.onAddModToCommunity({
      community_id: i.commentView.community.id,
      person_id: i.commentView.creator.id,
      added,
    });
  }

  handleAddAdmin(i: CommentNode) {
    i.setState({ addAdminLoading: true });

    const added = !i.commentView.creator_is_admin;
    i.props.onAddAdmin({
      person_id: i.commentView.creator.id,
      added,
    });
  }

  handleTransferCommunity(i: CommentNode) {
    i.setState({ transferCommunityLoading: true });
    i.props.onTransferCommunity({
      community_id: i.commentView.community.id,
      person_id: i.commentView.creator.id,
    });
  }

  handleReportComment(reason: string) {
    this.props.onCommentReport({
      comment_id: this.commentId,
      reason,
    });

    this.setState({
      showReportDialog: false,
    });
  }

  handlePurgeBothSubmit(i: CommentNode, event: any) {
    event.preventDefault();
    i.setState({ purgeLoading: true });

    if (i.state.purgeType === PurgeType.Person) {
      i.props.onPurgePerson({
        person_id: i.commentView.creator.id,
        reason: i.state.purgeReason,
      });
    } else {
      i.props.onPurgeComment({
        comment_id: i.commentId,
        reason: i.state.purgeReason,
      });
    }
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
