import { Component, linkEvent } from 'inferno';
import { Link } from 'inferno-router';
import {
  CreateCommentLike,
  DeleteComment,
  RemoveComment,
  MarkCommentAsRead,
  MarkUserMentionAsRead,
  SaveComment,
  BanFromCommunity,
  BanUser,
  CommunityModeratorView,
  UserViewSafe,
  AddModToCommunity,
  AddAdmin,
  TransferCommunity,
  TransferSite,
  SortType,
  CommentView,
  UserMentionView,
} from 'lemmy-js-client';
import {
  CommentSortType,
  CommentNode as CommentNodeI,
  BanType,
} from '../interfaces';
import { WebSocketService, UserService } from '../services';
import {
  mdToHtml,
  getUnixTime,
  canMod,
  isMod,
  setupTippy,
  colorList,
} from '../utils';
import moment from 'moment';
import { MomentTime } from './moment-time';
import { CommentForm } from './comment-form';
import { CommentNodes } from './comment-nodes';
import { UserListing } from './user-listing';
import { CommunityLink } from './community-link';
import { i18n } from '../i18next';

interface CommentNodeState {
  showReply: boolean;
  showEdit: boolean;
  showRemoveDialog: boolean;
  removeReason: string;
  showBanDialog: boolean;
  removeData: boolean;
  banReason: string;
  banExpires: string;
  banType: BanType;
  showConfirmTransferSite: boolean;
  showConfirmTransferCommunity: boolean;
  showConfirmAppointAsMod: boolean;
  showConfirmAppointAsAdmin: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  my_vote: number;
  score: number;
  upvotes: number;
  downvotes: number;
  borderColor: string;
  readLoading: boolean;
  saveLoading: boolean;
}

interface CommentNodeProps {
  node: CommentNodeI;
  noBorder?: boolean;
  noIndent?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  moderators: CommunityModeratorView[];
  admins: UserViewSafe[];
  // TODO is this necessary, can't I get it from the node itself?
  postCreatorId?: number;
  showCommunity?: boolean;
  sort?: CommentSortType;
  sortType?: SortType;
  enableDownvotes: boolean;
}

export class CommentNode extends Component<CommentNodeProps, CommentNodeState> {
  private emptyState: CommentNodeState = {
    showReply: false,
    showEdit: false,
    showRemoveDialog: false,
    removeReason: null,
    showBanDialog: false,
    removeData: null,
    banReason: null,
    banExpires: null,
    banType: BanType.Community,
    collapsed: false,
    viewSource: false,
    showAdvanced: false,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    showConfirmAppointAsMod: false,
    showConfirmAppointAsAdmin: false,
    my_vote: this.props.node.comment_view.my_vote,
    score: this.props.node.comment_view.counts.score,
    upvotes: this.props.node.comment_view.counts.upvotes,
    downvotes: this.props.node.comment_view.counts.downvotes,
    borderColor: this.props.node.depth
      ? colorList[this.props.node.depth % colorList.length]
      : colorList[0],
    readLoading: false,
    saveLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handleCommentUpvote = this.handleCommentUpvote.bind(this);
    this.handleCommentDownvote = this.handleCommentDownvote.bind(this);
  }

  // TODO see if there's a better way to do this, and all willReceiveProps
  componentWillReceiveProps(nextProps: CommentNodeProps) {
    let cv = nextProps.node.comment_view;
    this.state.my_vote = cv.my_vote;
    this.state.upvotes = cv.counts.upvotes;
    this.state.downvotes = cv.counts.downvotes;
    this.state.score = cv.counts.score;
    this.state.readLoading = false;
    this.state.saveLoading = false;
    this.setState(this.state);
  }

