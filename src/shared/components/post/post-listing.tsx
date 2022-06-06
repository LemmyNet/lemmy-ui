import classNames from "classnames";
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
} from "lemmy-js-client";
import { externalHost } from "../../env";
import { i18n } from "../../i18next";
import { BanType } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  canMod,
  futureDaysToUnixTime,
  hostname,
  isBanned,
  isImage,
  isMod,
  isVideo,
  md,
  mdToHtml,
  numToSI,
  relTags,
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
  banReason: string;
  banExpireDays: number;
  banType: BanType;
  removeData: boolean;
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
  viewOnly?: boolean;
}

export class PostListing extends Component<PostListingProps, PostListingState> {
  private emptyState: PostListingState = {
    showEdit: false,
    showRemoveDialog: false,
    removeReason: null,
    showBanDialog: false,
    banReason: null,
    banExpireDays: null,
    banType: BanType.Community,
    removeData: false,
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
    let post = this.props.post_view.post;
    return (
      <div class="post-listing">
        {!this.state.showEdit ? (
          <>
            {this.listing()}
            {this.state.imageExpanded && this.img}
            {post.url && this.showBody && post.embed_title && (
              <MetadataCard post={post} />
            )}
            {this.showBody && post.body && this.body()}
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
      <div class="col-12 card my-2 p-2">
        {this.state.viewSource ? (
          <pre>{post.body}</pre>
        ) : (
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(post.body)}
          />
        )}
      </div>
    );
  }

  get img() {
    return (
      <>
        <div class="offset-sm-3 my-2 d-none d-sm-block">
          <a href={this.imageSrc} class="d-inline-block">
            <PictrsImage src={this.imageSrc} />
          </a>
        </div>
        <div className="my-2 d-block d-sm-none">
          <a
            class="d-inline-block"
            onClick={linkEvent(this, this.handleImageExpandClick)}
          >
            <PictrsImage src={this.imageSrc} />
          </a>
        </div>
      </>
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

  get imageSrc(): string {
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
          href={this.imageSrc}
          class="text-body d-inline-block position-relative mb-2"
          data-tippy-content={i18n.t("expand_here")}
          onClick={linkEvent(this, this.handleImageExpandClick)}
          aria-label={i18n.t("expand_here")}
        >
          {this.imgThumb(this.imageSrc)}
          <Icon icon="image" classes="mini-overlay" />
        </a>
      );
    } else if (post.thumbnail_url) {
      return (
        <a
          class="text-body d-inline-block position-relative mb-2"
          href={post.url}
          rel={relTags}
          title={post.url}
        >
          {this.imgThumb(this.imageSrc)}
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
            rel={relTags}
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
          <span>
            <span class="mx-1">Posted by</span>
          </span>
          <PersonListing person={post_view.creator} />
          {this.creatorIsMod && (
            <span className="mx-1 badge badge-light">{i18n.t("mod")}</span>
          )}
          {this.creatorIsAdmin && (
            <span className="mx-1 badge badge-light">{i18n.t("admin")}</span>
          )}
          {post_view.creator.bot_account && (
            <span className="mx-1 badge badge-light">
              {i18n.t("bot_account").toLowerCase()}
            </span>
          )}
          {(post_view.creator_banned_from_community ||
            isBanned(post_view.creator)) && (
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
                rel={relTags}
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
                data-tippy-content={md.render(post_view.post.body)}
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
        <h3>
          {this.showBody && post.url ? (
            <a
              className={!post.stickied ? "text-body" : "text-primary"}
              href={post.url}
              title={post.url}
              rel={relTags}
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
          {(isImage(post.url) || post.thumbnail_url) && (
            <button
              class="btn btn-link text-monospace text-muted small d-inline-block ml-2"
              data-tippy-content={i18n.t("expand_here")}
              onClick={linkEvent(this, this.handleImageExpandClick)}
            >
              <Icon
                icon={
                  !this.state.imageExpanded ? "plus-square" : "minus-square"
                }
                classes="icon-inline"
              />
            </button>
          )}
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
        </h3>
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
                  {pv.community.local ? (
                    <CommunityLink community={pv.community} />
                  ) : (
                    `${pv.community.name}@${hostname(pv.community.actor_id)}`
                  )}
                </Link>
              </li>
            ))}
          </>
        </ul>
      )
    );
  }

  commentsLine(mobile = false) {
    let post = this.props.post_view.post;
    return (
      <div class="d-flex justify-content-start flex-wrap text-muted font-weight-bold mb-1">
        {this.commentsButton} {this.mobileVotes}
        {!post.local && (
          <a
            className="btn btn-link btn-animate text-muted py-0"
            title={i18n.t("link")}
            href={post.ap_id}
          >
            <Icon icon="fedilink" inline />
          </a>
        )}
        {mobile && !this.props.viewOnly && this.mobileVotes}
        {UserService.Instance.myUserInfo &&
          !this.props.viewOnly &&
          this.postActions(mobile)}
      </div>
    );
  }

  postActions(mobile = false) {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    // Possible enhancement: Make each button a component.
    let post_view = this.props.post_view;
    return (
      <>
        {this.saveButton}
        {this.crossPostButton}
        {mobile && this.showMoreButton}
        {(!mobile || this.state.showAdvanced) && (
          <>
            {!this.myPost && (
              <>
                {this.reportButton}
                {this.blockButton}
              </>
            )}
            {this.myPost && (this.showBody || this.state.showAdvanced) && (
              <>
                {this.editButton}
                {this.deleteButton}
              </>
            )}
          </>
        )}
        {this.state.showAdvanced && (
          <>
            {this.showBody && post_view.post.body && this.viewSourceButton}
            {this.canModOnSelf && (
              <>
                {this.lockButton}
                {this.stickyButton}
              </>
            )}
            {(this.canMod || this.canAdmin || true) && (
              <>{this.modRemoveButton}</>
            )}
          </>
        )}
        {!mobile && this.showMoreButton}
      </>
    );
  }

  get commentsButton() {
    let post_view = this.props.post_view;
    return (
      <button class="btn btn-link text-muted py-0 pl-0">
        <Link
          className="text-muted"
          title={i18n.t("number_of_comments", {
            count: post_view.counts.comments,
            formattedCount: post_view.counts.comments,
          })}
          to={`/post/${post_view.post.id}?scrollToComments=true`}
        >
          <Icon icon="message-square" classes="mr-1" inline />
          {i18n.t("number_of_comments", {
            count: post_view.counts.comments,
            formattedCount: numToSI(post_view.counts.comments),
          })}
        </Link>
      </button>
    );
  }

  get mobileVotes() {
    // TODO: make nicer
    let tippy = showScores() ? { "data-tippy-content": this.pointsTippy } : {};
    return (
      <>
        <div>
          <button
            className={`btn-animate btn py-0 px-1 ${
              this.state.my_vote == 1 ? "text-info" : "text-muted"
            }`}
            {...tippy}
            onClick={linkEvent(this, this.handlePostLike)}
            aria-label={i18n.t("upvote")}
          >
            <Icon icon="arrow-up1" classes="icon-inline small" />
            {showScores() && (
              <span class="ml-2">{numToSI(this.state.upvotes)}</span>
            )}
          </button>
          {this.props.enableDownvotes && (
            <button
              className={`ml-2 btn-animate btn py-0 px-1 ${
                this.state.my_vote == -1 ? "text-danger" : "text-muted"
              }`}
              onClick={linkEvent(this, this.handlePostDisLike)}
              {...tippy}
              aria-label={i18n.t("downvote")}
            >
              <Icon icon="arrow-down1" classes="icon-inline small" />
              {showScores() && (
                <span
                  class={classNames("ml-2", {
                    invisible: this.state.downvotes === 0,
                  })}
                >
                  {numToSI(this.state.downvotes)}
                </span>
              )}
            </button>
          )}
        </div>
      </>
    );
  }

  get saveButton() {
    let saved = this.props.post_view.saved;
    let label = saved ? i18n.t("unsave") : i18n.t("save");
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleSavePostClick)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="star"
          classes={classNames({ "text-warning": saved })}
          inline
        />
      </button>
    );
  }

