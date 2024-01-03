import { myAuth } from "@utils/app";
import { canShare, share } from "@utils/browser";
import { getExternalHost, getHttpBase } from "@utils/env";
import { futureDaysToUnixTime, hostname } from "@utils/helpers";
import { isImage, isVideo } from "@utils/media";
import { canAdmin, canMod } from "@utils/roles";
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
  EditPost,
  FeaturePost,
  Language,
  LockPost,
  MarkPostAsRead,
  PersonView,
  PostResponse,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import { relTags } from "../../config";
import { VoteContentType } from "../../interfaces";
import { mdToHtml, mdToHtmlInline } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { setupTippy } from "../../tippy";
import { Icon } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PictrsImage } from "../common/pictrs-image";
import { UserBadges } from "../common/user-badges";
import { VoteButtons, VoteButtonsCompact } from "../common/vote-buttons";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { MetadataCard } from "./metadata-card";
import { PostForm } from "./post-form";
import { BanUpdateForm } from "../common/mod-action-form-modal";
import PostActionDropdown from "../common/content-actions/post-action-dropdown";
import { CrossPostParams } from "@utils/types";
import { RequestState } from "../../services/HttpService";

type PostListingState = {
  showEdit: boolean;
  imageExpanded: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showBody: boolean;
};

interface PostListingProps {
  post_view: PostView;
  crossPosts?: PostView[];
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  showCommunity?: boolean;
  /**
   * Controls whether to show both the body *and* the metadata preview card
   */
  showBody?: boolean;
  hideImage?: boolean;
  enableDownvotes?: boolean;
  enableNsfw?: boolean;
  viewOnly?: boolean;
  onPostEdit(form: EditPost): Promise<RequestState<PostResponse>>;
  onPostVote(form: CreatePostLike): Promise<RequestState<PostResponse>>;
  onPostReport(form: CreatePostReport): Promise<void>;
  onBlockPerson(form: BlockPerson): Promise<void>;
  onLockPost(form: LockPost): Promise<void>;
  onDeletePost(form: DeletePost): Promise<void>;
  onRemovePost(form: RemovePost): Promise<void>;
  onSavePost(form: SavePost): Promise<void>;
  onFeaturePost(form: FeaturePost): Promise<void>;
  onPurgePerson(form: PurgePerson): Promise<void>;
  onPurgePost(form: PurgePost): Promise<void>;
  onBanPersonFromCommunity(form: BanFromCommunity): Promise<void>;
  onBanPerson(form: BanPerson): Promise<void>;
  onAddModToCommunity(form: AddModToCommunity): Promise<void>;
  onAddAdmin(form: AddAdmin): Promise<void>;
  onTransferCommunity(form: TransferCommunity): Promise<void>;
  onMarkPostAsRead(form: MarkPostAsRead): void;
}

export class PostListing extends Component<PostListingProps, PostListingState> {
  state: PostListingState = {
    showEdit: false,
    imageExpanded: false,
    viewSource: false,
    showAdvanced: false,
    showBody: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleEditPost = this.handleEditPost.bind(this);
    this.handleEditCancel = this.handleEditCancel.bind(this);
    this.handleEditClick = this.handleEditClick.bind(this);
    this.handleReport = this.handleReport.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleModLock = this.handleModLock.bind(this);
    this.handleModFeaturePostCommunity =
      this.handleModFeaturePostCommunity.bind(this);
    this.handleModFeaturePostLocal = this.handleModFeaturePostLocal.bind(this);
    this.handleAppointCommunityMod = this.handleAppointCommunityMod.bind(this);
    this.handleAppointAdmin = this.handleAppointAdmin.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleModBanFromCommunity = this.handleModBanFromCommunity.bind(this);
    this.handleModBanFromSite = this.handleModBanFromSite.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
  }

  componentDidMount(): void {
    if (UserService.Instance.myUserInfo) {
      const { auto_expand, blur_nsfw } =
        UserService.Instance.myUserInfo.local_user_view.local_user;
      this.setState({
        imageExpanded: auto_expand && !(blur_nsfw && this.postView.post.nsfw),
      });
    }
  }

  get postView(): PostView {
    return this.props.post_view;
  }

