import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentReplyView,
  CommentView,
  CommunityModeratorView,
  CreateCommentLike,
  CreateCommentReport,
  DeleteComment,
  DistinguishComment,
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
import moment from "moment";
import { i18n } from "../../i18next";
import {
  BanType,
  CommentNodeI,
  CommentViewType,
  PurgeType,
} from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  amCommunityCreator,
  canAdmin,
  canMod,
  colorList,
  commentTreeMaxDepth,
  futureDaysToUnixTime,
  getCommentParentId,
  isAdmin,
  isBanned,
  isMod,
  mdToHtml,
  mdToHtmlNoImages,
  myAuth,
  numToSI,
  setupTippy,
  showScores,
  wsClient,
} from "../../utils";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
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
  purgeLoading: boolean;
  showConfirmTransferSite: boolean;
  showConfirmTransferCommunity: boolean;
  showConfirmAppointAsMod: boolean;
  showConfirmAppointAsAdmin: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showReportDialog: boolean;
  reportReason?: string;
  my_vote?: number;
  score: number;
  upvotes: number;
  downvotes: number;
  readLoading: boolean;
  saveLoading: boolean;
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
    purgeLoading: false,
    purgeType: PurgeType.Person,
    collapsed: false,
    viewSource: false,
    showAdvanced: false,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    showConfirmAppointAsMod: false,
    showConfirmAppointAsAdmin: false,
    showReportDialog: false,
    my_vote: this.props.node.comment_view.my_vote,
    score: this.props.node.comment_view.counts.score,
    upvotes: this.props.node.comment_view.counts.upvotes,
    downvotes: this.props.node.comment_view.counts.downvotes,
    readLoading: false,
    saveLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handleCommentUpvote = this.handleCommentUpvote.bind(this);
    this.handleCommentDownvote = this.handleCommentDownvote.bind(this);
  }

  // TODO see if there's a better way to do this, and all willReceiveProps
  componentWillReceiveProps(nextProps: CommentNodeProps) {
    let cv = nextProps.node.comment_view;
    this.setState({
      my_vote: cv.my_vote,
      upvotes: cv.counts.upvotes,
      downvotes: cv.counts.downvotes,
      score: cv.counts.score,
      readLoading: false,
      saveLoading: false,
    });
  }

  render() {
    let node = this.props.node;
    let cv = this.props.node.comment_view;

    let purgeTypeText =
      this.state.purgeType == PurgeType.Comment
        ? i18n.t("purge_comment")
        : `${i18n.t("purge")} ${cv.creator.name}`;

    let canMod_ =
      canMod(cv.creator.id, this.props.moderators, this.props.admins) &&
      cv.community.local;
    let canModOnSelf =
      canMod(
        cv.creator.id,
        this.props.moderators,
        this.props.admins,
        UserService.Instance.myUserInfo,
        true
      ) && cv.community.local;
    let canAdmin_ =
      canAdmin(cv.creator.id, this.props.admins) && cv.community.local;
    let canAdminOnSelf =
      canAdmin(
        cv.creator.id,
        this.props.admins,
        UserService.Instance.myUserInfo,
        true
      ) && cv.community.local;
    let isMod_ = isMod(cv.creator.id, this.props.moderators);
    let isAdmin_ =
      isAdmin(cv.creator.id, this.props.admins) && cv.community.local;
    let amCommunityCreator_ = amCommunityCreator(
      cv.creator.id,
      this.props.moderators
    );

    let borderColor = this.props.node.depth
      ? colorList[(this.props.node.depth - 1) % colorList.length]
      : colorList[0];
    let moreRepliesBorderColor = this.props.node.depth
      ? colorList[this.props.node.depth % colorList.length]
      : colorList[0];

    let showMoreChildren =
      this.props.viewType == CommentViewType.Tree &&
      !this.state.collapsed &&
      node.children.length == 0 &&
      node.comment_view.counts.child_count > 0;

    return (
      <div
        className={`comment ${
          this.props.node.depth && !this.props.noIndent ? "ml-1" : ""
        }`}
      >
        <div
          id={`comment-${cv.comment.id}`}
          className={classNames(`details comment-node py-2`, {
            "border-top border-light": !this.props.noBorder,
            mark:
              this.isCommentNew ||
              this.props.node.comment_view.comment.distinguished,
          })}
          style={
            !this.props.noIndent && this.props.node.depth
              ? `border-left: 2px ${borderColor} solid !important`
              : ""
          }
        >
          <div
            className={classNames({
              "ml-2": !this.props.noIndent && this.props.node.depth,
            })}
          >
            <div className="d-flex flex-wrap align-items-center text-muted small">
              <span className="mr-2">
                <PersonListing person={cv.creator} />
              </span>
              {cv.comment.distinguished && (
                <Icon icon="shield" inline classes={`text-danger mr-2`} />
              )}
              {this.isPostCreator && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t("creator")}
                </div>
              )}
              {isMod_ && (
                <div className="badge d-none d-sm-inline mr-2">
                  {i18n.t("mod")}
                </div>
              )}
              {isAdmin_ && (
                <div className="badge d-none d-sm-inline mr-2">
                  {i18n.t("admin")}
                </div>
              )}
              {cv.creator.bot_account && (
                <div className="badge d-none d-sm-inline mr-2">
                  {i18n.t("bot_account").toLowerCase()}
                </div>
              )}
              {this.props.showCommunity && (
                <>
                  <span className="mx-1">{i18n.t("to")}</span>
                  <CommunityLink community={cv.community} />
                  <span className="mx-2">•</span>
                  <Link className="mr-2" to={`/post/${cv.post.id}`}>
                    {cv.post.name}
                  </Link>
                </>
              )}
              <button
                className="btn btn-sm text-muted"
                onClick={linkEvent(this, this.handleCommentCollapse)}
                aria-label={this.expandText}
                data-tippy-content={this.expandText}
              >
                {this.state.collapsed ? (
                  <Icon icon="plus-square" classes="icon-inline" />
                ) : (
                  <Icon icon="minus-square" classes="icon-inline" />
                )}
              </button>
              {this.linkBtn(true)}
              {cv.comment.language_id !== 0 && (
                <span className="badge d-none d-sm-inline mr-2">
                  {
                    this.props.allLanguages.find(
                      lang => lang.id === cv.comment.language_id
                    )?.name
                  }
                </span>
              )}
              {/* This is an expanding spacer for mobile */}
              <div className="mr-lg-5 flex-grow-1 flex-lg-grow-0 unselectable pointer mx-2" />
              {showScores() && (
                <>
                  <a
                    className={`unselectable pointer ${this.scoreColor}`}
                    onClick={this.handleCommentUpvote}
                    data-tippy-content={this.pointsTippy}
                  >
                    <span
                      className="mr-1 font-weight-bold"
                      aria-label={i18n.t("number_of_points", {
                        count: Number(this.state.score),
                        formattedCount: numToSI(this.state.score),
                      })}
                    >
                      {numToSI(this.state.score)}
                    </span>
                  </a>
                  <span className="mr-1">•</span>
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
                focus
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
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
                <div className="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted font-weight-bold">
                  {this.props.showContext && this.linkBtn()}
                  {this.props.markable && (
                    <button
                      className="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(this, this.handleMarkRead)}
                      data-tippy-content={
                        this.commentReplyOrMentionRead
                          ? i18n.t("mark_as_unread")
                          : i18n.t("mark_as_read")
                      }
                      aria-label={
                        this.commentReplyOrMentionRead
                          ? i18n.t("mark_as_unread")
                          : i18n.t("mark_as_read")
                      }
                    >
                      {this.state.readLoading ? (
                        this.loadingIcon
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
                      <button
                        className={`btn btn-link btn-animate ${
                          this.state.my_vote == 1 ? "text-info" : "text-muted"
                        }`}
                        onClick={this.handleCommentUpvote}
                        data-tippy-content={i18n.t("upvote")}
                        aria-label={i18n.t("upvote")}
                      >
                        <Icon icon="arrow-up1" classes="icon-inline" />
                        {showScores() &&
                          this.state.upvotes !== this.state.score && (
                            <span className="ml-1">
                              {numToSI(this.state.upvotes)}
                            </span>
                          )}
                      </button>
                      {this.props.enableDownvotes && (
                        <button
                          className={`btn btn-link btn-animate ${
                            this.state.my_vote == -1
                              ? "text-danger"
                              : "text-muted"
                          }`}
                          onClick={this.handleCommentDownvote}
                          data-tippy-content={i18n.t("downvote")}
                          aria-label={i18n.t("downvote")}
                        >
                          <Icon icon="arrow-down1" classes="icon-inline" />
                          {showScores() &&
                            this.state.upvotes !== this.state.score && (
                              <span className="ml-1">
                                {numToSI(this.state.downvotes)}
                              </span>
                            )}
                        </button>
                      )}
                      <button
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleReplyClick)}
                        data-tippy-content={i18n.t("reply")}
                        aria-label={i18n.t("reply")}
                      >
                        <Icon icon="reply1" classes="icon-inline" />
                      </button>
                      {!this.state.showAdvanced ? (
                        <button
                          className="btn btn-link btn-animate text-muted"
                          onClick={linkEvent(this, this.handleShowAdvanced)}
                          data-tippy-content={i18n.t("more")}
                          aria-label={i18n.t("more")}
                        >
                          <Icon icon="more-vertical" classes="icon-inline" />
                        </button>
                      ) : (
                        <>
                          {!this.myComment && (
                            <>
                              <button className="btn btn-link btn-animate">
                                <Link
                                  className="text-muted"
                                  to={`/create_private_message/${cv.creator.id}`}
                                  title={i18n.t("message").toLowerCase()}
                                >
                                  <Icon icon="mail" />
                                </Link>
                              </button>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleShowReportDialog
                                )}
                                data-tippy-content={i18n.t(
                                  "show_report_dialog"
                                )}
                                aria-label={i18n.t("show_report_dialog")}
                              >
                                <Icon icon="flag" />
                              </button>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleBlockUserClick
                                )}
                                data-tippy-content={i18n.t("block_user")}
                                aria-label={i18n.t("block_user")}
                              >
                                <Icon icon="slash" />
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-link btn-animate text-muted"
                            onClick={linkEvent(
                              this,
                              this.handleSaveCommentClick
                            )}
                            data-tippy-content={
                              cv.saved ? i18n.t("unsave") : i18n.t("save")
                            }
                            aria-label={
                              cv.saved ? i18n.t("unsave") : i18n.t("save")
                            }
                          >
                            {this.state.saveLoading ? (
                              this.loadingIcon
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
                            data-tippy-content={i18n.t("view_source")}
                            aria-label={i18n.t("view_source")}
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
                                data-tippy-content={i18n.t("edit")}
                                aria-label={i18n.t("edit")}
                              >
                                <Icon icon="edit" classes="icon-inline" />
                              </button>
                              <button
                                className="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleDeleteClick
                                )}
                                data-tippy-content={
                                  !cv.comment.deleted
                                    ? i18n.t("delete")
                                    : i18n.t("restore")
                                }
                                aria-label={
                                  !cv.comment.deleted
                                    ? i18n.t("delete")
                                    : i18n.t("restore")
                                }
                              >
                                <Icon
                                  icon="trash"
                                  classes={`icon-inline ${
                                    cv.comment.deleted && "text-danger"
                                  }`}
                                />
                              </button>

                              {(canModOnSelf || canAdminOnSelf) && (
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleDistinguishClick
                                  )}
                                  data-tippy-content={
                                    !cv.comment.distinguished
                                      ? i18n.t("distinguish")
                                      : i18n.t("undistinguish")
                                  }
                                  aria-label={
                                    !cv.comment.distinguished
                                      ? i18n.t("distinguish")
                                      : i18n.t("undistinguish")
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
                                  aria-label={i18n.t("remove")}
                                >
                                  {i18n.t("remove")}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleModRemoveSubmit
                                  )}
                                  aria-label={i18n.t("restore")}
                                >
                                  {i18n.t("restore")}
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
                                    aria-label={i18n.t("ban_from_community")}
                                  >
                                    {i18n.t("ban_from_community")}
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModBanFromCommunitySubmit
                                    )}
                                    aria-label={i18n.t("unban")}
                                  >
                                    {i18n.t("unban")}
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
                                        ? i18n.t("remove_as_mod")
                                        : i18n.t("appoint_as_mod")
                                    }
                                  >
                                    {isMod_
                                      ? i18n.t("remove_as_mod")
                                      : i18n.t("appoint_as_mod")}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      aria-label={i18n.t("are_you_sure")}
                                    >
                                      {i18n.t("are_you_sure")}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleAddModToCommunity
                                      )}
                                      aria-label={i18n.t("yes")}
                                    >
                                      {i18n.t("yes")}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleCancelConfirmAppointAsMod
                                      )}
                                      aria-label={i18n.t("no")}
                                    >
                                      {i18n.t("no")}
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
                                aria-label={i18n.t("transfer_community")}
                              >
                                {i18n.t("transfer_community")}
                              </button>
                            ) : (
                              <>
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  aria-label={i18n.t("are_you_sure")}
                                >
                                  {i18n.t("are_you_sure")}
                                </button>
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleTransferCommunity
                                  )}
                                  aria-label={i18n.t("yes")}
                                >
                                  {i18n.t("yes")}
                                </button>
                                <button
                                  className="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this
                                      .handleCancelShowConfirmTransferCommunity
                                  )}
                                  aria-label={i18n.t("no")}
                                >
                                  {i18n.t("no")}
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
                                    aria-label={i18n.t("purge_user")}
                                  >
                                    {i18n.t("purge_user")}
                                  </button>
                                  <button
                                    className="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handlePurgeCommentShow
                                    )}
                                    aria-label={i18n.t("purge_comment")}
                                  >
                                    {i18n.t("purge_comment")}
                                  </button>

                                  {!isBanned(cv.creator) ? (
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleModBanShow
                                      )}
                                      aria-label={i18n.t("ban_from_site")}
                                    >
                                      {i18n.t("ban_from_site")}
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleModBanSubmit
                                      )}
                                      aria-label={i18n.t("unban_from_site")}
                                    >
                                      {i18n.t("unban_from_site")}
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
                                        ? i18n.t("remove_as_admin")
                                        : i18n.t("appoint_as_admin")
                                    }
                                  >
                                    {isAdmin_
                                      ? i18n.t("remove_as_admin")
                                      : i18n.t("appoint_as_admin")}
                                  </button>
                                ) : (
                                  <>
                                    <button className="btn btn-link btn-animate text-muted">
                                      {i18n.t("are_you_sure")}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleAddAdmin
                                      )}
                                      aria-label={i18n.t("yes")}
                                    >
                                      {i18n.t("yes")}
                                    </button>
                                    <button
                                      className="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleCancelConfirmAppointAsAdmin
                                      )}
                                      aria-label={i18n.t("no")}
                                    >
                                      {i18n.t("no")}
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
        </div>
        {showMoreChildren && (
          <div
            className={`details ml-1 comment-node py-2 ${
              !this.props.noBorder ? "border-top border-light" : ""
            }`}
            style={`border-left: 2px ${moreRepliesBorderColor} solid !important`}
          >
            <button
              className="btn btn-link text-muted"
              onClick={linkEvent(this, this.handleFetchChildren)}
            >
              {i18n.t("x_more_replies", {
                count: node.comment_view.counts.child_count,
                formattedCount: numToSI(node.comment_view.counts.child_count),
              })}{" "}
              ➔
            </button>
          </div>
        )}
        {/* end of details */}
        {this.state.showRemoveDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleModRemoveSubmit)}
          >
            <label
              className="sr-only"
              htmlFor={`mod-remove-reason-${cv.comment.id}`}
            >
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id={`mod-remove-reason-${cv.comment.id}`}
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={this.state.removeReason}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={i18n.t("remove_comment")}
            >
              {i18n.t("remove_comment")}
            </button>
          </form>
        )}
        {this.state.showReportDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleReportSubmit)}
          >
            <label
              className="sr-only"
              htmlFor={`report-reason-${cv.comment.id}`}
            >
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              required
              id={`report-reason-${cv.comment.id}`}
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={this.state.reportReason}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={i18n.t("create_report")}
            >
              {i18n.t("create_report")}
            </button>
          </form>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div className="form-group row col-12">
              <label
                className="col-form-label"
                htmlFor={`mod-ban-reason-${cv.comment.id}`}
              >
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id={`mod-ban-reason-${cv.comment.id}`}
                className="form-control mr-2"
                placeholder={i18n.t("reason")}
                value={this.state.banReason}
                onInput={linkEvent(this, this.handleModBanReasonChange)}
              />
              <label
                className="col-form-label"
                htmlFor={`mod-ban-expires-${cv.comment.id}`}
              >
                {i18n.t("expires")}
              </label>
              <input
                type="number"
                id={`mod-ban-expires-${cv.comment.id}`}
                className="form-control mr-2"
                placeholder={i18n.t("number_of_days")}
                value={this.state.banExpireDays}
                onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
              />
              <div className="form-group">
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
                    title={i18n.t("remove_content_more")}
                  >
                    {i18n.t("remove_content")}
                  </label>
                </div>
              </div>
            </div>
            {/* TODO hold off on expires until later */}
            {/* <div class="form-group row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.banExpires} onInput={linkEvent(this, this.handleModBanExpiresChange)} /> */}
            {/* </div> */}
            <div className="form-group row">
              <button
                type="submit"
                className="btn btn-secondary"
                aria-label={i18n.t("ban")}
              >
                {i18n.t("ban")} {cv.creator.name}
              </button>
            </div>
          </form>
        )}

        {this.state.showPurgeDialog && (
          <form onSubmit={linkEvent(this, this.handlePurgeSubmit)}>
            <PurgeWarning />
            <label className="sr-only" htmlFor="purge-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="purge-reason"
              className="form-control my-3"
              placeholder={i18n.t("reason")}
              value={this.state.purgeReason}
              onInput={linkEvent(this, this.handlePurgeReasonChange)}
            />
            <div className="form-group row col-12">
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
            focus
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
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
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div className="row col-12"></div>}
      </div>
    );
  }

  get commentReplyOrMentionRead(): boolean {
    let cv = this.props.node.comment_view;

    if (this.isPersonMentionType(cv)) {
      return cv.person_mention.read;
    } else if (this.isCommentReplyType(cv)) {
      return cv.comment_reply.read;
    } else {
      return false;
    }
  }

  linkBtn(small = false) {
    let cv = this.props.node.comment_view;
    let classnames = classNames("btn btn-link btn-animate text-muted", {
      "btn-sm": small,
    });

    let title = this.props.showContext
      ? i18n.t("show_context")
      : i18n.t("link");

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

  get loadingIcon() {
    return <Spinner />;
  }

  get myComment(): boolean {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ==
      this.props.node.comment_view.creator.id
    );
  }

  get isPostCreator(): boolean {
    return (
      this.props.node.comment_view.creator.id ==
      this.props.node.comment_view.post.creator_id
    );
  }

  get commentUnlessRemoved(): string {
    let comment = this.props.node.comment_view.comment;
    return comment.removed
      ? `*${i18n.t("removed")}*`
      : comment.deleted
      ? `*${i18n.t("deleted")}*`
      : comment.content;
  }

  handleReplyClick(i: CommentNode) {
    i.setState({ showReply: true });
  }

  handleEditClick(i: CommentNode) {
    i.setState({ showEdit: true });
  }

  handleBlockUserClick(i: CommentNode) {
    let auth = myAuth();
    if (auth) {
      let blockUserForm: BlockPerson = {
        person_id: i.props.node.comment_view.creator.id,
        block: true,
        auth,
      };
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }

  handleDeleteClick(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let auth = myAuth();
    if (auth) {
      let deleteForm: DeleteComment = {
        comment_id: comment.id,
        deleted: !comment.deleted,
        auth,
      };
      WebSocketService.Instance.send(wsClient.deleteComment(deleteForm));
    }
  }

  handleSaveCommentClick(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let save = cv.saved == undefined ? true : !cv.saved;
    let auth = myAuth();
    if (auth) {
      let form: SaveComment = {
        comment_id: cv.comment.id,
        save,
        auth,
      };

      WebSocketService.Instance.send(wsClient.saveComment(form));

      i.setState({ saveLoading: true });
    }
  }

  handleReplyCancel() {
    this.setState({ showReply: false, showEdit: false });
  }

  handleCommentUpvote(event: any) {
    event.preventDefault();
    let myVote = this.state.my_vote;
    let newVote = myVote == 1 ? 0 : 1;

    if (myVote == 1) {
      this.setState({
        score: this.state.score - 1,
        upvotes: this.state.upvotes - 1,
      });
    } else if (myVote == -1) {
      this.setState({
        downvotes: this.state.downvotes - 1,
        upvotes: this.state.upvotes + 1,
        score: this.state.score + 2,
      });
    } else {
      this.setState({
        score: this.state.score + 1,
        upvotes: this.state.upvotes + 1,
      });
    }

    this.setState({ my_vote: newVote });

    let auth = myAuth();
    if (auth) {
      let form: CreateCommentLike = {
        comment_id: this.props.node.comment_view.comment.id,
        score: newVote,
        auth,
      };
      WebSocketService.Instance.send(wsClient.likeComment(form));
      setupTippy();
    }
  }

  handleCommentDownvote(event: any) {
    event.preventDefault();
    let myVote = this.state.my_vote;
    let newVote = myVote == -1 ? 0 : -1;

    if (myVote == 1) {
      this.setState({
        downvotes: this.state.downvotes + 1,
        upvotes: this.state.upvotes - 1,
        score: this.state.score - 2,
      });
    } else if (myVote == -1) {
      this.setState({
        downvotes: this.state.downvotes - 1,
        score: this.state.score + 1,
      });
    } else {
      this.setState({
        downvotes: this.state.downvotes + 1,
        score: this.state.score - 1,
      });
    }

    this.setState({ my_vote: newVote });

    let auth = myAuth();
    if (auth) {
      let form: CreateCommentLike = {
        comment_id: this.props.node.comment_view.comment.id,
        score: newVote,
        auth,
      };

      WebSocketService.Instance.send(wsClient.likeComment(form));
      setupTippy();
    }
  }

  handleShowReportDialog(i: CommentNode) {
    i.setState({ showReportDialog: !i.state.showReportDialog });
  }

  handleReportReasonChange(i: CommentNode, event: any) {
    i.setState({ reportReason: event.target.value });
  }

  handleReportSubmit(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let reason = i.state.reportReason;
    let auth = myAuth();
    if (reason && auth) {
      let form: CreateCommentReport = {
        comment_id: comment.id,
        reason,
        auth,
      };
      WebSocketService.Instance.send(wsClient.createCommentReport(form));
      i.setState({ showReportDialog: false });
    }
  }

  handleModRemoveShow(i: CommentNode) {
    i.setState({
      showRemoveDialog: !i.state.showRemoveDialog,
      showBanDialog: false,
    });
  }

  handleModRemoveReasonChange(i: CommentNode, event: any) {
    i.setState({ removeReason: event.target.value });
  }

  handleModRemoveDataChange(i: CommentNode, event: any) {
    i.setState({ removeData: event.target.checked });
  }

  handleModRemoveSubmit(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let auth = myAuth();
    if (auth) {
      let form: RemoveComment = {
        comment_id: comment.id,
        removed: !comment.removed,
        reason: i.state.removeReason,
        auth,
      };
      WebSocketService.Instance.send(wsClient.removeComment(form));

      i.setState({ showRemoveDialog: false });
    }
  }

  handleDistinguishClick(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let auth = myAuth();
    if (auth) {
      let form: DistinguishComment = {
        comment_id: comment.id,
        distinguished: !comment.distinguished,
        auth,
      };
      WebSocketService.Instance.send(wsClient.editComment(form));
      i.setState(i.state);
    }
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

  handleMarkRead(i: CommentNode) {
    let auth = myAuth();
    if (auth) {
      if (i.isPersonMentionType(i.props.node.comment_view)) {
        let form: MarkPersonMentionAsRead = {
          person_mention_id: i.props.node.comment_view.person_mention.id,
          read: !i.props.node.comment_view.person_mention.read,
          auth,
        };
        WebSocketService.Instance.send(wsClient.markPersonMentionAsRead(form));
      } else if (i.isCommentReplyType(i.props.node.comment_view)) {
        let form: MarkCommentReplyAsRead = {
          comment_reply_id: i.props.node.comment_view.comment_reply.id,
          read: !i.props.node.comment_view.comment_reply.read,
          auth,
        };
        WebSocketService.Instance.send(wsClient.markCommentReplyAsRead(form));
      }

      i.setState({ readLoading: true });
    }
  }

  handleModBanFromCommunityShow(i: CommentNode) {
    i.setState({
      showBanDialog: true,
      banType: BanType.Community,
      showRemoveDialog: false,
    });
  }

  handleModBanShow(i: CommentNode) {
    i.setState({
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

  handleModBanFromCommunitySubmit(i: CommentNode) {
    i.setState({ banType: BanType.Community });
    i.handleModBanBothSubmit(i);
  }

  handleModBanSubmit(i: CommentNode) {
    i.setState({ banType: BanType.Site });
    i.handleModBanBothSubmit(i);
  }

  handleModBanBothSubmit(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let auth = myAuth();
    if (auth) {
      if (i.state.banType == BanType.Community) {
        // If its an unban, restore all their data
        let ban = !cv.creator_banned_from_community;
        if (ban == false) {
          i.setState({ removeData: false });
        }
        let form: BanFromCommunity = {
          person_id: cv.creator.id,
          community_id: cv.community.id,
          ban,
          remove_data: i.state.removeData,
          reason: i.state.banReason,
          expires: futureDaysToUnixTime(i.state.banExpireDays),
          auth,
        };
        WebSocketService.Instance.send(wsClient.banFromCommunity(form));
      } else {
        // If its an unban, restore all their data
        let ban = !cv.creator.banned;
        if (ban == false) {
          i.setState({ removeData: false });
        }
        let form: BanPerson = {
          person_id: cv.creator.id,
          ban,
          remove_data: i.state.removeData,
          reason: i.state.banReason,
          expires: futureDaysToUnixTime(i.state.banExpireDays),
          auth,
        };
        WebSocketService.Instance.send(wsClient.banPerson(form));
      }

      i.setState({ showBanDialog: false });
    }
  }

  handlePurgePersonShow(i: CommentNode) {
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Person,
      showRemoveDialog: false,
    });
  }

  handlePurgeCommentShow(i: CommentNode) {
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Comment,
      showRemoveDialog: false,
    });
  }

  handlePurgeReasonChange(i: CommentNode, event: any) {
    i.setState({ purgeReason: event.target.value });
  }

  handlePurgeSubmit(i: CommentNode, event: any) {
    event.preventDefault();
    let auth = myAuth();
    if (auth) {
      if (i.state.purgeType == PurgeType.Person) {
        let form: PurgePerson = {
          person_id: i.props.node.comment_view.creator.id,
          reason: i.state.purgeReason,
          auth,
        };
        WebSocketService.Instance.send(wsClient.purgePerson(form));
      } else if (i.state.purgeType == PurgeType.Comment) {
        let form: PurgeComment = {
          comment_id: i.props.node.comment_view.comment.id,
          reason: i.state.purgeReason,
          auth,
        };
        WebSocketService.Instance.send(wsClient.purgeComment(form));
      }

      i.setState({ purgeLoading: true });
    }
  }

  handleShowConfirmAppointAsMod(i: CommentNode) {
    i.setState({ showConfirmAppointAsMod: true });
  }

  handleCancelConfirmAppointAsMod(i: CommentNode) {
    i.setState({ showConfirmAppointAsMod: false });
  }

  handleAddModToCommunity(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let auth = myAuth();
    if (auth) {
      let form: AddModToCommunity = {
        person_id: cv.creator.id,
        community_id: cv.community.id,
        added: !isMod(cv.creator.id, i.props.moderators),
        auth,
      };
      WebSocketService.Instance.send(wsClient.addModToCommunity(form));
      i.setState({ showConfirmAppointAsMod: false });
    }
  }

  handleShowConfirmAppointAsAdmin(i: CommentNode) {
    i.setState({ showConfirmAppointAsAdmin: true });
  }

  handleCancelConfirmAppointAsAdmin(i: CommentNode) {
    i.setState({ showConfirmAppointAsAdmin: false });
  }

  handleAddAdmin(i: CommentNode) {
    let auth = myAuth();
    if (auth) {
      let creatorId = i.props.node.comment_view.creator.id;
      let form: AddAdmin = {
        person_id: creatorId,
        added: !isAdmin(creatorId, i.props.admins),
        auth,
      };
      WebSocketService.Instance.send(wsClient.addAdmin(form));
      i.setState({ showConfirmAppointAsAdmin: false });
    }
  }

  handleShowConfirmTransferCommunity(i: CommentNode) {
    i.setState({ showConfirmTransferCommunity: true });
  }

  handleCancelShowConfirmTransferCommunity(i: CommentNode) {
    i.setState({ showConfirmTransferCommunity: false });
  }

  handleTransferCommunity(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let auth = myAuth();
    if (auth) {
      let form: TransferCommunity = {
        community_id: cv.community.id,
        person_id: cv.creator.id,
        auth,
      };
      WebSocketService.Instance.send(wsClient.transferCommunity(form));
      i.setState({ showConfirmTransferCommunity: false });
    }
  }

  handleShowConfirmTransferSite(i: CommentNode) {
    i.setState({ showConfirmTransferSite: true });
  }

  handleCancelShowConfirmTransferSite(i: CommentNode) {
    i.setState({ showConfirmTransferSite: false });
  }

  get isCommentNew(): boolean {
    let now = moment.utc().subtract(10, "minutes");
    let then = moment.utc(this.props.node.comment_view.comment.published);
    return now.isBefore(then);
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

  handleFetchChildren(i: CommentNode) {
    let form: GetComments = {
      post_id: i.props.node.comment_view.post.id,
      parent_id: i.props.node.comment_view.comment.id,
      max_depth: commentTreeMaxDepth,
      limit: 999, // TODO
      type_: "All",
      saved_only: false,
      auth: myAuth(false),
    };

    WebSocketService.Instance.send(wsClient.getComments(form));
  }

  get scoreColor() {
    if (this.state.my_vote == 1) {
      return "text-info";
    } else if (this.state.my_vote == -1) {
      return "text-danger";
    } else {
      return "text-muted";
    }
  }

  get pointsTippy(): string {
    let points = i18n.t("number_of_points", {
      count: Number(this.state.score),
      formattedCount: numToSI(this.state.score),
    });

    let upvotes = i18n.t("number_of_upvotes", {
      count: Number(this.state.upvotes),
      formattedCount: numToSI(this.state.upvotes),
    });

    let downvotes = i18n.t("number_of_downvotes", {
      count: Number(this.state.downvotes),
      formattedCount: numToSI(this.state.downvotes),
    });

    return `${points} • ${upvotes} • ${downvotes}`;
  }

  get expandText(): string {
    return this.state.collapsed ? i18n.t("expand") : i18n.t("collapse");
  }
}