  get crossPostButton() {
    return (
      <Link
        className="btn btn-link btn-animate text-muted py-0"
        to={`/create_post${this.crossPostParams}`}
        title={i18n.t("cross_post")}
      >
        <Icon icon="copy" inline />
      </Link>
    );
  }

  get reportButton() {
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleShowReportDialog)}
        data-tippy-content={i18n.t("show_report_dialog")}
        aria-label={i18n.t("show_report_dialog")}
      >
        <Icon icon="flag" inline />
      </button>
    );
  }

  get blockButton() {
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleBlockUserClick)}
        data-tippy-content={i18n.t("block_user")}
        aria-label={i18n.t("block_user")}
      >
        <Icon icon="slash" inline />
      </button>
    );
  }

  get editButton() {
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleEditClick)}
        data-tippy-content={i18n.t("edit")}
        aria-label={i18n.t("edit")}
      >
        <Icon icon="edit" inline />
      </button>
    );
  }

  get deleteButton() {
    let deleted = this.props.post_view.post.deleted;
    let label = !deleted ? i18n.t("delete") : i18n.t("restore");
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleDeleteClick)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="trash"
          classes={classNames({ "text-danger": deleted })}
          inline
        />
      </button>
    );
  }

  get showMoreButton() {
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleShowAdvanced)}
        data-tippy-content={i18n.t("more")}
        aria-label={i18n.t("more")}
      >
        <Icon icon="more-vertical" inline />
      </button>
    );
  }

  get viewSourceButton() {
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleViewSource)}
        data-tippy-content={i18n.t("view_source")}
        aria-label={i18n.t("view_source")}
      >
        <Icon
          icon="file-text"
          classes={classNames({ "text-success": this.state.viewSource })}
          inline
        />
      </button>
    );
  }

  get lockButton() {
    let locked = this.props.post_view.post.locked;
    let label = locked ? i18n.t("unlock") : i18n.t("lock");
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleModLock)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="lock"
          classes={classNames({ "text-danger": locked })}
          inline
        />
      </button>
    );
  }

  get stickyButton() {
    let stickied = this.props.post_view.post.stickied;
    let label = stickied ? i18n.t("unsticky") : i18n.t("sticky");
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleModSticky)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="pin"
          classes={classNames({ "text-success": stickied })}
          inline
        />
      </button>
    );
  }

  get modRemoveButton() {
    let removed = this.props.post_view.post.removed;
    return (
      <button
        class="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(
          this,
          !removed ? this.handleModRemoveShow : this.handleModRemoveSubmit
        )}
      >
        {/* TODO: Find an icon for this. */}
        {!removed ? i18n.t("remove") : i18n.t("restore")}
      </button>
    );
  }

  /**
   * Mod/Admin actions to be taken against the author.
   */
  userActionsLine() {
    // TODO: make nicer
    let post_view = this.props.post_view;
    return (
      this.state.showAdvanced && (
        <>
          {this.canMod && (
            <>
              {!this.creatorIsMod &&
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
                    this.creatorIsMod
                      ? i18n.t("remove_as_mod")
                      : i18n.t("appoint_as_mod")
                  }
                >
                  {this.creatorIsMod
                    ? i18n.t("remove_as_mod")
                    : i18n.t("appoint_as_mod")}
                </button>
              )}
            </>
          )}
          {/* Community creators and admins can transfer community to another mod */}
          {(this.amCommunityCreator || this.canAdmin) &&
            this.creatorIsMod &&
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
              {!this.creatorIsAdmin &&
                (!isBanned(post_view.creator) ? (
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
              {!isBanned(post_view.creator) && post_view.creator.local && (
                <button
                  class="btn btn-link btn-animate text-muted py-0"
                  onClick={linkEvent(this, this.handleAddAdmin)}
                  aria-label={
                    this.creatorIsAdmin
                      ? i18n.t("remove_as_admin")
                      : i18n.t("appoint_as_admin")
                  }
                >
                  {this.creatorIsAdmin
                    ? i18n.t("remove_as_admin")
                    : i18n.t("appoint_as_admin")}
                </button>
              )}
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
            <div class="form-group row col-12">
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
              <label class="col-form-label" htmlFor={`mod-ban-expires`}>
                {i18n.t("expires")}
              </label>
              <input
                type="number"
                id={`mod-ban-expires`}
                class="form-control mr-2"
                placeholder={i18n.t("number_of_days")}
                value={this.state.banExpireDays}
                onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
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
        <div className="md-div mb-1 preview-lines">{post.body}</div>
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
              {this.userActionsLine()}
              {this.duplicatesLine()}
              {this.removeAndBanDialogs()}
            </div>
          </div>
        </div>

        {/* The larger view*/}
        <div class="d-none d-sm-block">
          <div class="row">
            {!this.props.viewOnly}
            {/*            <div class="col-sm-2 pr-0">
              <div class="">{this.thumbnail()}</div>
            </div>*/}
            <div class="col-12 col-sm-9">
              <div class="row">
                <div className="col-12">
                  {this.postTitleLine()}
                  {this.createdLine()}
                  {this.commentsLine()}
                  {this.duplicatesLine()}
                  {this.userActionsLine()}
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

  get creatorIsMod(): boolean {
    return (
      this.props.moderators &&
      isMod(
        this.props.moderators.map(m => m.moderator.id),
        this.props.post_view.creator.id
      )
    );
  }

  get creatorIsAdmin(): boolean {
    return (
      this.props.admins &&
      isMod(
        this.props.admins.map(a => a.person.id),
        this.props.post_view.creator.id
      )
    );
  }

  /**
   * If the current user is allowed to mod this post.
   * The creator of this post is not allowed even if they are a mod.
   */
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

  /**
   * If the current user is allowed to mod this post.
   * The creator of this post is allowed if they are a mod.
   */
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

  handleModBanExpireDaysChange(i: PostListing, event: any) {
    i.state.banExpireDays = event.target.value;
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
        expires: futureDaysToUnixTime(i.state.banExpireDays),
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
        expires: futureDaysToUnixTime(i.state.banExpireDays),
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
      added: !i.creatorIsMod,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.setState(i.state);
  }

  handleAddAdmin(i: PostListing) {
    let form: AddAdmin = {
      person_id: i.props.post_view.creator.id,
      added: !i.creatorIsAdmin,
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

  handleImageExpandClick(i: PostListing, event: any) {
    event.preventDefault();
    i.state.imageExpanded = !i.state.imageExpanded;
    i.setState(i.state);
    setupTippy();
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