  render() {
    const post = this.postView.post;

    return (
      <div className="post-listing mt-2">
        {!this.state.showEdit ? (
          <>
            {this.listing()}
            {this.state.imageExpanded && !this.props.hideImage && this.img}
            {this.showBody && post.url && post.embed_title && (
              <MetadataCard post={post} />
            )}
            {this.showBody && this.body()}
          </>
        ) : (
          <PostForm
            post_view={this.postView}
            crossPosts={this.props.crossPosts}
            onEdit={this.handleEditPost}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
            enableDownvotes={this.props.enableDownvotes}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
          />
        )}
      </div>
    );
  }

  body() {
    const body = this.postView.post.body;
    return body ? (
      <article id="postContent" className="col-12 card my-2 p-2">
        {this.state.viewSource ? (
          <pre>{body}</pre>
        ) : (
          <div className="md-div" dangerouslySetInnerHTML={mdToHtml(body)} />
        )}
      </article>
    ) : (
      <></>
    );
  }

  get img() {
    if (this.imageSrc) {
      return (
        <>
          <div className="offset-sm-3 my-2 d-none d-sm-block">
            <a href={this.imageSrc} className="d-inline-block">
              <PictrsImage src={this.imageSrc} />
            </a>
          </div>
          <div className="my-2 d-block d-sm-none">
            <button
              type="button"
              className="p-0 border-0 bg-transparent d-inline-block"
              onClick={linkEvent(this, this.handleImageExpandClick)}
            >
              <PictrsImage src={this.imageSrc} />
            </button>
          </div>
        </>
      );
    }

    const { post } = this.postView;
    const { url } = post;

    // if direct video link
    if (url && isVideo(url)) {
      return (
        <div className="embed-responsive ratio ratio-16x9 mt-3">
          <video
            onLoadStart={linkEvent(this, this.handleVideoLoadStart)}
            onPlay={linkEvent(this, this.handleVideoLoadStart)}
            onVolumeChange={linkEvent(this, this.handleVideoVolumeChange)}
            controls
            className="embed-responsive-item col-12"
          >
            <source src={url} type="video/mp4" />
          </video>
        </div>
      );
    }

    // if embedded video link
    if (url && post.embed_video_url) {
      return (
        <div className="ratio ratio-16x9">
          <iframe
            allowFullScreen
            className="post-metadata-iframe"
            src={post.embed_video_url}
            title={post.embed_title}
          ></iframe>
        </div>
      );
    }

    return <></>;
  }

  imgThumb(src: string) {
    const pv = this.postView;
    return (
      <PictrsImage
        src={src}
        thumbnail
        alt=""
        nsfw={pv.post.nsfw || pv.community.nsfw}
      />
    );
  }

  get imageSrc(): string | undefined {
    const post = this.postView.post;
    const url = post.url;
    const thumbnail = post.thumbnail_url;

    if (thumbnail) {
      return thumbnail;
    } else if (url && isImage(url)) {
      return url;
    } else {
      return undefined;
    }
  }

