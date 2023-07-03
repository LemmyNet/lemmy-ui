import {
  colorList,
  getCommentParentId,
  myAuth,
  myAuthRequired,
  showScores,
} from "@utils/app";
import { futureDaysToUnixTime, numToSI } from "@utils/helpers";
import {
  amCommunityCreator,
  canAdmin,
  canMod,
  isAdmin,
  isBanned,
  isMod,
} from "@utils/roles";
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
  reportReason?: string;
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
  reportLoading: boolean;
  purgeLoading: boolean;
}

interface CommentNodeProps {
  node: CommentNodeI;
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
  noBorder?: boolean;
  noIndent?: boolean;
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
    reportLoading: false,
    purgeLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleReplyCancel = this.handleReplyCancel.bind(this);
  }

  get commentView(): CommentView {
    return this.props.node.comment_view;
  }

  get commentId(): CommentId {
    return this.commentView.comment.id;
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & CommentNodeProps>
  ): void {
    if (!deepEqual(this.props, nextProps)) {
      this.setState({
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
        reportLoading: false,
        purgeLoading: false,
      });
    }
  }

  render() {
    const node = this.props.node;
    const cv = this.commentView;

    const purgeTypeText =
      this.state.purgeType == PurgeType.Comment
        ? I18NextService.i18n.t("purge_comment")
        : `${I18NextService.i18n.t("purge")} ${cv.creator.name}`;

    const canMod_ = canMod(
      cv.creator.id,
      this.props.moderators,
      this.props.admins
    );
    const canModOnSelf = canMod(
      cv.creator.id,
      this.props.moderators,
      this.props.admins,
      UserService.Instance.myUserInfo,
      true
    );
    const canAdmin_ = canAdmin(cv.creator.id, this.props.admins);
    const canAdminOnSelf = canAdmin(
      cv.creator.id,
      this.props.admins,
      UserService.Instance.myUserInfo,
      true
    );
    const isMod_ = isMod(cv.creator.id, this.props.moderators);
    const isAdmin_ = isAdmin(cv.creator.id, this.props.admins);
    const amCommunityCreator_ = amCommunityCreator(
      cv.creator.id,
      this.props.moderators
    );

    const moreRepliesBorderColor = this.props.node.depth
      ? colorList[this.props.node.depth % colorList.length]
      : colorList[0];

    const showMoreChildren =
      this.props.viewType == CommentViewType.Tree &&
      !this.state.collapsed &&
      node.children.length == 0 &&
      node.comment_view.counts.child_count > 0;

    return (
      <li className="comment">
        <article
          id={`comment-${cv.comment.id}`}
          className={classNames(`details comment-node py-2`, {
            "border-top border-light": !this.props.noBorder,
            mark: this.isCommentNew || this.commentView.comment.distinguished,
          })}
        >
          <div
            className={classNames({
              "ms-2": !this.props.noIndent,
            })}
            onClick={linkEvent(this, this.handleCommentCollapse)}
            onKeyDown={linkEvent(this, this.handleCommentCollapse)}
            role={"textbox"}
            aria-label={this.expandText}
            data-tippy-content={this.expandText}
            tabIndex={cv.comment.id}
          >
            <div className="d-flex flex-wrap align-items-center text-muted small">
              <button
                className="btn btn-sm text-muted me-2"
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
                      lang => lang.id === cv.comment.language_id
                    )?.name
                  }
                </span>
              )}
              {/* This is an expanding spacer for mobile */}
              <div className="me-lg-5 flex-grow-1 flex-lg-grow-0 unselectable pointer mx-2" />

              {showScores() && (
                <>
                  <span
                    className="me-1 fw-bold"
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
                  this.props.node.comment_view.comment.id
                )}
                focus
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                containerClass="comment-comment-container"
                onUpsertComment={this.props.onEditComment}
              />
            )}
            {!this.state.showEdit && !this.state.collapsed && (
              <div>
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
                <div className="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted fw-bold">
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
                      <button
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleReplyClick)}
                        data-tippy-content={I18NextService.i18n.t("reply")}
                        aria-label={I18NextService.i18n.t("reply")}
                      >
                        <Icon icon="reply1" classes="icon-inline" />
                      </button>
                      {!this.state.showAdvanced ? (
                        <button
                          className="btn btn-link btn-animate text-muted btn-more"
                          onClick={linkEvent(this, this.handleShowAdvanced)}
                          data-tippy-content={I18NextService.i18n.t("more")}
                          aria-label={I18NextService.i18n.t("more")}
                        >
                          <Icon icon="more-vertical" classes="icon-inline" />
                        </button>
                      ) : (
                        <>
                          {!this.myComment && (
                            <>
                              <Link
                                className="btn btn-link btn-animate text-muted"
                                to={`/create_private_message/${cv.creator.id}`}
                                title={I18NextService.i18n
                                  .t("message")
                                  .toLowerCase()}
                              >
                                <Icon icon="mail" />
                              </Link>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleShowReportDialog
                                )}
                                data-tippy-content={I18NextService.i18n.t(
                                  "show_report_dialog"
                                )}
                                aria-label={I18NextService.i18n.t(
                                  "show_report_dialog"
                                )}
                              >
                                <Icon icon="flag" />
                              </button>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleBlockPerson
                                )}
                                data-tippy-content={I18NextService.i18n.t(
                                  "block_user"
                                )}
                                aria-label={I18NextService.i18n.t("block_user")}
                              >
                                {this.state.blockPersonLoading ? (
                                  <Spinner />
                                ) : (
                                  <Icon icon="slash" />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-link btn-animate text-muted"
                            onClick={linkEvent(this, this.handleSaveComment)}
                            data-tippy-content={
                              cv.saved
                                ? I18NextService.i18n.t("unsave")
                                : I18NextService.i18n.t("save")
                            }
                            aria-label={
                              cv.saved
                                ? I18NextService.i18n.t("unsave")
                                : I18NextService.i18n.t("save")
                            }
                          >
                            {this.state.saveLoading ? (
                              <Spinner />
                            ) : (
                              <Icon
                                icon="star"
                                classes={`icon-inline ${
                                  cv.saved && "text-warning"
                                }`}
                              />
                            )}
                          </button>
                          <button
                            className="btn btn-link btn-animate text-muted"
                            onClick={linkEvent(this, this.handleViewSource)}
                            data-tippy-content={I18NextService.i18n.t(
                              "view_source"
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
                          {this.myComment && (
                            <>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(this, this.handleEditClick)}
                                data-tippy-content={I18NextService.i18n.t(
                                  "edit"
                                )}
                                aria-label={I18NextService.i18n.t("edit")}
                              >
                                <Icon icon="edit" classes="icon-inline" />
                              </button>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleDeleteComment
                                )}
                                data-tippy-content={
                                  !cv.comment.deleted
                                    ? I18NextService.i18n.t("delete")
                                    : I18NextService.i18n.t("restore")
                                }
                                aria-label={
                                  !cv.comment.deleted
                                    ? I18NextService.i18n.t("delete")
                                    : I18NextService.i18n.t("restore")
                                }
                              >
                                {this.state.deleteLoading ? (
                                  <Spinner />
                                ) : (
                                  <Icon
                                    icon="trash"
                                    classes={`icon-inline ${
                                      cv.comment.deleted && "text-danger"
                                    }`}
                                  />
                                )}
                              </button>

                              {(canModOnSelf || canAdminOnSelf) && (
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleDistinguishComment
                                  )}
                                  data-tippy-content={
                                    !cv.comment.distinguished
                                      ? I18NextService.i18n.t("distinguish")
                                      : I18NextService.i18n.t("undistinguish")
                                  }
                                  aria-label={
                                    !cv.comment.distinguished
                                      ? I18NextService.i18n.t("distinguish")
                                      : I18NextService.i18n.t("undistinguish")
                                  }
                                >
                                  <Icon
                                    icon="shield"
                                    classes={`icon-inline ${
                                      cv.comment.distinguished && "text-danger"
                                    }`}
                                  />
                                </button>
                              )}
                            </>
                          )}
                          {/* Admins and mods can remove comments */}
                          {(canMod_ || canAdmin_) && (
                            <>
                              {!cv.comment.removed ? (
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleModRemoveShow
                                  )}
                                  aria-label={I18NextService.i18n.t("remove")}
                                >
                                  {I18NextService.i18n.t("remove")}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleRemoveComment
                                  )}
                                  aria-label={I18NextService.i18n.t("restore")}
                                >
                                  {this.state.removeLoading ? (
                                    <Spinner />
                                  ) : (
                                    I18NextService.i18n.t("restore")
                                  )}
                                </button>
                              )}
                            </>
                          )}
                          {/* Mods can ban from community, and appoint as mods to community */}
                          {canMod_ && (
                            <>
                              {!isMod_ &&
                                (!cv.creator_banned_from_community ? (
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModBanFromCommunityShow
                                    )}
                                    aria-label={I18NextService.i18n.t(
                                      "ban_from_community"
                                    )}
                                  >
                                    {I18NextService.i18n.t(
                                      "ban_from_community"
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleBanPersonFromCommunity
                                    )}
                                    aria-label={I18NextService.i18n.t("unban")}
                                  >
                                    {this.state.banLoading ? (
                                      <Spinner />
                                    ) : (
                                      I18NextService.i18n.t("unban")
                                    )}
                                  </button>
                                ))}
                              {!cv.creator_banned_from_community &&
                                (!this.state.showConfirmAppointAsMod ? (
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleShowConfirmAppointAsMod
                                    )}
                                    aria-label={
                                      isMod_
                                        ? I18NextService.i18n.t("remove_as_mod")
                                        : I18NextService.i18n.t(
                                            "appoint_as_mod"
                                          )
                                    }
                                  >
                                    {isMod_
                                      ? I18NextService.i18n.t("remove_as_mod")
                                      : I18NextService.i18n.t("appoint_as_mod")}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      aria-label={I18NextService.i18n.t(
                                        "are_you_sure"
                                      )}
                                    >
                                      {I18NextService.i18n.t("are_you_sure")}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleAddModToCommunity
                                      )}
                                      aria-label={I18NextService.i18n.t("yes")}
                                    >
                                      {this.state.addModLoading ? (
                                        <Spinner />
                                      ) : (
                                        I18NextService.i18n.t("yes")
                                      )}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleCancelConfirmAppointAsMod
                                      )}
                                      aria-label={I18NextService.i18n.t("no")}
                                    >
                                      {I18NextService.i18n.t("no")}
                                    </button>
                                  </>
                                ))}
                            </>
                          )}
                          {/* Community creators and admins can transfer community to another mod */}
                          {(amCommunityCreator_ || canAdmin_) &&
                            isMod_ &&
                            cv.creator.local &&
                            (!this.state.showConfirmTransferCommunity ? (
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleShowConfirmTransferCommunity
                                )}
                                aria-label={I18NextService.i18n.t(
                                  "transfer_community"
                                )}
                              >
                                {I18NextService.i18n.t("transfer_community")}
                              </button>
                            ) : (
                              <>
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  aria-label={I18NextService.i18n.t(
                                    "are_you_sure"
                                  )}
                                >
                                  {I18NextService.i18n.t("are_you_sure")}
                                </button>
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleTransferCommunity
                                  )}
                                  aria-label={I18NextService.i18n.t("yes")}
                                >
                                  {this.state.transferCommunityLoading ? (
                                    <Spinner />
                                  ) : (
                                    I18NextService.i18n.t("yes")
                                  )}
                                </button>
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this
                                      .handleCancelShowConfirmTransferCommunity
                                  )}
                                  aria-label={I18NextService.i18n.t("no")}
                                >
                                  {I18NextService.i18n.t("no")}
                                </button>
                              </>
                            ))}
                          {/* Admins can ban from all, and appoint other admins */}
                          {canAdmin_ && (
                            <>
                              {!isAdmin_ && (
                                <>
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handlePurgePersonShow
                                    )}
                                    aria-label={I18NextService.i18n.t(
                                      "purge_user"
                                    )}
                                  >
                                    {I18NextService.i18n.t("purge_user")}
                                  </button>
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handlePurgeCommentShow
                                    )}
                                    aria-label={I18NextService.i18n.t(
                                      "purge_comment"
                                    )}
                                  >
                                    {I18NextService.i18n.t("purge_comment")}
                                  </button>

                                  {!isBanned(cv.creator) ? (
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleModBanShow
                                      )}
                                      aria-label={I18NextService.i18n.t(
                                        "ban_from_site"
                                      )}
                                    >
                                      {I18NextService.i18n.t("ban_from_site")}
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleBanPerson
                                      )}
                                      aria-label={I18NextService.i18n.t(
                                        "unban_from_site"
                                      )}
                                    >
                                      {this.state.banLoading ? (
                                        <Spinner />
                                      ) : (
                                        I18NextService.i18n.t("unban_from_site")
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                              {!isBanned(cv.creator) &&
                                cv.creator.local &&
                                (!this.state.showConfirmAppointAsAdmin ? (
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleShowConfirmAppointAsAdmin
                                    )}
                                    aria-label={
                                      isAdmin_
                                        ? I18NextService.i18n.t(
                                            "remove_as_admin"
                                          )
                                        : I18NextService.i18n.t(
                                            "appoint_as_admin"
                                          )
                                    }
                                  >
                                    {isAdmin_
                                      ? I18NextService.i18n.t("remove_as_admin")
                                      : I18NextService.i18n.t(
                                          "appoint_as_admin"
                                        )}
                                  </button>
                                ) : (
                                  <>
                                    <button className="btn btn-link btn-animate text-muted">
                                      {I18NextService.i18n.t("are_you_sure")}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleAddAdmin
                                      )}
                                      aria-label={I18NextService.i18n.t("yes")}
                                    >
                                      {this.state.addAdminLoading ? (
                                        <Spinner />
                                      ) : (
                                        I18NextService.i18n.t("yes")
                                      )}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleCancelConfirmAppointAsAdmin
                                      )}
                                      aria-label={I18NextService.i18n.t("no")}
                                    >
                                      {I18NextService.i18n.t("no")}
                                    </button>
                                  </>
                                ))}
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
                {/* end of button group */}
              </div>
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
                      node.comment_view.counts.child_count
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
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleReportComment)}
          >
            <label
              className="visually-hidden"
              htmlFor={`report-reason-${cv.comment.id}`}
            >
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              required
              id={`report-reason-${cv.comment.id}`}
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("reason")}
              value={this.state.reportReason}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={I18NextService.i18n.t("create_report")}
            >
              {I18NextService.i18n.t("create_report")}
            </button>
          </form>
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
              this.props.node.comment_view.comment.id
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
            isChild={!this.props.noIndent}
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
      UserService.Instance.myUserInfo?.local_user_view.person.id ==
      this.commentView.creator.id
    );
  }

  get isPostCreator(): boolean {
    return this.commentView.creator.id == this.commentView.post.creator_id;
  }

  get scoreColor() {
    if (this.commentView.my_vote == 1) {
      return "text-info";
    } else if (this.commentView.my_vote == -1) {
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

  handleReplyClick(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showReply: true });
  }

  handleEditClick(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showEdit: true });
  }

  handleReplyCancel() {
    this.setState({ showReply: false, showEdit: false });
  }

  handleShowReportDialog(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showReportDialog: !i.state.showReportDialog });
  }

  handleReportReasonChange(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ reportReason: event.target.value });
  }

  handleModRemoveShow(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({
      showRemoveDialog: !i.state.showRemoveDialog,
      showBanDialog: false,
    });
  }

  handleModRemoveReasonChange(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ removeReason: event.target.value });
  }

  handleModRemoveDataChange(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ removeData: event.target.checked });
  }

  isPersonMentionType(
    item: CommentView | PersonMentionView | CommentReplyView
  ): item is PersonMentionView {
    return (item as PersonMentionView).person_mention?.id !== undefined;
  }

  isCommentReplyType(
    item: CommentView | PersonMentionView | CommentReplyView
  ): item is CommentReplyView {
    return (item as CommentReplyView).comment_reply?.id !== undefined;
  }

  handleModBanFromCommunityShow(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({
      showBanDialog: true,
      banType: BanType.Community,
      showRemoveDialog: false,
    });
  }

  handleModBanShow(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({
      showBanDialog: true,
      banType: BanType.Site,
      showRemoveDialog: false,
    });
  }

  handleModBanReasonChange(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ banReason: event.target.value });
  }

  handleModBanExpireDaysChange(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ banExpireDays: event.target.value });
  }

  handlePurgePersonShow(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Person,
      showRemoveDialog: false,
    });
  }

  handlePurgeCommentShow(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Comment,
      showRemoveDialog: false,
    });
  }

  handlePurgeReasonChange(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ purgeReason: event.target.value });
  }

  handleShowConfirmAppointAsMod(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmAppointAsMod: true });
  }

  handleCancelConfirmAppointAsMod(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmAppointAsMod: false });
  }

  handleShowConfirmAppointAsAdmin(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmAppointAsAdmin: true });
  }

  handleCancelConfirmAppointAsAdmin(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmAppointAsAdmin: false });
  }

  handleShowConfirmTransferCommunity(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmTransferCommunity: true });
  }

  handleCancelShowConfirmTransferCommunity(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmTransferCommunity: false });
  }

  handleShowConfirmTransferSite(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmTransferSite: true });
  }

  handleCancelShowConfirmTransferSite(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showConfirmTransferSite: false });
  }

  get isCommentNew(): boolean {
    const now = subMinutes(new Date(), 10);
    const then = parseISO(this.commentView.comment.published);
    return isBefore(now, then);
  }

  handleCommentCollapse(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ collapsed: !i.state.collapsed });
    setupTippy();
  }

  handleViewSource(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowAdvanced(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ showAdvanced: !i.state.showAdvanced });
    setupTippy();
  }

  handleSaveComment(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ saveLoading: true });

    i.props.onSaveComment({
      comment_id: i.commentView.comment.id,
      save: !i.commentView.saved,
      auth: myAuthRequired(),
    });
  }

  handleBlockPerson(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ blockPersonLoading: true });
    i.props.onBlockPerson({
      person_id: i.commentView.creator.id,
      block: true,
      auth: myAuthRequired(),
    });
  }

  handleMarkAsRead(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ readLoading: true });
    const cv = i.commentView;
    if (i.isPersonMentionType(cv)) {
      i.props.onPersonMentionRead({
        person_mention_id: cv.person_mention.id,
        read: !cv.person_mention.read,
        auth: myAuthRequired(),
      });
    } else if (i.isCommentReplyType(cv)) {
      i.props.onCommentReplyRead({
        comment_reply_id: cv.comment_reply.id,
        read: !cv.comment_reply.read,
        auth: myAuthRequired(),
      });
    }
  }

  handleDeleteComment(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ deleteLoading: true });
    i.props.onDeleteComment({
      comment_id: i.commentId,
      deleted: !i.commentView.comment.deleted,
      auth: myAuthRequired(),
    });
  }

  handleRemoveComment(i: CommentNode, event: any) {
    event.stopPropagation();
    event.preventDefault();
    i.setState({ removeLoading: true });
    i.props.onRemoveComment({
      comment_id: i.commentId,
      removed: !i.commentView.comment.removed,
      auth: myAuthRequired(),
    });
  }

  handleDistinguishComment(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ distinguishLoading: true });
    i.props.onDistinguishComment({
      comment_id: i.commentId,
      distinguished: !i.commentView.comment.distinguished,
      auth: myAuthRequired(),
    });
  }

  handleBanPersonFromCommunity(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ banLoading: true });
    i.props.onBanPersonFromCommunity({
      community_id: i.commentView.community.id,
      person_id: i.commentView.creator.id,
      ban: !i.commentView.creator_banned_from_community,
      reason: i.state.banReason,
      remove_data: i.state.removeData,
      expires: futureDaysToUnixTime(i.state.banExpireDays),
      auth: myAuthRequired(),
    });
  }

  handleBanPerson(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ banLoading: true });
    i.props.onBanPerson({
      person_id: i.commentView.creator.id,
      ban: !i.commentView.creator_banned_from_community,
      reason: i.state.banReason,
      remove_data: i.state.removeData,
      expires: futureDaysToUnixTime(i.state.banExpireDays),
      auth: myAuthRequired(),
    });
  }

  handleModBanBothSubmit(i: CommentNode, event: any) {
    event.stopPropagation();
    event.preventDefault();
    if (i.state.banType == BanType.Community) {
      i.handleBanPersonFromCommunity(i, event);
    } else {
      i.handleBanPerson(i, event);
    }
  }

  handleAddModToCommunity(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ addModLoading: true });

    const added = !isMod(i.commentView.comment.creator_id, i.props.moderators);
    i.props.onAddModToCommunity({
      community_id: i.commentView.community.id,
      person_id: i.commentView.creator.id,
      added,
      auth: myAuthRequired(),
    });
  }

  handleAddAdmin(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ addAdminLoading: true });

    const added = !isAdmin(i.commentView.comment.creator_id, i.props.admins);
    i.props.onAddAdmin({
      person_id: i.commentView.creator.id,
      added,
      auth: myAuthRequired(),
    });
  }

  handleTransferCommunity(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ transferCommunityLoading: true });
    i.props.onTransferCommunity({
      community_id: i.commentView.community.id,
      person_id: i.commentView.creator.id,
      auth: myAuthRequired(),
    });
  }

  handleReportComment(i: CommentNode, event: any) {
    event.stopPropagation();
    event.preventDefault();
    i.setState({ reportLoading: true });
    i.props.onCommentReport({
      comment_id: i.commentId,
      reason: i.state.reportReason ?? "",
      auth: myAuthRequired(),
    });
  }

  handlePurgeBothSubmit(i: CommentNode, event: any) {
    event.stopPropagation();
    event.preventDefault();
    i.setState({ purgeLoading: true });

    if (i.state.purgeType == PurgeType.Person) {
      i.props.onPurgePerson({
        person_id: i.commentView.creator.id,
        reason: i.state.purgeReason,
        auth: myAuthRequired(),
      });
    } else {
      i.props.onPurgeComment({
        comment_id: i.commentId,
        reason: i.state.purgeReason,
        auth: myAuthRequired(),
      });
    }
  }

  handleFetchChildren(i: CommentNode, event: any) {
    event.stopPropagation();
    i.setState({ fetchChildrenLoading: true });
    i.props.onFetchChildren?.({
      parent_id: i.commentId,
      max_depth: commentTreeMaxDepth,
      limit: 999, // TODO
      type_: "All",
      saved_only: false,
      auth: myAuth(),
    });
  }
}
