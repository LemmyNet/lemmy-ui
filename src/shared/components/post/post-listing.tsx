import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommunityModeratorView,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  LockPost,
  PersonViewSafe,
  PostView,
  RemovePost,
  SavePost,
  StickyPost,
  TransferCommunity,
  TransferSite,
} from "lemmy-js-client";
import { externalHost } from "../../env";
import { i18n } from "../../i18next";
import { BanType } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  canMod,
  getUnixTime,
  hostname,
  isImage,
  isMod,
  isVideo,
  md,
  mdToHtml,
  numToSI,
  previewLines,
  setupTippy,
  showScores,
  wsClient,
} from "../../utils";
import { Icon } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PictrsImage } from "../common/pictrs-image";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { MetadataCard } from "./metadata-card";
import { PostForm } from "./post-form";

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
  showBody: boolean;
  showReportDialog: boolean;
  reportReason: string;
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
  admins?: PersonViewSafe[];
  enableDownvotes: boolean;
  enableNsfw: boolean;
}

export class PostListing extends Component<PostListingProps, PostListingState> {
  private emptyState: PostListingState = {
    showEdit: false,
    showRemoveDialog: false,
    removeReason: null,
    showBanDialog: false,
    removeData: false,
    banReason: null,
    banExpires: null,
    banType: BanType.Community,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    imageExpanded: false,
    viewSource: false,
    showAdvanced: false,
    showMoreMobile: false,
    showBody: false,
    showReportDialog: false,
    reportReason: null,
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
          {post.url && this.showBody && post.embed_title && (
            <MetadataCard post={post} />
          )}
          {this.showBody &&
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
        alt=""
        nsfw={post_view.post.nsfw || post_view.community.nsfw}
      />
    );
  }