  thumbnail() {
    const post = this.postView.post;
    const url = post.url;
    const thumbnail = post.thumbnail_url;

    if (!this.props.hideImage && url && isImage(url) && this.imageSrc) {
      return (
        <button
          type="button"
          className="thumbnail rounded overflow-hidden d-inline-block position-relative p-0 border-0 bg-transparent"
          data-tippy-content={I18NextService.i18n.t("expand_here")}
          onClick={linkEvent(this, this.handleImageExpandClick)}
          aria-label={I18NextService.i18n.t("expand_here")}
        >
          {this.imgThumb(this.imageSrc)}
          <Icon
            icon="image"
            classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
          />
        </button>
      );
    } else if (!this.props.hideImage && url && thumbnail && this.imageSrc) {
      return (
        <a
          className="thumbnail rounded overflow-hidden d-inline-block position-relative p-0 border-0"
          href={url}
          rel={relTags}
          title={url}
          target={this.linkTarget}
        >
          {this.imgThumb(this.imageSrc)}
          <Icon
            icon="external-link"
            classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
          />
        </a>
      );
    } else if (url) {
      if ((!this.props.hideImage && isVideo(url)) || post.embed_video_url) {
        return (
          <a
            className="text-body"
            href={url}
            title={url}
            rel={relTags}
            data-tippy-content={I18NextService.i18n.t("expand_here")}
            onClick={linkEvent(this, this.handleImageExpandClick)}
            aria-label={I18NextService.i18n.t("expand_here")}
            target={this.linkTarget}
          >
            <div className="thumbnail rounded bg-light d-flex justify-content-center">
              <Icon icon="play" classes="d-flex align-items-center" />
            </div>
          </a>
        );
      } else {
        return (
          <a
            className="text-body"
            href={url}
            title={url}
            rel={relTags}
            target={this.linkTarget}
          >
            <div className="thumbnail rounded bg-light d-flex justify-content-center">
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
          title={I18NextService.i18n.t("comments")}
        >
          <div className="thumbnail rounded bg-light d-flex justify-content-center">
            <Icon icon="message-square" classes="d-flex align-items-center" />
          </div>
        </Link>
      );
    }
  }

  createdLine() {
    const pv = this.postView;

    return (
      <div className="small mb-1 mb-md-0">
        <PersonListing person={pv.creator} />
        <UserBadges
          classNames="ms-1"
          isMod={pv.creator_is_moderator}
          isAdmin={pv.creator_is_admin}
          isBot={pv.creator.bot_account}
        />
        {this.props.showCommunity && (
          <>
            {" "}
            {I18NextService.i18n.t("to")}{" "}
            <CommunityLink community={pv.community} />
          </>
        )}
        {pv.post.language_id !== 0 && (
          <span className="mx-1 badge text-bg-light">
            {
              this.props.allLanguages.find(
                lang => lang.id === pv.post.language_id,
              )?.name
            }
          </span>
        )}{" "}
        • <MomentTime published={pv.post.published} updated={pv.post.updated} />
      </div>
    );
  }

  get postLink() {
    const post = this.postView.post;
    return (
      <Link
        className={`d-inline ${
          !post.featured_community && !post.featured_local
            ? "link-dark"
            : "link-primary"
        }`}
        to={`/post/${post.id}`}
        title={I18NextService.i18n.t("comments")}
      >
        <span
          className="d-inline"
          dangerouslySetInnerHTML={mdToHtmlInline(post.name)}
        />
      </Link>
    );
  }

  postTitleLine() {
    const post = this.postView.post;
    const url = post.url;

    return (
      <>
        <div className="post-title">
          <h1 className="h5 d-inline text-break">
            {url && this.props.showBody ? (
              <a
                className={
                  !post.featured_community && !post.featured_local
                    ? "link-dark"
                    : "link-primary"
                }
                href={url}
                title={url}
                rel={relTags}
                dangerouslySetInnerHTML={mdToHtmlInline(post.name)}
              ></a>
            ) : (
              this.postLink
            )}
          </h1>

          {/**
           * If there is (a) a URL and an embed title, or (b) a post body, and
           * we were not told to show the body by the parent component, show the
           * MetadataCard/body toggle.
           */}
          {!this.props.showBody &&
            ((post.url && post.embed_title) || post.body) &&
            this.showPreviewButton()}

          {post.removed && (
            <small className="ms-2 badge text-bg-secondary">
              {I18NextService.i18n.t("removed")}
            </small>
          )}

          {post.deleted && (
            <small
              className="unselectable pointer ms-2 text-muted fst-italic"
              data-tippy-content={I18NextService.i18n.t("deleted")}
            >
              <Icon icon="trash" classes="icon-inline text-danger" />
            </small>
          )}

          {post.locked && (
            <small
              className="unselectable pointer ms-2 text-muted fst-italic"
              data-tippy-content={I18NextService.i18n.t("locked")}
            >
              <Icon icon="lock" classes="icon-inline text-danger" />
            </small>
          )}

          {post.featured_community && (
            <small
              className="unselectable pointer ms-2 text-muted fst-italic"
              data-tippy-content={I18NextService.i18n.t(
                "featured_in_community",
              )}
              aria-label={I18NextService.i18n.t("featured_in_community")}
            >
              <Icon icon="pin" classes="icon-inline text-primary" />
            </small>
          )}

          {post.featured_local && (
            <small
              className="unselectable pointer ms-2 text-muted fst-italic"
              data-tippy-content={I18NextService.i18n.t("featured_in_local")}
              aria-label={I18NextService.i18n.t("featured_in_local")}
            >
              <Icon icon="pin" classes="icon-inline text-secondary" />
            </small>
          )}

          {post.nsfw && (
            <small className="ms-2 badge text-bg-danger">
              {I18NextService.i18n.t("nsfw")}
            </small>
          )}
        </div>
        {url && this.urlLine()}
      </>
    );
  }

  urlLine() {
    const post = this.postView.post;
    const url = post.url;

    return (
      <p className="small m-0">
        {url && !(hostname(url) === getExternalHost()) && (
          <a
            className="fst-italic link-dark link-opacity-75 link-opacity-100-hover"
            href={url}
            title={url}
            rel={relTags}
          >
            {hostname(url)}
          </a>
        )}
      </p>
    );
  }

  duplicatesLine() {
    const dupes = this.props.crossPosts;
    return dupes && dupes.length > 0 ? (
      <ul className="list-inline mb-1 small text-muted">
        <>
          <li className="list-inline-item me-2">
            {I18NextService.i18n.t("cross_posted_to")}
          </li>
          {dupes.map(pv => (
            <li key={pv.post.id} className="list-inline-item me-2">
              <Link to={`/post/${pv.post.id}`}>
                {pv.community.local
                  ? pv.community.name
                  : `${pv.community.name}@${hostname(pv.community.actor_id)}`}
              </Link>
            </li>
          ))}
        </>
      </ul>
    ) : (
      <></>
    );
  }

  commentsLine(mobile = false) {
    const {
      admins,
      moderators,
      viewOnly,
      showBody,
      onPostVote,
      enableDownvotes,
    } = this.props;
    const {
      post: { local, ap_id, id, body },
      counts,
      my_vote,
    } = this.postView;

    return (
      <div className="d-flex align-items-center justify-content-start flex-wrap text-muted">
        {this.commentsButton}
        {canShare() && (
          <button
            className="btn btn-sm btn-link btn-animate text-muted py-0"
            onClick={linkEvent(this, this.handleShare)}
            type="button"
          >
            <Icon icon="share" inline />
          </button>
        )}
        {local && (
          <a
            className="btn btn-sm btn-link btn-animate text-muted py-0"
            title={I18NextService.i18n.t("link")}
            href={ap_id}
          >
            <Icon icon="fedilink" inline />
          </a>
        )}
        {mobile && !viewOnly && (
          <VoteButtonsCompact
            voteContentType={VoteContentType.Post}
            id={id}
            onVote={onPostVote}
            enableDownvotes={enableDownvotes}
            counts={counts}
            my_vote={my_vote}
          />
        )}

        {showBody && body && this.viewSourceButton}

        {UserService.Instance.myUserInfo && !viewOnly && (
          <PostActionDropdown
            postView={this.postView}
            admins={admins}
            moderators={moderators}
            crossPostParams={this.crossPostParams}
            onSave={this.handleSavePost}
            onReport={this.handleReport}
            onBlock={this.handleBlockPerson}
            onEdit={this.handleEditClick}
            onDelete={this.handleDeletePost}
            onLock={this.handleModLock}
            onFeatureCommunity={this.handleModFeaturePostCommunity}
            onFeatureLocal={this.handleModFeaturePostLocal}
            onRemove={this.handleRemove}
            onBanFromCommunity={this.handleModBanFromCommunity}
            onAppointCommunityMod={this.handleAppointCommunityMod}
            onTransferCommunity={this.handleTransferCommunity}
            onBanFromSite={this.handleModBanFromSite}
            onPurgeUser={this.handlePurgePerson}
            onPurgeContent={this.handlePurgePost}
            onAppointAdmin={this.handleAppointAdmin}
          />
        )}
      </div>
    );
  }

  public get linkTarget(): string {
    return UserService.Instance.myUserInfo?.local_user_view.local_user
      .open_links_in_new_tab
      ? "_blank"
      : // _self is the default target on links when the field is not specified
        "_self";
  }

  get commentsButton() {
    const pv = this.postView;
    const title = I18NextService.i18n.t("number_of_comments", {
      count: Number(pv.counts.comments),
      formattedCount: Number(pv.counts.comments),
    });

    return (
      <Link
        className="btn btn-link btn-sm text-muted ps-0"
        title={title}
        to={`/post/${pv.post.id}?scrollToComments=true`}
        data-tippy-content={title}
      >
        <Icon icon="message-square" classes="me-1" inline />
        {pv.counts.comments}
        {this.unreadCount && (
          <>
            {" "}
            <span className="fst-italic">
              ({this.unreadCount} {I18NextService.i18n.t("new")})
            </span>
          </>
        )}
      </Link>
    );
  }

  get unreadCount(): number | undefined {
    const pv = this.postView;
    return pv.unread_comments === pv.counts.comments || pv.unread_comments === 0
      ? undefined
      : pv.unread_comments;
  }

  get viewSourceButton() {
    return (
      <button
        className="btn btn-sm btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleViewSource)}
        data-tippy-content={I18NextService.i18n.t("view_source")}
        aria-label={I18NextService.i18n.t("view_source")}
      >
        <Icon
          icon="file-text"
          classes={classNames({ "text-success": this.state.viewSource })}
          inline
        />
      </button>
    );
  }

  mobileThumbnail() {
    const post = this.postView.post;
    return post.thumbnail_url || (post.url && isImage(post.url)) ? (
      <div className="row">
        <div className={`${this.state.imageExpanded ? "col-12" : "col-9"}`}>
          {this.postTitleLine()}
        </div>
        <div className="col-3 mobile-thumbnail-container">
          {/* Post thumbnail */}
          {!this.state.imageExpanded && this.thumbnail()}
        </div>
      </div>
    ) : (
      this.postTitleLine()
    );
  }

  showPreviewButton() {
    return (
      <button
        type="button"
        className="btn btn-sm btn-link link-dark link-opacity-75 link-opacity-100-hover py-0 align-baseline"
        onClick={linkEvent(this, this.handleShowBody)}
      >
        <Icon
          icon={!this.state.showBody ? "plus-square" : "minus-square"}
          classes="icon-inline"
        />
      </button>
    );
  }

  listing() {
    return (
      <>
        {/* The mobile view*/}
        <div className="d-block d-sm-none">
          <article className="row post-container">
            <div className="col-12">
              {this.createdLine()}

              {/* If it has a thumbnail, do a right aligned thumbnail */}
              {this.mobileThumbnail()}

              {this.commentsLine(true)}
              {this.duplicatesLine()}
            </div>
          </article>
        </div>

        {/* The larger view*/}
        <div className="d-none d-sm-block">
          <article className="row post-container">
            {!this.props.viewOnly && (
              <div className="col flex-grow-0">
                <VoteButtons
                  voteContentType={VoteContentType.Post}
                  id={this.postView.post.id}
                  onVote={this.props.onPostVote}
                  enableDownvotes={this.props.enableDownvotes}
                  counts={this.postView.counts}
                  my_vote={this.postView.my_vote}
                />
              </div>
            )}
            <div className="col flex-grow-1">
              <div className="row">
                <div className="col flex-grow-0 px-0">
                  <div className="">{this.thumbnail()}</div>
                </div>
                <div className="col flex-grow-1">
                  {this.postTitleLine()}
                  {this.createdLine()}
                  {this.commentsLine()}
                  {this.duplicatesLine()}
                </div>
              </div>
            </div>
          </article>
        </div>
      </>
    );
  }

  handleEditClick() {
    this.setState({ showEdit: true });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  handleVideoLoadStart(_i: PostListing, e: Event) {
    const video = e.target as HTMLVideoElement;
    const volume = localStorage.getItem("video_volume_level");
    const muted = localStorage.getItem("video_muted");
    if (volume && muted) {
      video.muted = muted !== "false";
      video.volume = Number(volume);
    } else {
      video.muted = true;
      video.volume = 0;
      localStorage.setItem("video_muted", "true");
      localStorage.setItem("volume_level", "0");
    }
  }

  handleVideoVolumeChange(_i: PostListing, e: Event) {
    const video = e.target as HTMLVideoElement;
    localStorage.setItem("video_muted", video.muted.toString());
    localStorage.setItem(
      "video_volume_level",
      video.muted ? "0" : video.volume.toString(),
    );
  }

  // The actual editing is done in the receive for post
  handleEditPost(form: EditPost) {
    this.setState({ showEdit: false });
    return this.props.onPostEdit(form);
  }

  handleShare(i: PostListing) {
    const { name, body, id } = i.postView.post;
    share({
      title: name,
      text: body?.slice(0, 50),
      url: `${getHttpBase()}/post/${id}`,
    });
  }

  handleReport(reason: string) {
    return this.props.onPostReport({
      post_id: this.postView.post.id,
      reason,
    });
  }

  handleBlockPerson() {
    return this.props.onBlockPerson({
      person_id: this.postView.creator.id,
      block: true,
    });
  }

  handleDeletePost() {
    return this.props.onDeletePost({
      post_id: this.postView.post.id,
      deleted: !this.postView.post.deleted,
    });
  }

  handleSavePost() {
    return this.props.onSavePost({
      post_id: this.postView.post.id,
      save: !this.postView.saved,
    });
  }

  get crossPostParams(): CrossPostParams {
    const { name, url } = this.postView.post;
    const crossPostParams: CrossPostParams = { name };

    if (url) {
      crossPostParams.url = url;
    }

    const crossPostBody = this.crossPostBody();
    if (crossPostBody) {
      crossPostParams.body = crossPostBody;
    }

    return crossPostParams;
  }

  crossPostBody(): string | undefined {
    const post = this.postView.post;
    const body = post.body;

    return body
      ? `${I18NextService.i18n.t("cross_posted_from")} ${
          post.ap_id
        }\n\n${body.replace(/^/gm, "> ")}`
      : undefined;
  }

  get showBody(): boolean {
    return this.props.showBody || this.state.showBody;
  }

  handleRemove(reason: string) {
    return this.props.onRemovePost({
      post_id: this.postView.post.id,
      removed: !this.postView.post.removed,
      reason,
    });
  }

  handleModLock() {
    return this.props.onLockPost({
      post_id: this.postView.post.id,
      locked: !this.postView.post.locked,
    });
  }

  handleModFeaturePostLocal() {
    return this.props.onFeaturePost({
      post_id: this.postView.post.id,
      featured: !this.postView.post.featured_local,
      feature_type: "Local",
    });
  }

  handleModFeaturePostCommunity() {
    return this.props.onFeaturePost({
      post_id: this.postView.post.id,
      featured: !this.postView.post.featured_community,
      feature_type: "Community",
    });
  }

  handlePurgePost(reason: string) {
    return this.props.onPurgePost({
      post_id: this.postView.post.id,
      reason,
    });
  }

  handlePurgePerson(reason: string) {
    return this.props.onPurgePerson({
      person_id: this.postView.creator.id,
      reason,
    });
  }

  handleModBanFromCommunity({
    daysUntilExpires,
    reason,
    shouldRemove,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id },
      creator_banned_from_community,
      community: { id: community_id },
    } = this.postView;
    const ban = !creator_banned_from_community;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemove = false;
    }
    const expires = futureDaysToUnixTime(daysUntilExpires);

    return this.props.onBanPersonFromCommunity({
      community_id,
      person_id,
      ban,
      remove_data: shouldRemove,
      reason,
      expires,
    });
  }

