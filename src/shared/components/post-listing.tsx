import { Component, linkEvent } from 'inferno';
import { Link } from 'inferno-router';
import { WebSocketService, UserService } from '../services';
import {
  PostView,
  CreatePostLike,
  DeletePost,
  RemovePost,
  LockPost,
  StickyPost,
  SavePost,
  UserViewSafe,
  BanFromCommunity,
  BanUser,
  AddModToCommunity,
  AddAdmin,
  TransferSite,
  TransferCommunity,
  CommunityModeratorView,
} from 'lemmy-js-client';
import { BanType } from '../interfaces';
import { MomentTime } from './moment-time';
import { PostForm } from './post-form';
import { IFramelyCard } from './iframely-card';
import { UserListing } from './user-listing';
import { CommunityLink } from './community-link';
import { PictrsImage } from './pictrs-image';
import {
  md,
  mdToHtml,
  canMod,
  isMod,
  isImage,
  isVideo,
  getUnixTime,
  setupTippy,
  hostname,
  previewLines,
  wsClient,
  authField,
} from '../utils';
import { i18n } from '../i18next';
import { externalHost } from '../env';

interface PostListingState {
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
  imageExpanded: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showMoreMobile: boolean;
  my_vote: number;
  score: number;
  upvotes: number;
  downvotes: number;
}

interface PostListingProps {
  post_view: PostView;
  duplicates?: PostView[];
  showCommunity?: boolean;
  showBody?: boolean;
  moderators?: CommunityModeratorView[];
  admins?: UserViewSafe[];
  enableDownvotes: boolean;
  enableNsfw: boolean;
}

export class PostListing extends Component<PostListingProps, PostListingState> {
  private emptyState: PostListingState = {
    showEdit: false,
    showRemoveDialog: false,
    removeReason: null,
    showBanDialog: false,
    removeData: null,
    banReason: null,
    banExpires: null,
    banType: BanType.Community,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    imageExpanded: false,
    viewSource: false,
    showAdvanced: false,
    showMoreMobile: false,
    my_vote: this.props.post_view.my_vote,
    score: this.props.post_view.counts.score,
    upvotes: this.props.post_view.counts.upvotes,
    downvotes: this.props.post_view.counts.downvotes,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePostLike = this.handlePostLike.bind(this);
    this.handlePostDisLike = this.handlePostDisLike.bind(this);
    this.handleEditPost = this.handleEditPost.bind(this);
    this.handleEditCancel = this.handleEditCancel.bind(this);
  }

  componentWillReceiveProps(nextProps: PostListingProps) {
    this.state.my_vote = nextProps.post_view.my_vote;
    this.state.upvotes = nextProps.post_view.counts.upvotes;
    this.state.downvotes = nextProps.post_view.counts.downvotes;
    this.state.score = nextProps.post_view.counts.score;
    if (this.props.post_view.post.id !== nextProps.post_view.post.id) {
      this.state.imageExpanded = false;
    }
    this.setState(this.state);
  }

  render() {
    return (
      <div class="">
        {!this.state.showEdit ? (
          <>
            {this.listing()}
            {this.body()}
          </>
        ) : (
          <div class="col-12">
            <PostForm
              post_view={this.props.post_view}
              onEdit={this.handleEditPost}
              onCancel={this.handleEditCancel}
              enableNsfw={this.props.enableNsfw}
              enableDownvotes={this.props.enableDownvotes}
            />
          </div>
        )}
      </div>
    );
  }

  body() {
    let post = this.props.post_view.post;
    return (
      <div class="row">
        <div class="col-12">
          {post.url && this.props.showBody && post.embed_title && (
            <IFramelyCard post={post} />
          )}
          {this.props.showBody &&
            post.body &&
            (this.state.viewSource ? (
              <pre>{post.body}</pre>
            ) : (
              <div
                className="md-div"
                dangerouslySetInnerHTML={mdToHtml(post.body)}
              />
            ))}
        </div>
      </div>
    );
  }

  imgThumb(src: string) {
    let post_view = this.props.post_view;
    return (
      <PictrsImage
        src={src}
        thumbnail
        nsfw={post_view.post.nsfw || post_view.community.nsfw}
      />
    );
  }