  getImageSrc(): string {
    let post = this.props.post_view.post;
    if (isImage(post.url)) {
      if (post.url.includes("pictrs")) {
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
        <a
          href={this.getImageSrc()}
          class="float-right text-body d-inline-block position-relative mb-2"
          data-tippy-content={i18n.t("expand_here")}
          onClick={linkEvent(this, this.handleImageExpandClick)}
          aria-label={i18n.t("expand_here")}
        >
          {this.imgThumb(this.getImageSrc())}
          <Icon icon="image" classes="mini-overlay" />
        </a>
      );
    } else if (post.thumbnail_url) {
      return (
        <a
          class="float-right text-body d-inline-block position-relative mb-2"
          href={post.url}
          rel="noopener"
          title={post.url}
        >
          {this.imgThumb(this.getImageSrc())}
          <Icon icon="external-link" classes="mini-overlay" />
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
            title={post.url}
            rel="noopener"
          >
            <div class="thumbnail rounded bg-light d-flex justify-content-center">
              <Icon icon="external-link" classes="d-flex align-items-center" />
            </div>
          </a>
        );
      }
    } else {
      return (
        <Link
          className="text-body"
          to={`/post/${post.id}`}
          title={i18n.t("comments")}
        >
          <div class="thumbnail rounded bg-light d-flex justify-content-center">
            <Icon icon="message-square" classes="d-flex align-items-center" />
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
          <PersonListing person={post_view.creator} />

          {this.isMod && (
            <span className="mx-1 badge badge-light">{i18n.t("mod")}</span>
          )}
          {this.isAdmin && (
            <span className="mx-1 badge badge-light">{i18n.t("admin")}</span>
          )}
          {(post_view.creator_banned_from_community ||
            post_view.creator.banned) && (
            <span className="mx-1 badge badge-danger">{i18n.t("banned")}</span>
          )}
          {post_view.creator_blocked && (
            <span className="mx-1 badge badge-danger">{"blocked"}</span>
          )}
          {this.props.showCommunity && (
            <span>
              <span class="mx-1"> {i18n.t("to")} </span>
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
              <button
                className="text-muted btn btn-sm btn-link p-0"
                data-tippy-content={md.render(
                  previewLines(post_view.post.body)
                )}
                data-tippy-allowHtml={true}
                onClick={linkEvent(this, this.handleShowBody)}
              >
                <Icon icon="book-open" classes="icon-inline mr-1" />
              </button>
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
            this.state.my_vote == 1 ? "text-info" : "text-muted"
          }`}
          onClick={linkEvent(this, this.handlePostLike)}
          data-tippy-content={i18n.t("upvote")}
          aria-label={i18n.t("upvote")}
        >
          <Icon icon="arrow-up1" classes="upvote" />
        </button>
        {showScores() ? (
          <div
            class={`unselectable pointer font-weight-bold text-muted px-1`}
            data-tippy-content={this.pointsTippy}
          >
            {numToSI(this.state.score)}
          </div>
        ) : (
          <div class="p-1"></div>
        )}
        {this.props.enableDownvotes && (
          <button
            className={`btn-animate btn btn-link p-0 ${
              this.state.my_vote == -1 ? "text-danger" : "text-muted"
            }`}
            onClick={linkEvent(this, this.handlePostDisLike)}
            data-tippy-content={i18n.t("downvote")}
            aria-label={i18n.t("downvote")}
          >
            <Icon icon="arrow-down1" classes="downvote" />
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
          {this.showBody && post.url ? (
            <a
              className={!post.stickied ? "text-body" : "text-primary"}
              href={post.url}
              title={post.url}
              rel="noopener"
            >
              {post.name}
            </a>
          ) : (
            <Link
              className={!post.stickied ? "text-body" : "text-primary"}
              to={`/post/${post.id}`}
              title={i18n.t("comments")}
            >
              {post.name}
            </Link>
          )}
          {(isImage(post.url) || post.thumbnail_url) &&
            (!this.state.imageExpanded ? (
              <button
                class="btn btn-link text-monospace text-muted small d-inline-block ml-2"
                data-tippy-content={i18n.t("expand_here")}
                onClick={linkEvent(this, this.handleImageExpandClick)}
              >
                <Icon icon="plus-square" classes="icon-inline" />
              </button>
            ) : (
              <span>
                <button
                  class="btn btn-link text-monospace text-muted small d-inline-block ml-2"
                  onClick={linkEvent(this, this.handleImageExpandClick)}
                >
                  <Icon icon="minus-square" classes="icon-inline" />
                </button>
                <div>
                  <a
                    href={this.getImageSrc()}
                    class="btn btn-link d-inline-block"
                    onClick={linkEvent(this, this.handleImageExpandClick)}
                  >
                    <PictrsImage src={this.getImageSrc()} />
                  </a>
                </div>
              </span>
            ))}
          {post.removed && (
            <small className="ml-2 text-muted font-italic">
              {i18n.t("removed")}
            </small>
          )}
          {post.deleted && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t("deleted")}
            >
              <Icon icon="trash" classes="icon-inline text-danger" />
            </small>
          )}
          {post.locked && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t("locked")}
            >
              <Icon icon="lock" classes="icon-inline text-danger" />
            </small>
          )}
          {post.stickied && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t("stickied")}
            >
              <Icon icon="pin" classes="icon-inline text-primary" />
            </small>
          )}
          {post.nsfw && (
            <small className="ml-2 text-muted font-italic">
              {i18n.t("nsfw")}
            </small>
          )}
        </h5>
      </div>
    );
  }

  commentsLine(mobile = false) {
    let post_view = this.props.post_view;
    return (
      <div class="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted font-weight-bold mb-1">
        <button class="btn btn-link text-muted p-0">
          <Link
            className="text-muted small"
            title={i18n.t("number_of_comments", {
              count: post_view.counts.comments,
              formattedCount: post_view.counts.comments,
            })}
            to={`/post/${post_view.post.id}?scrollToComments=true`}
          >
            <Icon icon="message-square" classes="icon-inline mr-1" />
            {i18n.t("number_of_comments", {
              count: post_view.counts.comments,
              formattedCount: numToSI(post_view.counts.comments),
            })}
          </Link>
        </button>
        {!mobile && (
          <>
            {this.state.downvotes !== 0 && showScores() && (
              <button
                class="btn text-muted py-0 pr-0"
                data-tippy-content={this.pointsTippy}
                aria-label={i18n.t("downvote")}
              >
                <small>
                  <Icon icon="arrow-down1" classes="icon-inline mr-1" />
                  <span>{numToSI(this.state.downvotes)}</span>
                </small>
              </button>
            )}
            {!this.showBody && (
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleSavePostClick)}
                data-tippy-content={
                  post_view.saved ? i18n.t("unsave") : i18n.t("save")
                }
                aria-label={post_view.saved ? i18n.t("unsave") : i18n.t("save")}
              >
                <small>
                  <Icon
                    icon="star"
                    classes={`icon-inline ${post_view.saved && "text-warning"}`}
                  />
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
              {showScores() ? (
                <button
                  className={`btn-animate btn py-0 px-1 ${
                    this.state.my_vote == 1 ? "text-info" : "text-muted"
                  }`}
                  data-tippy-content={this.pointsTippy}
                  onClick={linkEvent(this, this.handlePostLike)}
                  aria-label={i18n.t("upvote")}
                >
                  <Icon icon="arrow-up1" classes="icon-inline small mr-2" />
                  {numToSI(this.state.upvotes)}
                </button>
              ) : (
                <button
                  className={`btn-animate btn py-0 px-1 ${
                    this.state.my_vote == 1 ? "text-info" : "text-muted"
                  }`}
                  onClick={linkEvent(this, this.handlePostLike)}
                  aria-label={i18n.t("upvote")}
                >
                  <Icon icon="arrow-up1" classes="icon-inline small" />
                </button>
              )}
              {this.props.enableDownvotes &&
                (showScores() ? (
                  <button
                    className={`ml-2 btn-animate btn py-0 pl-1 ${
                      this.state.my_vote == -1 ? "text-danger" : "text-muted"
                    }`}
                    onClick={linkEvent(this, this.handlePostDisLike)}
                    data-tippy-content={this.pointsTippy}
                    aria-label={i18n.t("downvote")}
                  >
                    <Icon icon="arrow-down1" classes="icon-inline small mr-2" />
                    {this.state.downvotes !== 0 && (
                      <span>{numToSI(this.state.downvotes)}</span>
                    )}
                  </button>
                ) : (
                  <button
                    className={`ml-2 btn-animate btn py-0 pl-1 ${
                      this.state.my_vote == -1 ? "text-danger" : "text-muted"
                    }`}
                    onClick={linkEvent(this, this.handlePostDisLike)}
                    aria-label={i18n.t("downvote")}
                  >
                    <Icon icon="arrow-down1" classes="icon-inline small" />
                  </button>
                ))}
            </div>
            <button
              class="btn btn-link btn-animate text-muted py-0 pl-1 pr-0"
              onClick={linkEvent(this, this.handleSavePostClick)}
              aria-label={post_view.saved ? i18n.t("unsave") : i18n.t("save")}
              data-tippy-content={
                post_view.saved ? i18n.t("unsave") : i18n.t("save")
              }
            >
              <Icon
                icon="star"
                classes={`icon-inline ${post_view.saved && "text-warning"}`}
              />
            </button>

            {!this.state.showMoreMobile && this.showBody && (
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleShowMoreMobile)}
                aria-label={i18n.t("more")}
                data-tippy-content={i18n.t("more")}
              >
                <Icon icon="more-vertical" classes="icon-inline" />
              </button>
            )}
            {this.state.showMoreMobile && this.postActions(mobile)}
          </>
        )}
      </div>
    );
  }

  duplicatesLine() {
    let dupes = this.props.duplicates;
    return (
      dupes &&
      dupes.length > 0 && (
        <ul class="list-inline mb-1 small text-muted">
          <>
            <li className="list-inline-item mr-2">
              {i18n.t("cross_posted_to")}
            </li>
            {dupes.map(pv => (
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

  postActions(mobile = false) {
    let post_view = this.props.post_view;
    return (
      UserService.Instance.myUserInfo && (
        <>
          {this.showBody && (
            <>
              {!mobile && (
                <button
                  class="btn btn-link btn-animate text-muted py-0 pl-0"
                  onClick={linkEvent(this, this.handleSavePostClick)}
                  data-tippy-content={
                    post_view.saved ? i18n.t("unsave") : i18n.t("save")
                  }
                  aria-label={
                    post_view.saved ? i18n.t("unsave") : i18n.t("save")
                  }
                >
                  <Icon
                    icon="star"
                    classes={`icon-inline ${post_view.saved && "text-warning"}`}
                  />
                </button>
              )}
              <Link
                className="btn btn-link btn-animate text-muted py-0"
                to={`/create_post${this.crossPostParams}`}
                title={i18n.t("cross_post")}
              >
                <Icon icon="copy" classes="icon-inline" />
              </Link>
              {!this.myPost && (
                <>
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleShowReportDialog)}
                    data-tippy-content={i18n.t("show_report_dialog")}
                    aria-label={i18n.t("show_report_dialog")}
                  >
                    <Icon icon="flag" classes="icon-inline" />
                  </button>
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleBlockUserClick)}
                    data-tippy-content={i18n.t("block_user")}
                    aria-label={i18n.t("block_user")}
                  >
                    <Icon icon="slash" classes="icon-inline" />
                  </button>
                </>
              )}
            </>
          )}
          {this.myPost && this.showBody && (
            <>
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleEditClick)}
                data-tippy-content={i18n.t("edit")}
                aria-label={i18n.t("edit")}
              >
                <Icon icon="edit" classes="icon-inline" />
              </button>
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleDeleteClick)}
                data-tippy-content={
                  !post_view.post.deleted ? i18n.t("delete") : i18n.t("restore")
                }
                aria-label={
                  !post_view.post.deleted ? i18n.t("delete") : i18n.t("restore")
                }
              >
                <Icon
                  icon="trash"
                  classes={`icon-inline ${
                    post_view.post.deleted && "text-danger"
                  }`}
                />
              </button>
            </>
          )}

          {!this.state.showAdvanced && this.showBody ? (
            <button
              class="btn btn-link btn-animate text-muted py-0"
              onClick={linkEvent(this, this.handleShowAdvanced)}
              data-tippy-content={i18n.t("more")}
              aria-label={i18n.t("more")}
            >
              <Icon icon="more-vertical" classes="icon-inline" />
            </button>
          ) : (
            <>
              {this.showBody && post_view.post.body && (
                <button
                  class="btn btn-link btn-animate text-muted py-0"
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
              )}
              {this.canModOnSelf && (
                <>
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModLock)}
                    data-tippy-content={
                      post_view.post.locked ? i18n.t("unlock") : i18n.t("lock")
                    }
                    aria-label={
                      post_view.post.locked ? i18n.t("unlock") : i18n.t("lock")
                    }
                  >
                    <Icon
                      icon="lock"
                      classes={`icon-inline ${
                        post_view.post.locked && "text-danger"
                      }`}
                    />
                  </button>
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModSticky)}
                    data-tippy-content={
                      post_view.post.stickied
                        ? i18n.t("unsticky")
                        : i18n.t("sticky")
                    }
                    aria-label={
                      post_view.post.stickied
                        ? i18n.t("unsticky")
                        : i18n.t("sticky")
                    }
                  >
                    <Icon
                      icon="pin"
                      classes={`icon-inline ${
                        post_view.post.stickied && "text-success"
                      }`}
                    />
                  </button>
                </>
              )}
              {/* Mods can ban from community, and appoint as mods to community */}
              {(this.canMod || this.canAdmin) &&
                (!post_view.post.removed ? (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModRemoveShow)}
                    aria-label={i18n.t("remove")}
                  >
                    {i18n.t("remove")}
                  </button>
                ) : (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handleModRemoveSubmit)}
                    aria-label={i18n.t("restore")}
                  >
                    {i18n.t("restore")}
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
                        aria-label={i18n.t("ban")}
                      >
                        {i18n.t("ban")}
                      </button>
                    ) : (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(
                          this,
                          this.handleModBanFromCommunitySubmit
                        )}
                        aria-label={i18n.t("unban")}
                      >
                        {i18n.t("unban")}
                      </button>
                    ))}
                  {!post_view.creator_banned_from_community && (
                    <button
                      class="btn btn-link btn-animate text-muted py-0"
                      onClick={linkEvent(this, this.handleAddModToCommunity)}
                      aria-label={
                        this.isMod
                          ? i18n.t("remove_as_mod")
                          : i18n.t("appoint_as_mod")
                      }
                    >
                      {this.isMod
                        ? i18n.t("remove_as_mod")
                        : i18n.t("appoint_as_mod")}
                    </button>
                  )}
                </>
              )}
              {/* Community creators and admins can transfer community to another mod */}
              {(this.amCommunityCreator || this.canAdmin) &&
                this.isMod &&
                (!this.state.showConfirmTransferCommunity ? (
                  <button
                    class="btn btn-link btn-animate text-muted py-0"
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
                      class="d-inline-block mr-1 btn btn-link btn-animate text-muted py-0"
                      aria-label={i18n.t("are_you_sure")}
                    >
                      {i18n.t("are_you_sure")}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1"
                      aria-label={i18n.t("yes")}
                      onClick={linkEvent(this, this.handleTransferCommunity)}
                    >
                      {i18n.t("yes")}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleCancelShowConfirmTransferCommunity
                      )}
                      aria-label={i18n.t("no")}
                    >
                      {i18n.t("no")}
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
                        aria-label={i18n.t("ban_from_site")}
                      >
                        {i18n.t("ban_from_site")}
                      </button>
                    ) : (
                      <button
                        class="btn btn-link btn-animate text-muted py-0"
                        onClick={linkEvent(this, this.handleModBanSubmit)}
                        aria-label={i18n.t("unban_from_site")}
                      >
                        {i18n.t("unban_from_site")}
                      </button>
                    ))}
                  {!post_view.creator.banned && post_view.creator.local && (
                    <button
                      class="btn btn-link btn-animate text-muted py-0"
                      onClick={linkEvent(this, this.handleAddAdmin)}
                      aria-label={
                        this.isAdmin
                          ? i18n.t("remove_as_admin")
                          : i18n.t("appoint_as_admin")
                      }
                    >
                      {this.isAdmin
                        ? i18n.t("remove_as_admin")
                        : i18n.t("appoint_as_admin")}
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
                    aria-label={i18n.t("transfer_site")}
                  >
                    {i18n.t("transfer_site")}
                  </button>
                ) : (
                  <>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1"
                      aria-label={i18n.t("are_you_sure")}
                    >
                      {i18n.t("are_you_sure")}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1"
                      onClick={linkEvent(this, this.handleTransferSite)}
                      aria-label={i18n.t("yes")}
                    >
                      {i18n.t("yes")}
                    </button>
                    <button
                      class="btn btn-link btn-animate text-muted py-0 d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleCancelShowConfirmTransferSite
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
            <label class="sr-only" htmlFor="post-listing-remove-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="post-listing-remove-reason"
              class="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={this.state.removeReason}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button
              type="submit"
              class="btn btn-secondary"
              aria-label={i18n.t("remove_post")}
            >
              {i18n.t("remove_post")}
            </button>
          </form>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div class="form-group row">
              <label class="col-form-label" htmlFor="post-listing-ban-reason">
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="post-listing-ban-reason"
                class="form-control mr-2"
                placeholder={i18n.t("reason")}
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
                  <label
                    class="form-check-label"
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
            <div class="form-group row">
              <button
                type="submit"
                class="btn btn-secondary"
                aria-label={i18n.t("ban")}
              >
                {i18n.t("ban")} {post.creator.name}
              </button>
            </div>
          </form>
        )}
        {this.state.showReportDialog && (
          <form
            class="form-inline"
            onSubmit={linkEvent(this, this.handleReportSubmit)}
          >
            <label class="sr-only" htmlFor="post-report-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="post-report-reason"
              class="form-control mr-2"
              placeholder={i18n.t("reason")}
              required
              value={this.state.reportReason}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button
              type="submit"
              class="btn btn-secondary"
              aria-label={i18n.t("create_report")}
            >
              {i18n.t("create_report")}
            </button>
          </form>
        )}
      </>
    );
  }

  mobileThumbnail() {
    let post = this.props.post_view.post;
    return post.thumbnail_url || isImage(post.url) ? (
      <div class="row">
        <div className={`${this.state.imageExpanded ? "col-12" : "col-8"}`}>
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
      !this.showBody && (
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
                this.state.imageExpanded ? "col-12" : "col-12 col-sm-9"
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
      UserService.Instance.myUserInfo &&
      this.props.post_view.creator.id ==
        UserService.Instance.myUserInfo.local_user_view.person.id
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
        this.props.admins.map(a => a.person.id),
        this.props.post_view.creator.id
      )
    );
  }

  get canMod(): boolean {
    if (this.props.admins && this.props.moderators) {
      let adminsThenMods = this.props.admins
        .map(a => a.person.id)
        .concat(this.props.moderators.map(m => m.moderator.id));

      return canMod(
        UserService.Instance.myUserInfo,
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
        .map(a => a.person.id)
        .concat(this.props.moderators.map(m => m.moderator.id));

      return canMod(
        UserService.Instance.myUserInfo,
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
        UserService.Instance.myUserInfo,
        this.props.admins.map(a => a.person.id),
        this.props.post_view.creator.id
      )
    );
  }

  get amCommunityCreator(): boolean {
    return (
      this.props.moderators &&
      UserService.Instance.myUserInfo &&
      this.props.post_view.creator.id !=
        UserService.Instance.myUserInfo.local_user_view.person.id &&
      UserService.Instance.myUserInfo.local_user_view.person.id ==
        this.props.moderators[0].moderator.id
    );
  }

  get amSiteCreator(): boolean {
    return (
      this.props.admins &&
      UserService.Instance.myUserInfo &&
      this.props.post_view.creator.id !=
        UserService.Instance.myUserInfo.local_user_view.person.id &&
      UserService.Instance.myUserInfo.local_user_view.person.id ==
        this.props.admins[0].person.id
    );
  }

  handlePostLike(i: PostListing, event: any) {
    event.preventDefault();
    if (!UserService.Instance.myUserInfo) {
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

  handlePostDisLike(i: PostListing, event: any) {
    event.preventDefault();
    if (!UserService.Instance.myUserInfo) {
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

  handleShowReportDialog(i: PostListing) {
    i.state.showReportDialog = !i.state.showReportDialog;
    i.setState(this.state);
  }

  handleReportReasonChange(i: PostListing, event: any) {
    i.state.reportReason = event.target.value;
    i.setState(i.state);
  }

  handleReportSubmit(i: PostListing, event: any) {
    event.preventDefault();
    let form: CreatePostReport = {
      post_id: i.props.post_view.post.id,
      reason: i.state.reportReason,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.createPostReport(form));

    i.state.showReportDialog = false;
    i.setState(i.state);
  }

  handleBlockUserClick(i: PostListing) {
    let blockUserForm: BlockPerson = {
      person_id: i.props.post_view.creator.id,
      block: true,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  handleDeleteClick(i: PostListing) {
    let deleteForm: DeletePost = {
      post_id: i.props.post_view.post.id,
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
    let params = `?title=${encodeURIComponent(post.name)}`;

    if (post.url) {
      params += `&url=${encodeURIComponent(post.url)}`;
    }
    if (post.body) {
      params += `&body=${encodeURIComponent(this.crossPostBody())}`;
    }
    return params;
  }

  crossPostBody(): string {
    let post = this.props.post_view.post;
    let body = `${i18n.t("cross_posted_from")} ${
      post.ap_id
    }\n\n${post.body.replace(/^/gm, "> ")}`;
    return body;
  }

  get showBody(): boolean {
    return this.props.showBody || this.state.showBody;
  }

  handleModRemoveShow(i: PostListing) {
    i.state.showRemoveDialog = !i.state.showRemoveDialog;
    i.state.showBanDialog = false;
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

  handleModRemoveSubmit(i: PostListing, event: any) {
    event.preventDefault();
    let form: RemovePost = {
      post_id: i.props.post_view.post.id,
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
      post_id: i.props.post_view.post.id,
      locked: !i.props.post_view.post.locked,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.lockPost(form));
  }

  handleModSticky(i: PostListing) {
    let form: StickyPost = {
      post_id: i.props.post_view.post.id,
      stickied: !i.props.post_view.post.stickied,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.stickyPost(form));
  }

  handleModBanFromCommunityShow(i: PostListing) {
    i.state.showBanDialog = true;
    i.state.banType = BanType.Community;
    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  handleModBanShow(i: PostListing) {
    i.state.showBanDialog = true;
    i.state.banType = BanType.Site;
    i.state.showRemoveDialog = false;
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

  handleModBanBothSubmit(i: PostListing, event?: any) {
    if (event) event.preventDefault();

    if (i.state.banType == BanType.Community) {
      // If its an unban, restore all their data
      let ban = !i.props.post_view.creator_banned_from_community;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form: BanFromCommunity = {
        person_id: i.props.post_view.creator.id,
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
      let form: BanPerson = {
        person_id: i.props.post_view.creator.id,
        ban,
        remove_data: i.state.removeData,
        reason: i.state.banReason,
        expires: getUnixTime(i.state.banExpires),
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.banPerson(form));
    }

    i.state.showBanDialog = false;
    i.setState(i.state);
  }

  handleAddModToCommunity(i: PostListing) {
    let form: AddModToCommunity = {
      person_id: i.props.post_view.creator.id,
      community_id: i.props.post_view.community.id,
      added: !i.isMod,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.setState(i.state);
  }

  handleAddAdmin(i: PostListing) {
    let form: AddAdmin = {
      person_id: i.props.post_view.creator.id,
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
      person_id: i.props.post_view.creator.id,
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
      person_id: i.props.post_view.creator.id,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.transferSite(form));
    i.state.showConfirmTransferSite = false;
    i.setState(i.state);
  }

  handleImageExpandClick(i: PostListing, event: any) {
    event.preventDefault();
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

  handleShowBody(i: PostListing) {
    i.state.showBody = !i.state.showBody;
    i.setState(i.state);
    setupTippy();
  }

  get pointsTippy(): string {
    let points = i18n.t("number_of_points", {
      count: this.state.score,
      formattedCount: this.state.score,
    });

    let upvotes = i18n.t("number_of_upvotes", {
      count: this.state.upvotes,
      formattedCount: this.state.upvotes,
    });

    let downvotes = i18n.t("number_of_downvotes", {
      count: this.state.downvotes,
      formattedCount: this.state.downvotes,
    });

    return `${points} • ${upvotes} • ${downvotes}`;
  }
}