  handleModBanFromSite({
    daysUntilExpires,
    reason,
    shouldRemove,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id, banned },
    } = this.postView;
    const ban = !banned;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemove = false;
    }
    const expires = futureDaysToUnixTime(daysUntilExpires);

    return this.props.onBanPerson({
      person_id,
      ban,
      remove_data: shouldRemove,
      reason,
      expires,
    });
  }

  handleAppointCommunityMod() {
    return this.props.onAddModToCommunity({
      community_id: this.postView.community.id,
      person_id: this.postView.creator.id,
      added: !this.postView.creator_is_moderator,
    });
  }

  handleAppointAdmin() {
    return this.props.onAddAdmin({
      person_id: this.postView.creator.id,
      added: !this.postView.creator_is_admin,
    });
  }

  handleTransferCommunity() {
    return this.props.onTransferCommunity({
      community_id: this.postView.community.id,
      person_id: this.postView.creator.id,
    });
  }

  handleImageExpandClick(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ imageExpanded: !i.state.imageExpanded });
    setupTippy();

    if (myAuth() && !i.postView.read) {
      i.props.onMarkPostAsRead({
        post_ids: [i.postView.post.id],
        read: true,
      });
    }
  }

  handleViewSource(i: PostListing) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowBody(i: PostListing) {
    i.setState({ showBody: !i.state.showBody });
    setupTippy();
  }

  get pointsTippy(): string {
    const points = I18NextService.i18n.t("number_of_points", {
      count: Number(this.postView.counts.score),
      formattedCount: Number(this.postView.counts.score),
    });

    const upvotes = I18NextService.i18n.t("number_of_upvotes", {
      count: Number(this.postView.counts.upvotes),
      formattedCount: Number(this.postView.counts.upvotes),
    });

    const downvotes = I18NextService.i18n.t("number_of_downvotes", {
      count: Number(this.postView.counts.downvotes),
      formattedCount: Number(this.postView.counts.downvotes),
    });

    return `${points} • ${upvotes} • ${downvotes}`;
  }

  get canModOnSelf(): boolean {
    return canMod(
      this.postView.creator.id,
      this.props.moderators,
      this.props.admins,
      undefined,
      true,
    );
  }

  get canMod(): boolean {
    return canMod(
      this.postView.creator.id,
      this.props.moderators,
      this.props.admins,
    );
  }

  get canAdmin(): boolean {
    return canAdmin(this.postView.creator.id, this.props.admins);
  }
}