  getImageSrc(): string {
    let post = this.props.post_view.post;
    if (isImage(post.url)) {
      if (post.url.includes('pictrs')) {
        return post.url;
      } else if (post.thumbnail_url) {
        return post.thumbnail_url;
      } else {
        return post.url;
      }
    } else if (post.thumbnail_url) {
      return post.thumbnail_url;
    } else {
      return null;
    }
  }

  thumbnail() {
    let post = this.props.post_view.post;

    if (isImage(post.url)) {
      return (
        <div
          class="float-right text-body pointer d-inline-block position-relative mb-2"
          data-tippy-content={i18n.t('expand_here')}
          onClick={linkEvent(this, this.handleImageExpandClick)}
        >
          {this.imgThumb(this.getImageSrc())}
          <svg class="icon mini-overlay">
            <use xlinkHref="#icon-image"></use>
          </svg>
        </div>
      );
    } else if (post.thumbnail_url) {
      return (
        <a
          class="float-right text-body d-inline-block position-relative mb-2"
          href={post.url}
          target="_blank"
          rel="noopener"
          title={post.url}
        >
          {this.imgThumb(this.getImageSrc())}
          <svg class="icon mini-overlay">
            <use xlinkHref="#icon-external-link"></use>
          </svg>
        </a>
      );
    } else if (post.url) {
      if (isVideo(post.url)) {
        return (
          <div class="embed-responsive embed-responsive-16by9">
            <video
              playsinline
              muted
              loop
              controls
              class="embed-responsive-item"
            >
              <source src={post.url} type="video/mp4" />
            </video>
          </div>
        );
      } else {
        return (
          <a
            className="text-body"
            href={post.url}
            target="_blank"
            title={post.url}
            rel="noopener"
          >
            <div class="thumbnail rounded bg-light d-flex justify-content-center">
              <svg class="icon d-flex align-items-center">
                <use xlinkHref="#icon-external-link"></use>
              </svg>
            </div>
          </a>
        );
      }
    } else {
      return (
        <Link
          className="text-body"
          to={`/post/${post.id}`}
          title={i18n.t('comments')}
        >
          <div class="thumbnail rounded bg-light d-flex justify-content-center">
            <svg class="icon d-flex align-items-center">
              <use xlinkHref="#icon-message-square"></use>
            </svg>
          </div>
        </Link>
      );
    }
  }

  createdLine() {
    let post_view = this.props.post_view;
    return (
      <ul class="list-inline mb-1 text-muted small">
        <li className="list-inline-item">
          <UserListing user={post_view.creator} />

          {this.isMod && (
            <span className="mx-1 badge badge-light">{i18n.t('mod')}</span>
          )}
          {this.isAdmin && (
            <span className="mx-1 badge badge-light">{i18n.t('admin')}</span>
          )}
          {(post_view.creator_banned_from_community ||
            post_view.creator.banned) && (
            <span className="mx-1 badge badge-danger">{i18n.t('banned')}</span>
          )}
          {this.props.showCommunity && (
            <span>
              <span class="mx-1"> {i18n.t('to')} </span>
              <CommunityLink community={post_view.community} />
            </span>
          )}
        </li>
        <li className="list-inline-item">•</li>
        {post_view.post.url && !(hostname(post_view.post.url) == externalHost) && (
          <>
            <li className="list-inline-item">
              <a
                className="text-muted font-italic"
                href={post_view.post.url}
                target="_blank"
                title={post_view.post.url}
                rel="noopener"
              >
                {hostname(post_view.post.url)}
              </a>
            </li>
            <li className="list-inline-item">•</li>
          </>
        )}
        <li className="list-inline-item">
          <span>
            <MomentTime data={post_view.post} />
          </span>
        </li>
        {post_view.post.body && (
          <>
            <li className="list-inline-item">•</li>
            <li className="list-inline-item">
              {/* Using a link with tippy doesn't work on touch devices unfortunately */}
              <Link
                className="text-muted"
                data-tippy-content={md.render(
                  previewLines(post_view.post.body)
                )}
                data-tippy-allowHtml={true}
                to={`/post/${post_view.post.id}`}
              >
                <svg class="mr-1 icon icon-inline">
                  <use xlinkHref="#icon-book-open"></use>
                </svg>
              </Link>
            </li>
          </>
        )}
      </ul>
    );
  }

