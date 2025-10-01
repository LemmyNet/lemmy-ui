import { userNotLoggedInOrBanned, myAuth } from "@utils/app";
import { canShare, share } from "@utils/browser";
import { getExternalHost, getHttpBase } from "@utils/env";
import { hostname, unreadCommentsCount } from "@utils/helpers";
import { formatRelativeDate, futureDaysToUnixTime } from "@utils/date";
import { isAudio, isImage, isVideo } from "@utils/media";
import { canAdmin } from "@utils/roles";
import classNames from "classnames";
import { Component, InfernoNode, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { T } from "inferno-i18next-dess";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  EditPost,
  FeaturePost,
  HidePost,
  Language,
  LocalSite,
  LockPost,
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PersonView,
  PostResponse,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import { relTags, torrentHelpUrl } from "@utils/config";
import { ShowDupesType, VoteContentType } from "@utils/types";
import { mdToHtml, mdToHtmlInline } from "@utils/markdown";
import { I18NextService } from "../../services";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PictrsImage } from "../common/pictrs-image";
import { UserBadges } from "../common/user-badges";
import { VoteButtons, VoteButtonsCompact } from "../common/vote-buttons";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { MetadataCard } from "./metadata-card";
import { PostForm } from "./post-form";
import { BanUpdateForm } from "../common/modal/mod-action-form-modal";
import PostActionDropdown from "../common/content-actions/post-action-dropdown";
import { CrossPostParams } from "@utils/types";
import { RequestState } from "../../services/HttpService";
import { toast } from "@utils/app";
import { isMagnetLink, extractMagnetLinkDownloadName } from "@utils/media";
import { NoOptionI18nKeys } from "i18next";

type PostListingState = {
  showEdit: boolean;
  imageExpanded: boolean;
  expandManuallyToggled: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showBody: boolean;
  loading: boolean;
  readLoading: boolean;
};

type PostListingProps = {
  post_view: PostView;
  crossPosts?: PostView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  showCommunity?: boolean;
  /**
   * Controls whether to show both the body *and* the metadata preview card
   */
  showBody?: boolean;
  hideImage?: boolean;
  enableNsfw?: boolean;
  viewOnly?: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  showDupes: ShowDupesType;
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
  onHidePost(form: HidePost): Promise<void>;
  onPersonNote(form: NotePerson): Promise<void>;
  onScrollIntoCommentsClick?(e: MouseEvent): void;
  imageExpanded?: boolean;
} & (
  | { markable?: false }
  | {
      markable: true;
      disableAutoMarkAsRead?: boolean;
      read: boolean;
      onMarkPostAsRead(form: MarkPostAsRead): Promise<void>;
    }
);

@tippyMixin
export class PostListing extends Component<PostListingProps, PostListingState> {
  state: PostListingState = {
    showEdit: false,
    imageExpanded: false,
    expandManuallyToggled: false,
    viewSource: false,
    showAdvanced: false,
    showBody: false,
    loading: false,
    readLoading: false,
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
    this.handleHidePost = this.handleHidePost.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.handlePersonNote = this.handlePersonNote.bind(this);
  }

  unlisten = () => {};

  componentWillMount(): void {
    if (this.props.showAdultConsentModal) {
      this.setState({ imageExpanded: false });
    }

    if (this.props.myUserInfo) {
      const blur_nsfw =
        this.props.myUserInfo.local_user_view.local_user.blur_nsfw;
      if (blur_nsfw && this.postView.post.nsfw) {
        this.setState({ imageExpanded: false });
      }
    }

    // Leave edit mode on navigation
    this.unlisten = this.context.router.history.listen(() => {
      if (this.state.showEdit) {
        this.setState({ showEdit: false });
      }
    });
  }