  render() {
    let node = this.props.node;
    let cv = this.props.node.comment_view;
    return (
      <div
        className={`comment ${
          cv.comment.parent_id && !this.props.noIndent ? 'ml-1' : ''
        }`}
      >
        <div
          id={`comment-${cv.comment.id}`}
          className={`details comment-node py-2 ${
            !this.props.noBorder ? 'border-top border-light' : ''
          } ${this.isCommentNew ? 'mark' : ''}`}
          style={
            !this.props.noIndent &&
            cv.comment.parent_id &&
            `border-left: 2px ${this.state.borderColor} solid !important`
          }
        >
          <div
            class={`${!this.props.noIndent && cv.comment.parent_id && 'ml-2'}`}
          >
            <div class="d-flex flex-wrap align-items-center text-muted small">
              <span class="mr-2">
                <UserListing user={cv.creator} />
              </span>

              {this.isMod && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t('mod')}
                </div>
              )}
              {this.isAdmin && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t('admin')}
                </div>
              )}
              {this.isPostCreator && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t('creator')}
                </div>
              )}
              {(cv.creator_banned_from_community || cv.creator.banned) && (
                <div className="badge badge-danger mr-2">
                  {i18n.t('banned')}
                </div>
              )}
              {this.props.showCommunity && (
                <>
                  <span class="mx-1">{i18n.t('to')}</span>
                  <CommunityLink community={cv.community} />
                  <span class="mx-2">•</span>
                  <Link className="mr-2" to={`/post/${cv.post.id}`}>
                    {cv.post.name}
                  </Link>
                </>
              )}
              <button
                class="btn btn-sm text-muted"
                onClick={linkEvent(this, this.handleCommentCollapse)}
              >
                {this.state.collapsed ? '+' : '—'}
              </button>
              {/* This is an expanding spacer for mobile */}
              <div className="mr-lg-4 flex-grow-1 flex-lg-grow-0 unselectable pointer mx-2"></div>
              <a
                className={`unselectable pointer ${this.scoreColor}`}
                onClick={linkEvent(node, this.handleCommentUpvote)}
                data-tippy-content={this.pointsTippy}
              >
                <span class="mr-1 font-weight-bold">{this.state.score}</span>
              </a>
              <span className="mr-1">•</span>
              <span>
                <MomentTime data={cv.comment} />
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
              />
            )}
            {!this.state.showEdit && !this.state.collapsed && (
              <div>
                {this.state.viewSource ? (
                  <pre>{this.commentUnlessRemoved}</pre>
                ) : (
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(
                      this.commentUnlessRemoved
                    )}
                  />
                )}
                <div class="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted font-weight-bold">
                  {this.props.showContext && this.linkBtn}
                  {this.props.markable && (
                    <button
                      class="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(this, this.handleMarkRead)}
                      data-tippy-content={
                        cv.comment.read
                          ? i18n.t('mark_as_unread')
                          : i18n.t('mark_as_read')
                      }
                    >
                      {this.state.readLoading ? (
                        this.loadingIcon
                      ) : (
                        <svg
                          class={`icon icon-inline ${
                            cv.comment.read && 'text-success'
                          }`}
                        >
                          <use xlinkHref="#icon-check"></use>
                        </svg>
                      )}
                    </button>
                  )}
                  {UserService.Instance.user && !this.props.viewOnly && (
                    <>
                      <button
                        className={`btn btn-link btn-animate ${
                          this.state.my_vote == 1 ? 'text-info' : 'text-muted'
                        }`}
                        onClick={linkEvent(node, this.handleCommentUpvote)}
                        data-tippy-content={i18n.t('upvote')}
                      >
                        <svg class="icon icon-inline">
                          <use xlinkHref="#icon-arrow-up1"></use>
                        </svg>
                        {this.state.upvotes !== this.state.score && (
                          <span class="ml-1">{this.state.upvotes}</span>
                        )}
                      </button>
                      {this.props.enableDownvotes && (
                        <button
                          className={`btn btn-link btn-animate ${
                            this.state.my_vote == -1
                              ? 'text-danger'
                              : 'text-muted'
                          }`}
                          onClick={linkEvent(node, this.handleCommentDownvote)}
                          data-tippy-content={i18n.t('downvote')}
                        >
                          <svg class="icon icon-inline">
                            <use xlinkHref="#icon-arrow-down1"></use>
                          </svg>
                          {this.state.upvotes !== this.state.score && (
                            <span class="ml-1">{this.state.downvotes}</span>
                          )}
                        </button>
                      )}
                      <button
                        class="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleReplyClick)}
                        data-tippy-content={i18n.t('reply')}
                      >
                        <svg class="icon icon-inline">
                          <use xlinkHref="#icon-reply1"></use>
                        </svg>
                      </button>
                      {!this.state.showAdvanced ? (
                        <button
                          className="btn btn-link btn-animate text-muted"
                          onClick={linkEvent(this, this.handleShowAdvanced)}
                          data-tippy-content={i18n.t('more')}
                        >
                          <svg class="icon icon-inline">
                            <use xlinkHref="#icon-more-vertical"></use>
                          </svg>
                        </button>
                      ) : (
                        <>
                          {!this.myComment && (
                            <button class="btn btn-link btn-animate">
                              <Link
                                className="text-muted"
                                to={`/create_private_message/recipient/${cv.creator.id}`}
                                title={i18n.t('message').toLowerCase()}
                              >
                                <svg class="icon">
                                  <use xlinkHref="#icon-mail"></use>
                                </svg>
                              </Link>
                            </button>
                          )}
                          {!this.props.showContext && this.linkBtn}
                          <button
                            class="btn btn-link btn-animate text-muted"
                            onClick={linkEvent(
                              this,
                              this.handleSaveCommentClick
                            )}
                            data-tippy-content={
                              cv.saved ? i18n.t('unsave') : i18n.t('save')
                            }
                          >
                            {this.state.saveLoading ? (
                              this.loadingIcon
                            ) : (
                              <svg
                                class={`icon icon-inline ${
                                  cv.saved && 'text-warning'
                                }`}
                              >
                                <use xlinkHref="#icon-star"></use>
                              </svg>
                            )}
                          </button>
                          <button
                            className="btn btn-link btn-animate text-muted"
                            onClick={linkEvent(this, this.handleViewSource)}
                            data-tippy-content={i18n.t('view_source')}
                          >
                            <svg
                              class={`icon icon-inline ${
                                this.state.viewSource && 'text-success'
                              }`}
                            >
                              <use xlinkHref="#icon-file-text"></use>
                            </svg>
                          </button>
                          {this.myComment && (
                            <>
                              <button
                                class="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(this, this.handleEditClick)}
                                data-tippy-content={i18n.t('edit')}
                              >
                                <svg class="icon icon-inline">
                                  <use xlinkHref="#icon-edit"></use>
                                </svg>
                              </button>
                              <button
                                class="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleDeleteClick
                                )}
                                data-tippy-content={
                                  !cv.comment.deleted
                                    ? i18n.t('delete')
                                    : i18n.t('restore')
                                }
                              >
                                <svg
                                  class={`icon icon-inline ${
                                    cv.comment.deleted && 'text-danger'
                                  }`}
                                >
                                  <use xlinkHref="#icon-trash"></use>
                                </svg>
                              </button>
                            </>
                          )}
                          {/* Admins and mods can remove comments */}
                          {(this.canMod || this.canAdmin) && (
                            <>
                              {!cv.comment.removed ? (
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleModRemoveShow
                                  )}
                                >
                                  {i18n.t('remove')}
                                </button>
                              ) : (
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleModRemoveSubmit
                                  )}
                                >
                                  {i18n.t('restore')}
                                </button>
                              )}
                            </>
                          )}
                          {/* Mods can ban from community, and appoint as mods to community */}
                          {this.canMod && (
                            <>
                              {!this.isMod &&
                                (!cv.creator_banned_from_community ? (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModBanFromCommunityShow
                                    )}
                                  >
                                    {i18n.t('ban')}
                                  </button>
                                ) : (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModBanFromCommunitySubmit
                                    )}
                                  >
                                    {i18n.t('unban')}
                                  </button>
                                ))}
                              {!cv.creator_banned_from_community &&
                                cv.creator.local &&
                                (!this.state.showConfirmAppointAsMod ? (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleShowConfirmAppointAsMod
                                    )}
                                  >
                                    {this.isMod
                                      ? i18n.t('remove_as_mod')
                                      : i18n.t('appoint_as_mod')}
                                  </button>
                                ) : (
                                  <>
                                    <button class="btn btn-link btn-animate text-muted">
                                      {i18n.t('are_you_sure')}
                                    </button>
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleAddModToCommunity
                                      )}
                                    >
                                      {i18n.t('yes')}
                                    </button>
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleCancelConfirmAppointAsMod
                                      )}
                                    >
                                      {i18n.t('no')}
                                    </button>
                                  </>
                                ))}
                            </>
                          )}
                          {/* Community creators and admins can transfer community to another mod */}
                          {(this.amCommunityCreator || this.canAdmin) &&
                            this.isMod &&
                            cv.creator.local &&
                            (!this.state.showConfirmTransferCommunity ? (
                              <button
                                class="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleShowConfirmTransferCommunity
                                )}
                              >
                                {i18n.t('transfer_community')}
                              </button>
                            ) : (
                              <>
                                <button class="btn btn-link btn-animate text-muted">
                                  {i18n.t('are_you_sure')}
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleTransferCommunity
                                  )}
                                >
                                  {i18n.t('yes')}
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this
                                      .handleCancelShowConfirmTransferCommunity
                                  )}
                                >
                                  {i18n.t('no')}
                                </button>
                              </>
                            ))}
                          {/* Admins can ban from all, and appoint other admins */}
                          {this.canAdmin && (
                            <>
                              {!this.isAdmin &&
                                (!cv.creator.banned ? (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModBanShow
                                    )}
                                  >
                                    {i18n.t('ban_from_site')}
                                  </button>
                                ) : (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModBanSubmit
                                    )}
                                  >
                                    {i18n.t('unban_from_site')}
                                  </button>
                                ))}
                              {!cv.creator.banned &&
                                cv.creator.local &&
                                (!this.state.showConfirmAppointAsAdmin ? (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleShowConfirmAppointAsAdmin
                                    )}
                                  >
                                    {this.isAdmin
                                      ? i18n.t('remove_as_admin')
                                      : i18n.t('appoint_as_admin')}
                                  </button>
                                ) : (
                                  <>
                                    <button class="btn btn-link btn-animate text-muted">
                                      {i18n.t('are_you_sure')}
                                    </button>
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleAddAdmin
                                      )}
                                    >
                                      {i18n.t('yes')}
                                    </button>
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleCancelConfirmAppointAsAdmin
                                      )}
                                    >
                                      {i18n.t('no')}
                                    </button>
                                  </>
                                ))}
                            </>
                          )}
                          {/* Site Creator can transfer to another admin */}
                          {this.amSiteCreator &&
                            this.isAdmin &&
                            cv.creator.local &&
                            (!this.state.showConfirmTransferSite ? (
                              <button
                                class="btn btn-link btn-animate text-muted"
                                onClick={linkEvent(
                                  this,
                                  this.handleShowConfirmTransferSite
                                )}
                              >
                                {i18n.t('transfer_site')}
                              </button>
                            ) : (
                              <>
                                <button class="btn btn-link btn-animate text-muted">
                                  {i18n.t('are_you_sure')}
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleTransferSite
                                  )}
                                >
                                  {i18n.t('yes')}
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleCancelShowConfirmTransferSite
                                  )}
                                >
                                  {i18n.t('no')}
                                </button>
                              </>
                            ))}
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
        {/* end of details */}
        {this.state.showRemoveDialog && (
          <form
            class="form-inline"
            onSubmit={linkEvent(this, this.handleModRemoveSubmit)}
          >
            <input
              type="text"
              class="form-control mr-2"
              placeholder={i18n.t('reason')}
              value={this.state.removeReason}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button type="submit" class="btn btn-secondary">
              {i18n.t('remove_comment')}
            </button>
          </form>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div class="form-group row">
              <label class="col-form-label">{i18n.t('reason')}</label>
              <input
                type="text"
                class="form-control mr-2"
                placeholder={i18n.t('reason')}
                value={this.state.banReason}
                onInput={linkEvent(this, this.handleModBanReasonChange)}
              />
              <div class="form-group">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="mod-ban-remove-data"
                    type="checkbox"
                    checked={this.state.removeData}
                    onChange={linkEvent(this, this.handleModRemoveDataChange)}
                  />
                  <label class="form-check-label" htmlFor="mod-ban-remove-data">
                    {i18n.t('remove_posts_comments')}
                  </label>
                </div>
              </div>
            </div>
            {/* TODO hold off on expires until later */}
            {/* <div class="form-group row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.banExpires} onInput={linkEvent(this, this.handleModBanExpiresChange)} /> */}
            {/* </div> */}
            <div class="form-group row">
              <button type="submit" class="btn btn-secondary">
                {i18n.t('ban')} {cv.creator.name}
              </button>
            </div>
          </form>
        )}
        {this.state.showReply && (
          <CommentForm
            node={node}
            onReplyCancel={this.handleReplyCancel}
            disabled={this.props.locked}
            focus
          />
        )}
        {node.children && !this.state.collapsed && (
          <CommentNodes
            nodes={node.children}
            locked={this.props.locked}
            moderators={this.props.moderators}
            admins={this.props.admins}
            postCreatorId={this.props.postCreatorId}
            sort={this.props.sort}
            sortType={this.props.sortType}
            enableDownvotes={this.props.enableDownvotes}
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div class="row col-12"></div>}
      </div>
    );
  }

  get linkBtn() {
    let cv = this.props.node.comment_view;
    return (
      <Link
        className="btn btn-link btn-animate text-muted"
        to={`/post/${cv.post.id}/comment/${cv.comment.id}`}
        title={this.props.showContext ? i18n.t('show_context') : i18n.t('link')}
      >
        <svg class="icon icon-inline">
          <use xlinkHref="#icon-link"></use>
        </svg>
      </Link>
    );
  }

  get loadingIcon() {
    return (
      <svg class="icon icon-spinner spin">
        <use xlinkHref="#icon-spinner"></use>
      </svg>
    );
  }

  get myComment(): boolean {
    return (
      UserService.Instance.user &&
      this.props.node.comment_view.creator.id == UserService.Instance.user.id
    );
  }

  get isMod(): boolean {
    return (
      this.props.moderators &&
      isMod(
        this.props.moderators.map(m => m.moderator.id),
        this.props.node.comment_view.creator.id
      )
    );
  }

  get isAdmin(): boolean {
    return (
      this.props.admins &&
      isMod(
        this.props.admins.map(a => a.user.id),
        this.props.node.comment_view.creator.id
      )
    );
  }

  get isPostCreator(): boolean {
    return this.props.node.comment_view.creator.id == this.props.postCreatorId;
  }

  get canMod(): boolean {
    if (this.props.admins && this.props.moderators) {
      let adminsThenMods = this.props.admins
        .map(a => a.user.id)
        .concat(this.props.moderators.map(m => m.moderator.id));

      return canMod(
        UserService.Instance.user,
        adminsThenMods,
        this.props.node.comment_view.creator.id
      );
    } else {
      return false;
    }
  }

  get canAdmin(): boolean {
    return (
      this.props.admins &&
      canMod(
        UserService.Instance.user,
        this.props.admins.map(a => a.user.id),
        this.props.node.comment_view.creator.id
      )
    );
  }

  get amCommunityCreator(): boolean {
    return (
      this.props.moderators &&
      UserService.Instance.user &&
      this.props.node.comment_view.creator.id != UserService.Instance.user.id &&
      UserService.Instance.user.id == this.props.moderators[0].moderator.id
    );
  }

  get amSiteCreator(): boolean {
    return (
      this.props.admins &&
      UserService.Instance.user &&
      this.props.node.comment_view.creator.id != UserService.Instance.user.id &&
      UserService.Instance.user.id == this.props.admins[0].user.id
    );
  }

  get commentUnlessRemoved(): string {
    let comment = this.props.node.comment_view.comment;
    return comment.removed
      ? `*${i18n.t('removed')}*`
      : comment.deleted
      ? `*${i18n.t('deleted')}*`
      : comment.content;
  }

  handleReplyClick(i: CommentNode) {
    i.state.showReply = true;
    i.setState(i.state);
  }

  handleEditClick(i: CommentNode) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleDeleteClick(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let deleteForm: DeleteComment = {
      edit_id: comment.id,
      deleted: !comment.deleted,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.deleteComment(deleteForm);
  }

  handleSaveCommentClick(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let save = cv.saved == undefined ? true : !cv.saved;
    let form: SaveComment = {
      comment_id: cv.comment.id,
      save,
      auth: UserService.Instance.authField(),
    };

    WebSocketService.Instance.client.saveComment(form);

    i.state.saveLoading = true;
    i.setState(this.state);
  }

  handleReplyCancel() {
    this.state.showReply = false;
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleCommentUpvote(i: CommentNodeI) {
    let new_vote = this.state.my_vote == 1 ? 0 : 1;

    if (this.state.my_vote == 1) {
      this.state.score--;
      this.state.upvotes--;
    } else if (this.state.my_vote == -1) {
      this.state.downvotes--;
      this.state.upvotes++;
      this.state.score += 2;
    } else {
      this.state.upvotes++;
      this.state.score++;
    }

    this.state.my_vote = new_vote;

    let form: CreateCommentLike = {
      comment_id: i.comment_view.comment.id,
      score: this.state.my_vote,
      auth: UserService.Instance.authField(),
    };

    WebSocketService.Instance.client.likeComment(form);
    this.setState(this.state);
    setupTippy();
  }

  handleCommentDownvote(i: CommentNodeI) {
    let new_vote = this.state.my_vote == -1 ? 0 : -1;

    if (this.state.my_vote == 1) {
      this.state.score -= 2;
      this.state.upvotes--;
      this.state.downvotes++;
    } else if (this.state.my_vote == -1) {
      this.state.downvotes--;
      this.state.score++;
    } else {
      this.state.downvotes++;
      this.state.score--;
    }

    this.state.my_vote = new_vote;

    let form: CreateCommentLike = {
      comment_id: i.comment_view.comment.id,
      score: this.state.my_vote,
      auth: UserService.Instance.authField(),
    };

    WebSocketService.Instance.client.likeComment(form);
    this.setState(this.state);
    setupTippy();
  }

  handleModRemoveShow(i: CommentNode) {
    i.state.showRemoveDialog = true;
    i.setState(i.state);
  }

  handleModRemoveReasonChange(i: CommentNode, event: any) {
    i.state.removeReason = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveDataChange(i: CommentNode, event: any) {
    i.state.removeData = event.target.checked;
    i.setState(i.state);
  }

  handleModRemoveSubmit(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let form: RemoveComment = {
      edit_id: comment.id,
      removed: !comment.removed,
      reason: i.state.removeReason,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.removeComment(form);

    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  isUserMentionType(
    item: CommentView | UserMentionView
  ): item is UserMentionView {
    return (item as UserMentionView).user_mention.id !== undefined;
  }

  handleMarkRead(i: CommentNode) {
    if (i.isUserMentionType(i.props.node.comment_view)) {
      let form: MarkUserMentionAsRead = {
        user_mention_id: i.props.node.comment_view.user_mention.id,
        read: !i.props.node.comment_view.user_mention.read,
        auth: UserService.Instance.authField(),
      };
      WebSocketService.Instance.client.markUserMentionAsRead(form);
    } else {
      let form: MarkCommentAsRead = {
        comment_id: i.props.node.comment_view.comment.id,
        read: !i.props.node.comment_view.comment.read,
        auth: UserService.Instance.authField(),
      };
      WebSocketService.Instance.client.markCommentAsRead(form);
    }

    i.state.readLoading = true;
    i.setState(this.state);
  }

  handleModBanFromCommunityShow(i: CommentNode) {
    i.state.showBanDialog = !i.state.showBanDialog;
    i.state.banType = BanType.Community;
    i.setState(i.state);
  }

  handleModBanShow(i: CommentNode) {
    i.state.showBanDialog = !i.state.showBanDialog;
    i.state.banType = BanType.Site;
    i.setState(i.state);
  }

  handleModBanReasonChange(i: CommentNode, event: any) {
    i.state.banReason = event.target.value;
    i.setState(i.state);
  }

  handleModBanExpiresChange(i: CommentNode, event: any) {
    i.state.banExpires = event.target.value;
    i.setState(i.state);
  }

  handleModBanFromCommunitySubmit(i: CommentNode) {
    i.state.banType = BanType.Community;
    i.setState(i.state);
    i.handleModBanBothSubmit(i);
  }

  handleModBanSubmit(i: CommentNode) {
    i.state.banType = BanType.Site;
    i.setState(i.state);
    i.handleModBanBothSubmit(i);
  }

  handleModBanBothSubmit(i: CommentNode) {
    let cv = i.props.node.comment_view;

    if (i.state.banType == BanType.Community) {
      // If its an unban, restore all their data
      let ban = !cv.creator_banned_from_community;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form: BanFromCommunity = {
        user_id: cv.creator.id,
        community_id: cv.community.id,
        ban,
        remove_data: i.state.removeData,
        reason: i.state.banReason,
        expires: getUnixTime(i.state.banExpires),
        auth: UserService.Instance.authField(),
      };
      WebSocketService.Instance.client.banFromCommunity(form);
    } else {
      // If its an unban, restore all their data
      let ban = !cv.creator.banned;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form: BanUser = {
        user_id: cv.creator.id,
        ban,
        remove_data: i.state.removeData,
        reason: i.state.banReason,
        expires: getUnixTime(i.state.banExpires),
        auth: UserService.Instance.authField(),
      };
      WebSocketService.Instance.client.banUser(form);
    }

    i.state.showBanDialog = false;
    i.setState(i.state);
  }

  handleShowConfirmAppointAsMod(i: CommentNode) {
    i.state.showConfirmAppointAsMod = true;
    i.setState(i.state);
  }

  handleCancelConfirmAppointAsMod(i: CommentNode) {
    i.state.showConfirmAppointAsMod = false;
    i.setState(i.state);
  }

  handleAddModToCommunity(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let form: AddModToCommunity = {
      user_id: cv.creator.id,
      community_id: cv.community.id,
      added: !i.isMod,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.addModToCommunity(form);
    i.state.showConfirmAppointAsMod = false;
    i.setState(i.state);
  }

  handleShowConfirmAppointAsAdmin(i: CommentNode) {
    i.state.showConfirmAppointAsAdmin = true;
    i.setState(i.state);
  }

  handleCancelConfirmAppointAsAdmin(i: CommentNode) {
    i.state.showConfirmAppointAsAdmin = false;
    i.setState(i.state);
  }

  handleAddAdmin(i: CommentNode) {
    let form: AddAdmin = {
      user_id: i.props.node.comment_view.creator.id,
      added: !i.isAdmin,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.addAdmin(form);
    i.state.showConfirmAppointAsAdmin = false;
    i.setState(i.state);
  }

  handleShowConfirmTransferCommunity(i: CommentNode) {
    i.state.showConfirmTransferCommunity = true;
    i.setState(i.state);
  }

  handleCancelShowConfirmTransferCommunity(i: CommentNode) {
    i.state.showConfirmTransferCommunity = false;
    i.setState(i.state);
  }

  handleTransferCommunity(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let form: TransferCommunity = {
      community_id: cv.community.id,
      user_id: cv.creator.id,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.transferCommunity(form);
    i.state.showConfirmTransferCommunity = false;
    i.setState(i.state);
  }

  handleShowConfirmTransferSite(i: CommentNode) {
    i.state.showConfirmTransferSite = true;
    i.setState(i.state);
  }

  handleCancelShowConfirmTransferSite(i: CommentNode) {
    i.state.showConfirmTransferSite = false;
    i.setState(i.state);
  }

  handleTransferSite(i: CommentNode) {
    let form: TransferSite = {
      user_id: i.props.node.comment_view.creator.id,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.transferSite(form);
    i.state.showConfirmTransferSite = false;
    i.setState(i.state);
  }

  get isCommentNew(): boolean {
    let now = moment.utc().subtract(10, 'minutes');
    let then = moment.utc(this.props.node.comment_view.comment.published);
    return now.isBefore(then);
  }

  handleCommentCollapse(i: CommentNode) {
    i.state.collapsed = !i.state.collapsed;
    i.setState(i.state);
  }

  handleViewSource(i: CommentNode) {
    i.state.viewSource = !i.state.viewSource;
    i.setState(i.state);
  }

  handleShowAdvanced(i: CommentNode) {
    i.state.showAdvanced = !i.state.showAdvanced;
    i.setState(i.state);
    setupTippy();
  }

  get scoreColor() {
    if (this.state.my_vote == 1) {
      return 'text-info';
    } else if (this.state.my_vote == -1) {
      return 'text-danger';
    } else {
      return 'text-muted';
    }
  }

  get pointsTippy(): string {
    let points = i18n.t('number_of_points', {
      count: this.state.score,
    });

    let upvotes = i18n.t('number_of_upvotes', {
      count: this.state.upvotes,
    });

    let downvotes = i18n.t('number_of_downvotes', {
      count: this.state.downvotes,
    });

    return `${points} • ${upvotes} • ${downvotes}`;
  }
}