  voteBar() {
    return (
      <div className={`vote-bar col-1 pr-0 small text-center`}>
        <button
          className={`btn-animate btn btn-link p-0 ${
            this.state.my_vote == 1 ? 'text-info' : 'text-muted'
          }`}
          onClick={linkEvent(this, this.handlePostLike)}
          data-tippy-content={i18n.t('upvote')}
        >
          <svg class="icon upvote">
            <use xlinkHref="#icon-arrow-up1"></use>
          </svg>
        </button>
        <div
          class={`unselectable pointer font-weight-bold text-muted px-1`}
          data-tippy-content={this.pointsTippy}
        >
          {this.state.score}
        </div>
        {this.props.enableDownvotes && (
          <button
            className={`btn-animate btn btn-link p-0 ${
              this.state.my_vote == -1 ? 'text-danger' : 'text-muted'
            }`}
            onClick={linkEvent(this, this.handlePostDisLike)}
            data-tippy-content={i18n.t('downvote')}
          >
            <svg class="icon downvote">
              <use xlinkHref="#icon-arrow-down1"></use>
            </svg>
          </button>
        )}
      </div>
    );
  }

  postTitleLine() {
    let post = this.props.post_view.post;
    return (
      <div className="post-title overflow-hidden">
        <h5>
          {this.props.showBody && post.url ? (
            <a
              className={!post.stickied ? 'text-body' : 'text-primary'}
              href={post.url}
              target="_blank"
              title={post.url}
              rel="noopener"
            >
              {post.name}
            </a>
          ) : (
            <Link
              className={!post.stickied ? 'text-body' : 'text-primary'}
              to={`/post/${post.id}`}
              title={i18n.t('comments')}
            >
              {post.name}
            </Link>
          )}
          {(isImage(post.url) || post.thumbnail_url) &&
            (!this.state.imageExpanded ? (
              <span
                class="text-monospace unselectable pointer ml-2 text-muted small"
                data-tippy-content={i18n.t('expand_here')}
                onClick={linkEvent(this, this.handleImageExpandClick)}
              >
                <svg class="icon icon-inline">
                  <use xlinkHref="#icon-plus-square"></use>
                </svg>
              </span>
            ) : (
              <span>
                <span
                  class="text-monospace unselectable pointer ml-2 text-muted small"
                  onClick={linkEvent(this, this.handleImageExpandClick)}
                >
                  <svg class="icon icon-inline">
                    <use xlinkHref="#icon-minus-square"></use>
                  </svg>
                </span>
                <div>
                  <span
                    class="pointer"
                    onClick={linkEvent(this, this.handleImageExpandClick)}
                  >
                    <PictrsImage src={this.getImageSrc()} />
                  </span>
                </div>
              </span>
            ))}
          {post.removed && (
            <small className="ml-2 text-muted font-italic">
              {i18n.t('removed')}
            </small>
          )}
          {post.deleted && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t('deleted')}
            >
              <svg class={`icon icon-inline text-danger`}>
                <use xlinkHref="#icon-trash"></use>
              </svg>
            </small>
          )}
          {post.locked && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t('locked')}
            >
              <svg class={`icon icon-inline text-danger`}>
                <use xlinkHref="#icon-lock"></use>
              </svg>
            </small>
          )}
          {post.stickied && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t('stickied')}
            >
              <svg class={`icon icon-inline text-primary`}>
                <use xlinkHref="#icon-pin"></use>
              </svg>
            </small>
          )}
          {post.nsfw && (
            <small className="ml-2 text-muted font-italic">
              {i18n.t('nsfw')}
            </small>
          )}
        </h5>
      </div>
    );
  }

  commentsLine(mobile: boolean = false) {
    let post_view = this.props.post_view;
    return (
      <div class="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted font-weight-bold mb-1">
        <button class="btn btn-link text-muted p-0">
          <Link
            className="text-muted small"
            title={i18n.t('number_of_comments', {
              count: post_view.counts.comments,
            })}
            to={`/post/${post_view.post.id}`}
          >
            <svg class="mr-1 icon icon-inline">
              <use xlinkHref="#icon-message-square"></use>
            </svg>
            {i18n.t('number_of_comments', {
              count: post_view.counts.comments,
            })}
          </Link>
        </button>
        {!mobile && (
          <>
            {this.state.downvotes !== 0 && (
              <button
                class="btn text-muted py-0 pr-0"
                data-tippy-content={this.pointsTippy}
              >
                <small>
                  <svg class="icon icon-inline mr-1">
                    <use xlinkHref="#icon-arrow-down1"></use>
                  </svg>
                  <span>{this.state.downvotes}</span>
                </small>
              </button>
            )}
            {!this.props.showBody && (
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleSavePostClick)}
                data-tippy-content={
                  post_view.saved ? i18n.t('unsave') : i18n.t('save')
                }
              >
                <small>
                  <svg
                    class={`icon icon-inline ${
                      post_view.saved && 'text-warning'
                    }`}
                  >
                    <use xlinkHref="#icon-star"></use>
                  </svg>
                </small>
              </button>
            )}
          </>
        )}
        {/* This is an expanding spacer for mobile */}
        <div className="flex-grow-1"></div>
        {mobile && (
          <>
            <div>
              <button
                className={`btn-animate btn py-0 px-1 ${
                  this.state.my_vote == 1 ? 'text-info' : 'text-muted'
                }`}
                data-tippy-content={this.pointsTippy}
                onClick={linkEvent(this, this.handlePostLike)}
              >
                <svg class="small icon icon-inline mr-2">
                  <use xlinkHref="#icon-arrow-up1"></use>
                </svg>
                {this.state.upvotes}
              </button>
              {this.props.enableDownvotes && (
                <button
                  className={`ml-2 btn-animate btn py-0 pl-1 ${
                    this.state.my_vote == -1 ? 'text-danger' : 'text-muted'
                  }`}
                  onClick={linkEvent(this, this.handlePostDisLike)}
                  data-tippy-content={this.pointsTippy}
                >
                  <svg class="small icon icon-inline mr-2">
                    <use xlinkHref="#icon-arrow-down1"></use>
                  </svg>
                  {this.state.downvotes !== 0 && (
                    <span>{this.state.downvotes}</span>
                  )}
                </button>
              )}
            </div>
            <button
              class="btn btn-link btn-animate text-muted py-0 pl-1 pr-0"
              onClick={linkEvent(this, this.handleSavePostClick)}
              data-tippy-content={
                post_view.saved ? i18n.t('unsave') : i18n.t('save')
              }
            >
              <svg
                class={`icon icon-inline ${post_view.saved && 'text-warning'}`}
              >
                <use xlinkHref="#icon-star"></use>
              </svg>
            </button>

            {!this.state.showMoreMobile && this.props.showBody && (
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleShowMoreMobile)}
                data-tippy-content={i18n.t('more')}
              >
                <svg class="icon icon-inline">
                  <use xlinkHref="#icon-more-vertical"></use>
                </svg>
              </button>
            )}
            {this.state.showMoreMobile && this.postActions(mobile)}
          </>
        )}
      </div>
    );
  }

  duplicatesLine() {
    return (
      this.props.duplicates && (
        <ul class="list-inline mb-1 small text-muted">
          <>
            <li className="list-inline-item mr-2">
              {i18n.t('cross_posted_to')}
            </li>
            {this.props.duplicates.map(pv => (
              <li className="list-inline-item mr-2">
                <Link to={`/post/${pv.post.id}`}>
                  {pv.community.local
                    ? pv.community.name
                    : `${pv.community.name}@${hostname(pv.community.actor_id)}`}
                </Link>
              </li>
            ))}
          </>
        </ul>
      )
    );
  }

  postActions(mobile: boolean = false) {
    let post_view = this.props.post_view;
    return (
      UserService.Instance.user && (
        <>
          {this.props.showBody && (
            <>
              {!mobile && (
                <button
                  class="btn btn-link btn-animate text-muted py-0 pl-0"
                  onClick={linkEvent(this, this.handleSavePostClick)}
                  data-tippy-content={
                    post_view.saved ? i18n.t('unsave') : i18n.t('save')
                  }
                >
                  <svg
                    class={`icon icon-inline ${
                      post_view.saved && 'text-warning'
                    }`}
                  >
                    <use xlinkHref="#icon-star"></use>
                  </svg>
                </button>
              )}
              <Link
                className="btn btn-link btn-animate text-muted py-0"
                to={`/create_post${this.crossPostParams}`}
                title={i18n.t('cross_post')}
              >
                <svg class="icon icon-inline">
                  <use xlinkHref="#icon-copy"></use>
                </svg>
              </Link>
            </>
          )}
          {this.myPost && this.props.showBody && (
            <>
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleEditClick)}
                data-tippy-content={i18n.t('edit')}
              >
                <svg class="icon icon-inline">
                  <use xlinkHref="#icon-edit"></use>
                </svg>
              </button>
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleDeleteClick)}
                data-tippy-content={
                  !post_view.post.deleted ? i18n.t('delete') : i18n.t('restore')
                }
              >
                <svg
                  class={`icon icon-inline ${
                    post_view.post.deleted && 'text-danger'
                  }`}
                >
                  <use xlinkHref="#icon-trash"></use>
                </svg>
              </button>
            </>
          )}

          {!this.state.showAdvanced && this.props.showBody ? (
            <button
              class="btn btn-link btn-animate text-muted py-0"
              onClick={linkEvent(this, this.handleShowAdvanced)}
              data-tippy-content={i18n.t('more')}
            >
              <svg class="icon icon-inline">
                <use xlinkHref="#icon-more-vertical"></use>
              </svg>
            </button>
          ) : (
            <>
              {this.props.showBody && post_view.post.body && (
                <button
                  class="btn btn-link btn-animate text-muted py-0"
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
              )}
              {this.canModOnSelf && (
                <>
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModLock)}
                    data-tippy-content={
                      post_view.post.locked ? i18n.t('unlock') : i18n.t('lock')
                    }
                  >
                    <svg
                      class={`icon icon-inline ${
                        post_view.post.locked && 'text-danger'
                      }`}
                    >
                      <use xlinkHref="#icon-lock"></use>
                    </svg>
                  </button>
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModSticky)}
                    data-tippy-content={
                      post_view.post.stickied
                        ? i18n.t('unsticky')
                        : i18n.t('sticky')
                    }
                  >
                    <svg
                      class={`icon icon-inline ${
                        post_view.post.stickied && 'text-success'
                      }`}
                    >
                      <use xlinkHref="#icon-pin"></use>
                    </svg>
                  </button>
                </>
              )}
              {/* Mods can ban from community, and appoint as mods to community */}
              {(this.canMod || this.canAdmin) &&
                (!post_view.post.removed ? (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModRemoveShow)}
                  >
                    {i18n.t('remove')}
                  </button>
                ) : (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModRemoveSubmit)}
                  >
                    {i18n.t('restore')}
                  </button>
                ))}
              {this.canMod && (
                <>
                  {!this.isMod &&
                    (!post_view.creator_banned_from_community ? (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(
                          this,
                          this.handleModBanFromCommunityShow
                        )}
                      >
                        {i18n.t('ban')}
                      </button>
                    ) : (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(
                          this,
                          this.handleModBanFromCommunitySubmit
                        )}
                      >
                        {i18n.t('unban')}
                      </button>
                    ))}
                  {!post_view.creator_banned_from_community &&
                    post_view.creator.local && (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(this, this.handleAddModToCommunity)}
                      >
                        {this.isMod
                          ? i18n.t('remove_as_mod')
                          : i18n.t('appoint_as_mod')}
                      </button>
                    )}
                </>
              )}
              {/* Community creators and admins can transfer community to another mod */}
              {(this.amCommunityCreator || this.canAdmin) &&
                this.isMod &&
                post_view.creator.local &&
                (!this.state.showConfirmTransferCommunity ? (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(
                      this,
                      this.handleShowConfirmTransferCommunity
                    )}
                  >
                    {i18n.t('transfer_community')}
                  </button>
                ) : (
                  <>
                    <button class="d-inline-block mr-1 btn btn-link btn-animate text-muted py-0">
                      {i18n.t('are_you_sure')}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1"
                      onClick={linkEvent(this, this.handleTransferCommunity)}
                    >
                      {i18n.t('yes')}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleCancelShowConfirmTransferCommunity
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
                    (!post_view.creator.banned ? (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(this, this.handleModBanShow)}
                      >
                        {i18n.t('ban_from_site')}
                      </button>
                    ) : (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(this, this.handleModBanSubmit)}
                      >
                        {i18n.t('unban_from_site')}
                      </button>
                    ))}
                  {!post_view.creator.banned && post_view.creator.local && (
                    <button
                      class="btn btn-link btn-animate text-muted py-0"
                      onClick={linkEvent(this, this.handleAddAdmin)}
                    >
                      {this.isAdmin
                        ? i18n.t('remove_as_admin')
                        : i18n.t('appoint_as_admin')}
                    </button>
                  )}
                </>
              )}
              {/* Site Creator can transfer to another admin */}
              {this.amSiteCreator &&
                this.isAdmin &&
                (!this.state.showConfirmTransferSite ? (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(
                      this,
                      this.handleShowConfirmTransferSite
                    )}
                  >
                    {i18n.t('transfer_site')}
                  </button>
                ) : (
                  <>
                    <button class="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1">
                      {i18n.t('are_you_sure')}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1"
                      onClick={linkEvent(this, this.handleTransferSite)}
                    >
                      {i18n.t('yes')}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block"
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
      )
    );
  }

  removeAndBanDialogs() {
    let post = this.props.post_view;
    return (
      <>
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
              {i18n.t('remove_post')}
            </button>
          </form>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div class="form-group row">
              <label class="col-form-label" htmlFor="post-listing-reason">
                {i18n.t('reason')}
              </label>
              <input
                type="text"
                id="post-listing-reason"
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
                {i18n.t('ban')} {post.creator.name}
              </button>
            </div>
          </form>
        )}
      </>
    );
  }

  mobileThumbnail() {
    let post = this.props.post_view.post;
    return post.thumbnail_url || isImage(post.url) ? (
      <div class="row">
        <div className={`${this.state.imageExpanded ? 'col-12' : 'col-8'}`}>
          {this.postTitleLine()}
        </div>
        <div class="col-4">
          {/* Post body prev or thumbnail */}
          {!this.state.imageExpanded && this.thumbnail()}
        </div>
      </div>
    ) : (
      this.postTitleLine()
    );
  }

  showMobilePreview() {
    let post = this.props.post_view.post;
    return (
      post.body &&
      !this.props.showBody && (
        <div
          className="md-div mb-1"
          dangerouslySetInnerHTML={{
            __html: md.render(previewLines(post.body)),
          }}
        />
      )
    );
  }

  listing() {
    return (
      <>
        {/* The mobile view*/}
        <div class="d-block d-sm-none">
          <div class="row">
            <div class="col-12">
              {this.createdLine()}

              {/* If it has a thumbnail, do a right aligned thumbnail */}
              {this.mobileThumbnail()}

              {/* Show a preview of the post body */}
              {this.showMobilePreview()}

              {this.commentsLine(true)}
              {this.duplicatesLine()}
              {this.removeAndBanDialogs()}
            </div>
          </div>
        </div>

        {/* The larger view*/}
        <div class="d-none d-sm-block">
          <div class="row">
            {this.voteBar()}
            {!this.state.imageExpanded && (
              <div class="col-sm-2 pr-0">
                <div class="">{this.thumbnail()}</div>
              </div>
            )}
            <div
              class={`${
                this.state.imageExpanded ? 'col-12' : 'col-12 col-sm-9'
              }`}
            >
              <div class="row">
                <div className="col-12">
                  {this.postTitleLine()}
                  {this.createdLine()}
                  {this.commentsLine()}
                  {this.duplicatesLine()}
                  {this.postActions()}
                  {this.removeAndBanDialogs()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  private get myPost(): boolean {
    return (
      UserService.Instance.user &&
      this.props.post_view.creator.id == UserService.Instance.user.id
    );
  }

  get isMod(): boolean {
    return (
      this.props.moderators &&
      isMod(
        this.props.moderators.map(m => m.moderator.id),
        this.props.post_view.creator.id
      )
    );
  }

  get isAdmin(): boolean {
    return (
      this.props.admins &&
      isMod(
        this.props.admins.map(a => a.user.id),
        this.props.post_view.creator.id
      )
    );
  }

  get canMod(): boolean {
    if (this.props.admins && this.props.moderators) {
      let adminsThenMods = this.props.admins
        .map(a => a.user.id)
        .concat(this.props.moderators.map(m => m.moderator.id));

      return canMod(
        UserService.Instance.user,
        adminsThenMods,
        this.props.post_view.creator.id
      );
    } else {
      return false;
    }
  }

  get canModOnSelf(): boolean {
    if (this.props.admins && this.props.moderators) {
      let adminsThenMods = this.props.admins
        .map(a => a.user.id)
        .concat(this.props.moderators.map(m => m.moderator.id));

      return canMod(
        UserService.Instance.user,
        adminsThenMods,
        this.props.post_view.creator.id,
        true
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
        this.props.post_view.creator.id
      )
    );
  }

  get amCommunityCreator(): boolean {
    return (
      this.props.moderators &&
      UserService.Instance.user &&
      this.props.post_view.creator.id != UserService.Instance.user.id &&
      UserService.Instance.user.id == this.props.moderators[0].moderator.id
    );
  }

  get amSiteCreator(): boolean {
    return (
      this.props.admins &&
      UserService.Instance.user &&
      this.props.post_view.creator.id != UserService.Instance.user.id &&
      UserService.Instance.user.id == this.props.admins[0].user.id
    );
  }

  handlePostLike(i: PostListing) {
    if (!UserService.Instance.user) {
      this.context.router.history.push(`/login`);
    }

    let new_vote = i.state.my_vote == 1 ? 0 : 1;

    if (i.state.my_vote == 1) {
      i.state.score--;
      i.state.upvotes--;
    } else if (i.state.my_vote == -1) {
      i.state.downvotes--;
      i.state.upvotes++;
      i.state.score += 2;
    } else {
      i.state.upvotes++;
      i.state.score++;
    }

    i.state.my_vote = new_vote;

    let form: CreatePostLike = {
      post_id: i.props.post_view.post.id,
      score: i.state.my_vote,
      auth: authField(),
    };

    WebSocketService.Instance.send(wsClient.likePost(form));
    i.setState(i.state);
    setupTippy();
  }

  handlePostDisLike(i: PostListing) {
    if (!UserService.Instance.user) {
      this.context.router.history.push(`/login`);
    }

    let new_vote = i.state.my_vote == -1 ? 0 : -1;

    if (i.state.my_vote == 1) {
      i.state.score -= 2;
      i.state.upvotes--;
      i.state.downvotes++;
    } else if (i.state.my_vote == -1) {
      i.state.downvotes--;
      i.state.score++;
    } else {
      i.state.downvotes++;
      i.state.score--;
    }

    i.state.my_vote = new_vote;

    let form: CreatePostLike = {
      post_id: i.props.post_view.post.id,
      score: i.state.my_vote,
      auth: authField(),
    };

    WebSocketService.Instance.send(wsClient.likePost(form));
    i.setState(i.state);
    setupTippy();
  }

  handleEditClick(i: PostListing) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleEditCancel() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  // The actual editing is done in the recieve for post
  handleEditPost() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleDeleteClick(i: PostListing) {
    let deleteForm: DeletePost = {
      edit_id: i.props.post_view.post.id,
      deleted: !i.props.post_view.post.deleted,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.deletePost(deleteForm));
  }

  handleSavePostClick(i: PostListing) {
    let saved =
      i.props.post_view.saved == undefined ? true : !i.props.post_view.saved;
    let form: SavePost = {
      post_id: i.props.post_view.post.id,
      save: saved,
      auth: authField(),
    };

    WebSocketService.Instance.send(wsClient.savePost(form));
  }

  get crossPostParams(): string {
    let post = this.props.post_view.post;
    let params = `?title=${post.name}`;

    if (post.url) {
      params += `&url=${encodeURIComponent(post.url)}`;
    }
    if (post.body) {
      params += `&body=${post.body}`;
    }
    return params;
  }

  handleModRemoveShow(i: PostListing) {
    i.state.showRemoveDialog = true;
    i.setState(i.state);
  }

  handleModRemoveReasonChange(i: PostListing, event: any) {
    i.state.removeReason = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveDataChange(i: PostListing, event: any) {
    i.state.removeData = event.target.checked;
    i.setState(i.state);
  }

  handleModRemoveSubmit(i: PostListing) {
    event.preventDefault();
    let form: RemovePost = {
      edit_id: i.props.post_view.post.id,
      removed: !i.props.post_view.post.removed,
      reason: i.state.removeReason,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.removePost(form));

    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  handleModLock(i: PostListing) {
    let form: LockPost = {
      edit_id: i.props.post_view.post.id,
      locked: !i.props.post_view.post.locked,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.lockPost(form));
  }

  handleModSticky(i: PostListing) {
    let form: StickyPost = {
      edit_id: i.props.post_view.post.id,
      stickied: !i.props.post_view.post.stickied,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.stickyPost(form));
  }

  handleModBanFromCommunityShow(i: PostListing) {
    i.state.showBanDialog = true;
    i.state.banType = BanType.Community;
    i.setState(i.state);
  }

  handleModBanShow(i: PostListing) {
    i.state.showBanDialog = true;
    i.state.banType = BanType.Site;
    i.setState(i.state);
  }

  handleModBanReasonChange(i: PostListing, event: any) {
    i.state.banReason = event.target.value;
    i.setState(i.state);
  }

  handleModBanExpiresChange(i: PostListing, event: any) {
    i.state.banExpires = event.target.value;
    i.setState(i.state);
  }

  handleModBanFromCommunitySubmit(i: PostListing) {
    i.state.banType = BanType.Community;
    i.setState(i.state);
    i.handleModBanBothSubmit(i);
  }

  handleModBanSubmit(i: PostListing) {
    i.state.banType = BanType.Site;
    i.setState(i.state);
    i.handleModBanBothSubmit(i);
  }

  handleModBanBothSubmit(i: PostListing) {
    event.preventDefault();

    if (i.state.banType == BanType.Community) {
      // If its an unban, restore all their data
      let ban = !i.props.post_view.creator_banned_from_community;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form: BanFromCommunity = {
        user_id: i.props.post_view.creator.id,
        community_id: i.props.post_view.community.id,
        ban,
        remove_data: i.state.removeData,
        reason: i.state.banReason,
        expires: getUnixTime(i.state.banExpires),
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.banFromCommunity(form));
    } else {
      // If its an unban, restore all their data
      let ban = !i.props.post_view.creator.banned;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form: BanUser = {
        user_id: i.props.post_view.creator.id,
        ban,
        remove_data: i.state.removeData,
        reason: i.state.banReason,
        expires: getUnixTime(i.state.banExpires),
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.banUser(form));
    }

    i.state.showBanDialog = false;
    i.setState(i.state);
  }

  handleAddModToCommunity(i: PostListing) {
    let form: AddModToCommunity = {
      user_id: i.props.post_view.creator.id,
      community_id: i.props.post_view.community.id,
      added: !i.isMod,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.setState(i.state);
  }

  handleAddAdmin(i: PostListing) {
    let form: AddAdmin = {
      user_id: i.props.post_view.creator.id,
      added: !i.isAdmin,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.addAdmin(form));
    i.setState(i.state);
  }

  handleShowConfirmTransferCommunity(i: PostListing) {
    i.state.showConfirmTransferCommunity = true;
    i.setState(i.state);
  }

  handleCancelShowConfirmTransferCommunity(i: PostListing) {
    i.state.showConfirmTransferCommunity = false;
    i.setState(i.state);
  }

  handleTransferCommunity(i: PostListing) {
    let form: TransferCommunity = {
      community_id: i.props.post_view.community.id,
      user_id: i.props.post_view.creator.id,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.transferCommunity(form));
    i.state.showConfirmTransferCommunity = false;
    i.setState(i.state);
  }

  handleShowConfirmTransferSite(i: PostListing) {
    i.state.showConfirmTransferSite = true;
    i.setState(i.state);
  }

  handleCancelShowConfirmTransferSite(i: PostListing) {
    i.state.showConfirmTransferSite = false;
    i.setState(i.state);
  }

  handleTransferSite(i: PostListing) {
    let form: TransferSite = {
      user_id: i.props.post_view.creator.id,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.transferSite(form));
    i.state.showConfirmTransferSite = false;
    i.setState(i.state);
  }

  handleImageExpandClick(i: PostListing) {
    i.state.imageExpanded = !i.state.imageExpanded;
    i.setState(i.state);
  }

  handleViewSource(i: PostListing) {
    i.state.viewSource = !i.state.viewSource;
    i.setState(i.state);
  }

  handleShowAdvanced(i: PostListing) {
    i.state.showAdvanced = !i.state.showAdvanced;
    i.setState(i.state);
    setupTippy();
  }

  handleShowMoreMobile(i: PostListing) {
    i.state.showMoreMobile = !i.state.showMoreMobile;
    i.state.showAdvanced = !i.state.showAdvanced;
    i.setState(i.state);
    setupTippy();
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