  componentWillUnmount(): void {
    this.unlisten();
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostListingProps>,
    _nextContext: any,
  ): void {
    if (
      !this.state.expandManuallyToggled &&
      nextProps.imageExpanded !== undefined
    ) {
      this.setState({ imageExpanded: nextProps.imageExpanded });
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
            {this.showBody &&
              post.url &&
              isMagnetLink(post.url) &&
              this.torrentHelp()}
            {this.showBody && post.url && post.embed_title && (
              <MetadataCard post={post} />
            )}
            {this.showBody && this.videoBlock}
            {this.showBody && this.body()}
          </>
        ) : (
          <PostForm
            post_view={this.postView}
            crossPosts={this.props.crossPosts}
            admins={this.props.admins}
            onEdit={this.handleEditPost}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
            showAdultConsentModal={this.props.showAdultConsentModal}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            loading={this.state.loading}
            isNsfwCommunity={this.postView.community.nsfw}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
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
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(body, () => this.forceUpdate())}
          />
        )}
      </article>
    ) : (
      <></>
    );
  }

  torrentHelp() {
    return (
      <div className="alert alert-info small my-2" role="alert">
        <Icon icon="info" classes="icon-inline me-2" />
        <T parent="span" i18nKey="torrent_help">
          #
          <a className="alert-link" rel={relTags} href={torrentHelpUrl}>
            #
          </a>
        </T>
      </div>
    );
  }

  get videoBlock() {
    const post = this.postView.post;
    const url = post.url;

    // if direct video link or embedded video link
    if ((url && isVideo(url)) || isVideo(post.embed_video_url ?? "")) {
      /* eslint-disable jsx-a11y/media-has-caption */
      return (
        <div className="ratio ratio-16x9 mt-3">
          <video
            onLoadStart={linkEvent(this, this.handleMediaLoadStart)}
            onPlay={linkEvent(this, this.handleMediaLoadStart)}
            onVolumeChange={linkEvent(this, this.handleMediaVolumeChange)}
            controls
            aria-label={post.alt_text}
          >
            <source src={post.embed_video_url ?? url} />
          </video>
        </div>
      );
    } else if ((url && isAudio(url)) || isAudio(post.embed_video_url ?? "")) {
      return (
        <audio
          onLoadStart={linkEvent(this, this.handleMediaLoadStart)}
          onPlay={linkEvent(this, this.handleMediaLoadStart)}
          onVolumeChange={linkEvent(this, this.handleMediaVolumeChange)}
          className="w-100"
          controls
          aria-label={post.alt_text}
        >
          <source src={url} />
        </audio>
      );
      /* eslint-enable jsx-a11y/media-has-caption */
    } else if (post.embed_video_url) {
      return (
        <div className="ratio ratio-16x9 mt-3">
          <iframe
            title="video embed"
            src={post.embed_video_url}
            sandbox="allow-same-origin allow-scripts"
            allowFullScreen={true}
          ></iframe>
        </div>
      );
    }
  }

  get img() {
    if (this.props.showAdultConsentModal) {
      return <></>;
    }

    // Use the full-size image for expands
    const post = this.postView.post;
    const url = post.url;
    const thumbnail = post.thumbnail_url;
    const imageSrc = url && isImage(url) ? url : thumbnail;

    if (imageSrc) {
      return (
        <>
          <div className="offset-sm-3 my-2 d-none d-sm-block">
            <a href={imageSrc} className="d-inline-block">
              <PictrsImage src={imageSrc} alt={post.alt_text} />
            </a>
          </div>
          <div className="my-2 d-block d-sm-none">
            <button
              type="button"
              className="p-0 border-0 bg-transparent d-inline-block"
              onClick={linkEvent(this, this.handleImageExpandClick)}
            >
              <PictrsImage src={imageSrc} alt={post.alt_text} />
            </button>
          </div>
        </>
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
        alt={pv.post.alt_text}
        nsfw={pv.post.nsfw || pv.community.nsfw}
      />
    );
  }

  thumbnail() {
    const post = this.postView.post;
    const url = post.url;
    const thumbnail = post.thumbnail_url;

    if (!this.props.hideImage && url && isImage(url) && thumbnail) {
      return (
        <button
          type="button"
          className="thumbnail rounded overflow-hidden d-inline-block position-relative p-0 border-0 bg-transparent"
          data-tippy-content={I18NextService.i18n.t("expand_here")}
          onClick={linkEvent(this, this.handleImageExpandClick)}
          aria-label={I18NextService.i18n.t("expand_here")}
        >
          {this.imgThumb(thumbnail)}
          <Icon
            icon="image"
            classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
          />
        </button>
      );
    } else if (!this.props.hideImage && url && thumbnail && !isVideo(url)) {
      return (
        <a
          className="thumbnail rounded overflow-hidden d-inline-block position-relative p-0 border-0"
          href={url}
          rel={relTags}
          title={url}
          target={this.linkTarget}
        >
          {this.imgThumb(thumbnail)}
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
            className={classNames(
              "thumbnail rounded",
              thumbnail
                ? "overflow-hidden d-inline-block position-relative p-0 border-0"
                : "text-body bg-light d-flex justify-content-center",
            )}
            href={url}
            title={url}
            rel={relTags}
            data-tippy-content={I18NextService.i18n.t("expand_here")}
            onClick={linkEvent(this, this.handleImageExpandClick)}
            aria-label={I18NextService.i18n.t("expand_here")}
            target={this.linkTarget}
          >
            {thumbnail && this.imgThumb(thumbnail)}
            <Icon
              icon="video"
              classes={
                thumbnail
                  ? "d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
                  : "d-flex align-items-center"
              }
            />
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
        <PersonListing person={pv.creator} myUserInfo={this.props.myUserInfo} />
        <UserBadges
          classNames="ms-1"
          isModerator={pv.creator_is_moderator}
          isAdmin={pv.creator_is_admin}
          creator={pv.creator}
          isBanned={pv.creator_banned}
          isBannedFromCommunity={pv.creator_banned_from_community}
          myUserInfo={this.props.myUserInfo}
          personActions={pv.person_actions}
        />
        {this.props.showCommunity && (
          <>
            {" "}
            {I18NextService.i18n.t("to")}{" "}
            <CommunityLink
              community={pv.community}
              myUserInfo={this.props.myUserInfo}
            />
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
        {pv.post.scheduled_publish_time_at && (
          <span className="mx-1 badge text-bg-light">
            {I18NextService.i18n.t("publish_in_time", {
              time: formatRelativeDate(pv.post.scheduled_publish_time_at),
            })}
          </span>
        )}
        {" · "}
        <MomentTime
          published={pv.post.published_at}
          updated={pv.post.updated_at}
        />
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

    if (url) {
      // If its a torrent link, extract the download name
      const linkName = isMagnetLink(url)
        ? extractMagnetLinkDownloadName(url)
        : !(hostname(url) === getExternalHost())
          ? hostname(url)
          : null;

      if (linkName) {
        return (
          <p className="small m-0">
            {url && !(hostname(url) === getExternalHost()) && (
              <a
                className="fst-italic link-dark link-opacity-75 link-opacity-100-hover"
                href={url}
                title={url}
                rel={relTags}
                target={this.linkTarget}
              >
                {linkName}
              </a>
            )}
          </p>
        );
      }
    }
  }

  duplicatesInfo() {
    switch (this.props.showDupes) {
      case "Small":
        return this.smallDuplicates();
      case "Expanded":
        return this.expandedDuplicates();
      case "ShowSeparately":
        return <></>;
    }
  }

  smallDuplicates() {
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
                  : `${pv.community.name}@${hostname(pv.community.ap_id)}`}
              </Link>
            </li>
          ))}
        </>
      </ul>
    ) : (
      <></>
    );
  }

  expandedDuplicates() {
    const dupes = this.props.crossPosts;
    return dupes && dupes.length > 0 ? (
      <div>
        <div className="row mb-3">
          <div className="col">{I18NextService.i18n.t("cross_posts")}</div>
        </div>
        <div className="row">
          {dupes.map(pv => {
            const title = I18NextService.i18n.t("number_of_comments", {
              count: Number(pv.post.comments),
              formattedCount: Number(pv.post.comments),
            });
            const unreadCount = unreadCommentsCount(pv);

            return (
              <div className="d-flex col-sm-12 col-md-6 col-lg-4 mb-3">
                <VoteButtons
                  voteContentType={VoteContentType.Post}
                  id={pv.post.id}
                  subject={pv.post}
                  myVote={pv.post_actions?.like_score}
                  myUserInfo={this.props.myUserInfo}
                  localSite={this.props.localSite}
                  disabled
                  onVote={() => null}
                />
                <div className="col">
                  <div className="post-title">
                    <h1 className="h5 d-inline text-break">
                      <Link
                        className="d-inline link-dark"
                        to={`/post/${pv.post.id}`}
                        title={I18NextService.i18n.t("comments")}
                      >
                        <span
                          className="d-inline"
                          dangerouslySetInnerHTML={mdToHtmlInline(pv.post.name)}
                        />
                      </Link>
                    </h1>
                  </div>

                  <div className="small mb-1 mb-md-0">
                    <Link
                      className="btn btn-link btn-sm text-muted ps-0"
                      title={title}
                      to={`/post/${pv.post.id}?scrollToComments=true`}
                      data-tippy-content={title}
                    >
                      <Icon icon="message-square" classes="me-1" inline />
                      {pv.post.comments}
                      {unreadCount && (
                        <>
                          {" "}
                          <span className="fst-italic">
                            ({unreadCount} {I18NextService.i18n.t("new")})
                          </span>
                        </>
                      )}
                    </Link>
                    <PersonListing
                      person={pv.creator}
                      myUserInfo={this.props.myUserInfo}
                    />
                    <UserBadges
                      classNames="ms-1"
                      isModerator={pv.creator_is_moderator}
                      isAdmin={pv.creator_is_admin}
                      creator={pv.creator}
                      isBanned={pv.creator_banned}
                      isBannedFromCommunity={pv.creator_banned_from_community}
                      myUserInfo={this.props.myUserInfo}
                      personActions={pv.person_actions}
                    />
                    <>
                      {" "}
                      {I18NextService.i18n.t("to")}{" "}
                      <CommunityLink
                        community={pv.community}
                        myUserInfo={this.props.myUserInfo}
                      />
                    </>
                    {" · "}
                    <MomentTime
                      published={pv.post.published_at}
                      updated={pv.post.updated_at}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <></>
    );
  }

  commentsLine(mobile = false) {
    const { admins, showBody, onPostVote } = this.props;
    const { post } = this.postView;
    const { ap_id, id, body } = post;

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
        <Link
          className="btn btn-link btn-animate text-muted"
          to={`/post/${id}`}
          title={I18NextService.i18n.t("link")}
        >
          <Icon icon="link" classes="icon-inline" />
        </Link>
        <a
          className="btn btn-sm btn-link btn-animate text-muted py-0"
          title={I18NextService.i18n.t("fedilink")}
          href={ap_id}
        >
          <Icon icon="fedilink" inline />
        </a>
        {this.props.markable && this.props.myUserInfo && (
          <button
            type="button"
            className="btn btn-link btn-animate text-muted"
            onClick={this.handleMarkPostAsRead}
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
            {this.state.readLoading ? (
              <Spinner />
            ) : (
              <Icon
                icon="check"
                classes={`icon-inline ${this.props.read && "text-success"}`}
              />
            )}
          </button>
        )}
        {mobile && this.isInteractable && (
          <VoteButtonsCompact
            voteContentType={VoteContentType.Post}
            id={id}
            onVote={onPostVote}
            subject={post}
            myVote={this.postView.post_actions?.like_score}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
            disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
          />
        )}

        {showBody && body && this.viewSourceButton}

        {this.props.myUserInfo && this.isInteractable && (
          <PostActionDropdown
            postView={this.postView}
            community={this.postView.community}
            admins={admins}
            crossPostParams={this.crossPostParams}
            myUserInfo={this.props.myUserInfo}
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
            onHidePost={this.handleHidePost}
            onPersonNote={this.handlePersonNote}
          />
        )}
      </div>
    );
  }

  public get linkTarget(): string {
    return this.props.myUserInfo?.local_user_view.local_user
      .open_links_in_new_tab
      ? "_blank"
      : // _self is the default target on links when the field is not specified
        "_self";
  }

  get commentsButton() {
    const pv = this.postView;
    const title = I18NextService.i18n.t("number_of_comments", {
      count: Number(pv.post.comments),
      formattedCount: Number(pv.post.comments),
    });

    return (
      <Link
        className="btn btn-link btn-sm text-muted ps-0"
        title={title}
        to={`/post/${pv.post.id}?scrollToComments=true`}
        data-tippy-content={title}
        onClick={this.props.onScrollIntoCommentsClick}
      >
        <Icon icon="message-square" classes="me-1" inline />
        {pv.post.comments}
        {unreadCommentsCount(pv) && (
          <>
            {" "}
            <span className="fst-italic">
              ({unreadCommentsCount(pv)} {I18NextService.i18n.t("new")})
            </span>
          </>
        )}
      </Link>
    );
  }

  get unreadCount(): number | undefined {
    const pv = this.postView;
    const unread_comments =
      pv.post.comments - (pv.post_actions?.read_comments_amount ?? 0);
    return unread_comments === pv.post.comments || unread_comments === 0
      ? undefined
      : unread_comments;
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
    return (
      <div className="row">
        <div className="col-9">{this.postTitleLine()}</div>
        <div className="col-3 mobile-thumbnail-container">
          {/* Post thumbnail */}
          {this.thumbnail()}
        </div>
      </div>
    );
  }

  showPreviewButton() {
    return (
      <button
        type="button"
        className="btn btn-sm btn-link link-dark link-opacity-75 link-opacity-100-hover py-0 align-baseline"
        onClick={linkEvent(this, this.handleShowBody)}
        aria-pressed={!this.state.showBody ? "false" : "true"}
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
        <div className={classNames("d-block d-sm-none")}>
          <article className="row post-container">
            <div className="col-12">
              {this.createdLine()}

              {/* If it has a thumbnail, do a right aligned thumbnail */}
              {this.mobileThumbnail()}

              {this.commentsLine(true)}
            </div>
          </article>
          {this.duplicatesInfo()}
        </div>

        {/* The larger view*/}
        <div className={classNames("d-none d-sm-block")}>
          <article className="row post-container">
            {this.isInteractable && (
              <div className="col flex-grow-0">
                <VoteButtons
                  voteContentType={VoteContentType.Post}
                  id={this.postView.post.id}
                  onVote={this.props.onPostVote}
                  myUserInfo={this.props.myUserInfo}
                  localSite={this.props.localSite}
                  subject={this.postView.post}
                  myVote={this.postView.post_actions?.like_score}
                  disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
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
                </div>
              </div>
            </div>
          </article>
          {this.duplicatesInfo()}
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

  handleMediaLoadStart(_i: PostListing, e: Event) {
    const video = e.target as HTMLMediaElement;
    const volume = localStorage.getItem("video_volume_level");
    const muted = localStorage.getItem("video_muted");
    video.volume = Number(volume || 0);
    video.muted = muted !== "false";
    if (!(volume || muted)) {
      localStorage.setItem("video_muted", "true");
      localStorage.setItem("volume_level", "0");
    }
  }

  handleMediaVolumeChange(_i: PostListing, e: Event) {
    const video = e.target as HTMLMediaElement;
    localStorage.setItem("video_muted", video.muted.toString());
    localStorage.setItem("video_volume_level", video.volume.toString());
  }

  // The actual editing is done in the receive for post
  async handleEditPost(form: EditPost) {
    this.setState({ loading: true });
    const res = await this.props.onPostEdit(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("edited_post"));
      this.setState({ loading: false, showEdit: false });
    } else if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
      this.setState({ loading: false });
    }
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
      save: !this.postView.post_actions?.saved_at,
    });
  }

  get crossPostParams(): CrossPostParams {
    const { name, url, alt_text, nsfw, language_id, thumbnail_url } =
      this.postView.post;
    const crossPostParams: CrossPostParams = { name };

    if (url) {
      crossPostParams.url = url;
    }

    const crossPostBody = this.crossPostBody();
    if (crossPostBody) {
      crossPostParams.body = crossPostBody;
    }

    if (alt_text) {
      crossPostParams.altText = alt_text;
    }

    if (nsfw) {
      crossPostParams.nsfw = nsfw ? "true" : "false";
    }

    if (language_id !== undefined) {
      crossPostParams.languageId = language_id;
    }

    if (thumbnail_url) {
      crossPostParams.customThumbnailUrl = thumbnail_url;
    }

    return crossPostParams;
  }

  crossPostBody(): string | undefined {
    const post = this.postView.post;
    const body = post.body;

    return body
      ? `${I18NextService.i18n.t("cross_posted_from_url", { ap_id: post.ap_id })}
      \n\n${body.replace(/^/gm, "> ")}`
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

  handleModLock(reason: string) {
    return this.props.onLockPost({
      post_id: this.postView.post.id,
      locked: !this.postView.post.locked,
      reason,
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

  handleHidePost() {
    return this.props.onHidePost({
      hide: !this.postView.post_actions?.hidden_at,
      post_id: this.postView.post.id,
    });
  }

  handlePersonNote(form: NotePerson) {
    return this.props.onPersonNote(form);
  }

  handleModBanFromCommunity({
    daysUntilExpires,
    reason,
    shouldRemoveOrRestoreData,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id },
      creator_banned_from_community,
      community: { id: community_id },
    } = this.postView;
    const ban = !creator_banned_from_community;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemoveOrRestoreData = true;
    }
    const expires_at = futureDaysToUnixTime(daysUntilExpires);

    return this.props.onBanPersonFromCommunity({
      community_id,
      person_id,
      ban,
      remove_or_restore_data: shouldRemoveOrRestoreData,
      reason,
      expires_at,
    });
  }

  handleModBanFromSite({
    daysUntilExpires,
    reason,
    shouldRemoveOrRestoreData,
  }: BanUpdateForm) {
    const {
      creator: { id: person_id },
      creator_banned: banned,
    } = this.postView;
    const ban = !banned;

    // If its an unban, restore all their data
    if (ban === false) {
      shouldRemoveOrRestoreData = true;
    }
    const expires_at = futureDaysToUnixTime(daysUntilExpires);

    return this.props.onBanPerson({
      person_id,
      ban,
      remove_or_restore_data: shouldRemoveOrRestoreData,
      reason,
      expires_at,
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
    i.setState({
      imageExpanded: !i.state.imageExpanded,
      expandManuallyToggled: true,
    });

    if (myAuth() && i.props.markable && !i.props.disableAutoMarkAsRead) {
      i.handleMarkPostAsRead();
    }
  }

  async handleMarkPostAsRead() {
    if (!this.props.markable) return;
    this.setState({ readLoading: true });
    await this.props.onMarkPostAsRead?.({
      post_id: this.props.post_view.post.id,
      read: !this.props.read,
    });
    this.setState({ readLoading: false });
  }

  handleViewSource(i: PostListing) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowBody(i: PostListing) {
    i.setState({ showBody: !i.state.showBody });

    if (myAuth() && i.props.markable && !i.props.disableAutoMarkAsRead) {
      i.handleMarkPostAsRead();
    }
  }

  get pointsTippy(): string {
    const points = I18NextService.i18n.t("number_of_points", {
      count: Number(this.postView.post.score),
      formattedCount: Number(this.postView.post.score),
    });

    const upvotes = I18NextService.i18n.t("number_of_upvotes", {
      count: Number(this.postView.post.upvotes),
      formattedCount: Number(this.postView.post.upvotes),
    });

    const downvotes = I18NextService.i18n.t("number_of_downvotes", {
      count: Number(this.postView.post.downvotes),
      formattedCount: Number(this.postView.post.downvotes),
    });

    return `${points} • ${upvotes} • ${downvotes}`;
  }

  get canModOnSelf(): boolean {
    if (
      this.postView.creator.id !==
      this.props.myUserInfo?.local_user_view.person.id
    ) {
      return false;
    }
    return this.canMod;
  }

  get canMod(): boolean {
    return (
      this.postView.can_mod ||
      canAdmin(
        this.postView.creator.id,
        this.props.admins,
        this.props.myUserInfo,
      )
    );
  }

  get canAdmin(): boolean {
    return canAdmin(
      this.postView.creator.id,
      this.props.admins,
      this.props.myUserInfo,
    );
  }

  get isInteractable() {
    const {
      viewOnly,
      post_view: {
        community_actions: { received_ban_at: banned_from_community } = {},
      },
    } = this.props;

    return !(viewOnly || banned_from_community);
  }
}
