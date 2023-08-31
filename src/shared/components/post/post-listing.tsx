import { myAuth, myAuthRequired } from "@utils/app";
import { canShare, share } from "@utils/browser";
import { getExternalHost, getHttpBase } from "@utils/env";
import {
  capitalizeFirstLetter,
  futureDaysToUnixTime,
  hostname,
} from "@utils/helpers";
import { isImage, isVideo } from "@utils/media";
import {
  amAdmin,
  amCommunityCreator,
  amMod,
  canAdmin,
  canMod,
  isAdmin,
  isBanned,
  isMod,
} from "@utils/roles";
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
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import { relTags } from "../../config";
import {
  BanType,
  PostFormParams,
  PurgeType,
  VoteContentType,
} from "../../interfaces";
import { mdToHtml, mdToHtmlInline } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { setupTippy } from "../../tippy";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PictrsImage } from "../common/pictrs-image";
import { UserBadges } from "../common/user-badges";
import { VoteButtons, VoteButtonsCompact } from "../common/vote-buttons";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { MetadataCard } from "./metadata-card";
import { PostForm } from "./post-form";

interface PostListingState {
  showEdit: boolean;
  showRemoveDialog: boolean;
  showPurgeDialog: boolean;
  purgeReason?: string;
  purgeType?: PurgeType;
  purgeLoading: boolean;
  removeReason?: string;
  showBanDialog: boolean;
  banReason?: string;
  banExpireDays?: number;
  banType?: BanType;
  removeData?: boolean;
  showConfirmTransferSite: boolean;
  showConfirmTransferCommunity: boolean;
  imageExpanded: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showMoreMobile: boolean;
  showBody: boolean;
  showReportDialog: boolean;
  reportReason?: string;
  reportLoading: boolean;
  blockLoading: boolean;
  lockLoading: boolean;
  deleteLoading: boolean;
  removeLoading: boolean;
  saveLoading: boolean;
  featureCommunityLoading: boolean;
  featureLocalLoading: boolean;
  banLoading: boolean;
  addModLoading: boolean;
  addAdminLoading: boolean;
  transferLoading: boolean;
}

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
  onPostEdit(form: EditPost): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onBlockPerson(form: BlockPerson): void;
  onLockPost(form: LockPost): void;
  onDeletePost(form: DeletePost): void;
  onRemovePost(form: RemovePost): void;
  onSavePost(form: SavePost): void;
  onFeaturePost(form: FeaturePost): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgePost(form: PurgePost): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onTransferCommunity(form: TransferCommunity): void;
  onMarkPostAsRead(form: MarkPostAsRead): void;
}

export class PostListing extends Component<PostListingProps, PostListingState> {
  state: PostListingState = {
    showEdit: false,
    showRemoveDialog: false,
    showPurgeDialog: false,
    purgeType: PurgeType.Person,
    showBanDialog: false,
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
    purgeLoading: false,
    reportLoading: false,
    blockLoading: false,
    lockLoading: false,
    deleteLoading: false,
    removeLoading: false,
    saveLoading: false,
    featureCommunityLoading: false,
    featureLocalLoading: false,
    banLoading: false,
    addModLoading: false,
    addAdminLoading: false,
    transferLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    if (UserService.Instance.myUserInfo) {
      this.state.imageExpanded =
        UserService.Instance.myUserInfo.local_user_view.local_user.auto_expand;
    }

    this.handleEditPost = this.handleEditPost.bind(this);
    this.handleEditCancel = this.handleEditCancel.bind(this);
  }

  componentWillReceiveProps(nextProps: PostListingProps) {
    if (this.props !== nextProps) {
      this.setState({
        purgeLoading: false,
        reportLoading: false,
        blockLoading: false,
        lockLoading: false,
        deleteLoading: false,
        removeLoading: false,
        saveLoading: false,
        featureCommunityLoading: false,
        featureLocalLoading: false,
        banLoading: false,
        addModLoading: false,
        addAdminLoading: false,
        transferLoading: false,
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
        <div className="embed-responsive mt-3">
          <video muted controls className="embed-responsive-item col-12">
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
    const post_view = this.postView;

    return (
      <PictrsImage
        src={src}
        thumbnail
        alt=""
        nsfw={post_view.post.nsfw || post_view.community.nsfw}
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
          target={this.linkTarget}
        >
          <div className="thumbnail rounded bg-light d-flex justify-content-center">
            <Icon icon="message-square" classes="d-flex align-items-center" />
          </div>
        </Link>
      );
    }
  }

  createdLine() {
    const post_view = this.postView;

    return (
      <div className="small mb-1 mb-md-0">
        <PersonListing person={post_view.creator} />
        <UserBadges
          classNames="ms-1"
          isMod={this.creatorIsMod_}
          isAdmin={this.creatorIsAdmin_}
          isBot={post_view.creator.bot_account}
        />
        {this.props.showCommunity && (
          <>
            {" "}
            {I18NextService.i18n.t("to")}{" "}
            <CommunityLink community={post_view.community} />
          </>
        )}
        {post_view.post.language_id !== 0 && (
          <span className="mx-1 badge text-bg-light">
            {
              this.props.allLanguages.find(
                lang => lang.id === post_view.post.language_id,
              )?.name
            }
          </span>
        )}{" "}
        •{" "}
        <MomentTime
          published={post_view.post.published}
          updated={post_view.post.updated}
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
    const post = this.postView.post;

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
        {!post.local && (
          <a
            className="btn btn-sm btn-link btn-animate text-muted py-0"
            title={I18NextService.i18n.t("link")}
            href={post.ap_id}
          >
            <Icon icon="fedilink" inline />
          </a>
        )}
        {mobile && !this.props.viewOnly && (
          <VoteButtonsCompact
            voteContentType={VoteContentType.Post}
            id={this.postView.post.id}
            onVote={this.props.onPostVote}
            enableDownvotes={this.props.enableDownvotes}
            counts={this.postView.counts}
            my_vote={this.postView.my_vote}
          />
        )}
        {UserService.Instance.myUserInfo &&
          !this.props.viewOnly &&
          this.postActions()}
      </div>
    );
  }

  postActions() {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    // Possible enhancement: Make each button a component.
    const post_view = this.postView;
    const post = post_view.post;

    return (
      <>
        {this.saveButton}
        {this.crossPostButton}

        {this.props.showBody && post_view.post.body && this.viewSourceButton}

        <div className="dropdown">
          <button
            className="btn btn-sm btn-link btn-animate text-muted py-0 dropdown-toggle"
            onClick={linkEvent(this, this.handleShowAdvanced)}
            data-tippy-content={I18NextService.i18n.t("more")}
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-controls={`advancedButtonsDropdown${post.id}`}
            aria-label={I18NextService.i18n.t("more")}
          >
            <Icon icon="more-vertical" inline />
          </button>

          <ul
            className="dropdown-menu"
            id={`advancedButtonsDropdown${post.id}`}
          >
            {!this.myPost ? (
              <>
                <li>{this.reportButton}</li>
                <li>{this.blockButton}</li>
              </>
            ) : (
              <>
                <li>{this.editButton}</li>
                <li>{this.deleteButton}</li>
              </>
            )}

            {/* Any mod can do these, not limited to hierarchy*/}
            {(amMod(this.props.moderators) || amAdmin()) && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>{this.lockButton}</li>
                {this.featureButtons}
              </>
            )}

            {(this.canMod_ || this.canAdmin_) && (
              <li>{this.modRemoveButton}</li>
            )}

            {this.canMod_ && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                {!this.creatorIsMod_ &&
                  (!post_view.creator_banned_from_community ? (
                    <li>{this.modBanFromCommunityButton}</li>
                  ) : (
                    <li>{this.modUnbanFromCommunityButton}</li>
                  ))}
                {!post_view.creator_banned_from_community && (
                  <li>{this.addModToCommunityButton}</li>
                )}
              </>
            )}

            {(amCommunityCreator(post_view.creator.id, this.props.moderators) ||
              this.canAdmin_) &&
              this.creatorIsMod_ && <li>{this.transferCommunityButton}</li>}

            {/* Admins can ban from all, and appoint other admins */}
            {this.canAdmin_ && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                {!this.creatorIsAdmin_ && (
                  <>
                    {!isBanned(post_view.creator) ? (
                      <li>{this.modBanButton}</li>
                    ) : (
                      <li>{this.modUnbanButton}</li>
                    )}
                    <li>{this.purgePersonButton}</li>
                    <li>{this.purgePostButton}</li>
                  </>
                )}
                {!isBanned(post_view.creator) && post_view.creator.local && (
                  <li>{this.toggleAdminButton}</li>
                )}
              </>
            )}
          </ul>
        </div>
      </>
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
    const post_view = this.postView;
    const title = I18NextService.i18n.t("number_of_comments", {
      count: Number(post_view.counts.comments),
      formattedCount: Number(post_view.counts.comments),
    });

    return (
      <Link
        className="btn btn-link btn-sm text-muted ps-0"
        title={title}
        to={`/post/${post_view.post.id}?scrollToComments=true`}
        data-tippy-content={title}
        target={this.linkTarget}
      >
        <Icon icon="message-square" classes="me-1" inline />
        {post_view.counts.comments}
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

  get saveButton() {
    const saved = this.postView.saved;
    const label = saved
      ? I18NextService.i18n.t("unsave")
      : I18NextService.i18n.t("save");
    return (
      <button
        className="btn btn-sm btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleSavePostClick)}
        data-tippy-content={label}
        aria-label={label}
      >
        {this.state.saveLoading ? (
          <Spinner />
        ) : (
          <Icon
            icon="star"
            classes={classNames({ "text-warning": saved })}
            inline
          />
        )}
      </button>
    );
  }

  get crossPostButton() {
    return (
      <Link
        className="btn btn-sm btn-link btn-animate text-muted py-0"
        to={{
          /* Empty string properties are required to satisfy type*/
          pathname: "/create_post",
          state: { ...this.crossPostParams },
          hash: "",
          key: "",
          search: "",
        }}
        title={I18NextService.i18n.t("cross_post")}
        data-tippy-content={I18NextService.i18n.t("cross_post")}
        aria-label={I18NextService.i18n.t("cross_post")}
      >
        <Icon icon="copy" inline />
      </Link>
    );
  }

  get reportButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleShowReportDialog)}
        aria-label={I18NextService.i18n.t("show_report_dialog")}
      >
        <Icon classes="me-1" icon="flag" inline />
        {I18NextService.i18n.t("create_report")}
      </button>
    );
  }

  get blockButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleBlockPersonClick)}
        aria-label={I18NextService.i18n.t("block_user")}
      >
        {this.state.blockLoading ? (
          <Spinner />
        ) : (
          <Icon classes="me-1" icon="slash" inline />
        )}
        {I18NextService.i18n.t("block_user")}
      </button>
    );
  }

  get editButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleEditClick)}
        aria-label={I18NextService.i18n.t("edit")}
      >
        <Icon classes="me-1" icon="edit" inline />
        {I18NextService.i18n.t("edit")}
      </button>
    );
  }

  get deleteButton() {
    const deleted = this.postView.post.deleted;
    const label = !deleted
      ? I18NextService.i18n.t("delete")
      : I18NextService.i18n.t("restore");
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleDeleteClick)}
      >
        {this.state.deleteLoading ? (
          <Spinner />
        ) : (
          <>
            <Icon
              icon="trash"
              classes={classNames("me-1", { "text-danger": deleted })}
              inline
            />
            {label}
          </>
        )}
      </button>
    );
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

  get lockButton() {
    const locked = this.postView.post.locked;
    const label = locked
      ? I18NextService.i18n.t("unlock")
      : I18NextService.i18n.t("lock");
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleModLock)}
        aria-label={label}
      >
        {this.state.lockLoading ? (
          <Spinner />
        ) : (
          <>
            <Icon
              icon="lock"
              classes={classNames("me-1", { "text-danger": locked })}
              inline
            />
            {capitalizeFirstLetter(label)}
          </>
        )}
      </button>
    );
  }

  get featureButtons() {
    const featuredCommunity = this.postView.post.featured_community;
    const labelCommunity = featuredCommunity
      ? I18NextService.i18n.t("unfeature_from_community")
      : I18NextService.i18n.t("feature_in_community");

    const featuredLocal = this.postView.post.featured_local;
    const labelLocal = featuredLocal
      ? I18NextService.i18n.t("unfeature_from_local")
      : I18NextService.i18n.t("feature_in_local");
    return (
      <>
        <li>
          <button
            className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
            onClick={linkEvent(this, this.handleModFeaturePostCommunity)}
            data-tippy-content={labelCommunity}
            aria-label={labelCommunity}
          >
            {this.state.featureCommunityLoading ? (
              <Spinner />
            ) : (
              <>
                <Icon
                  icon="pin"
                  classes={classNames("me-1", {
                    "text-success": featuredCommunity,
                  })}
                  inline
                />
                {I18NextService.i18n.t("community")}
              </>
            )}
          </button>
        </li>
        <li>
          {amAdmin() && (
            <button
              className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
              onClick={linkEvent(this, this.handleModFeaturePostLocal)}
              data-tippy-content={labelLocal}
              aria-label={labelLocal}
            >
              {this.state.featureLocalLoading ? (
                <Spinner />
              ) : (
                <>
                  <Icon
                    icon="pin"
                    classes={classNames("me-1", {
                      "text-success": featuredLocal,
                    })}
                    inline
                  />
                  {I18NextService.i18n.t("local")}
                </>
              )}
            </button>
          )}
        </li>
      </>
    );
  }

  get modBanFromCommunityButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleModBanFromCommunityShow)}
      >
        {I18NextService.i18n.t("ban_from_community")}
      </button>
    );
  }

  get modUnbanFromCommunityButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleModBanFromCommunitySubmit)}
      >
        {this.state.banLoading ? <Spinner /> : I18NextService.i18n.t("unban")}
      </button>
    );
  }

  get addModToCommunityButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleAddModToCommunity)}
      >
        {this.state.addModLoading ? (
          <Spinner />
        ) : this.creatorIsMod_ ? (
          capitalizeFirstLetter(I18NextService.i18n.t("remove_as_mod"))
        ) : (
          capitalizeFirstLetter(I18NextService.i18n.t("appoint_as_mod"))
        )}
      </button>
    );
  }

  get modBanButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleModBanShow)}
      >
        {capitalizeFirstLetter(I18NextService.i18n.t("ban_from_site"))}
      </button>
    );
  }

  get modUnbanButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleModBanSubmit)}
      >
        {this.state.banLoading ? (
          <Spinner />
        ) : (
          capitalizeFirstLetter(I18NextService.i18n.t("unban_from_site"))
        )}
      </button>
    );
  }

  get purgePersonButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handlePurgePersonShow)}
      >
        {capitalizeFirstLetter(I18NextService.i18n.t("purge_user"))}
      </button>
    );
  }

  get purgePostButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handlePurgePostShow)}
      >
        {capitalizeFirstLetter(I18NextService.i18n.t("purge_post"))}
      </button>
    );
  }

  get toggleAdminButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleAddAdmin)}
      >
        {this.state.addAdminLoading ? (
          <Spinner />
        ) : this.creatorIsAdmin_ ? (
          capitalizeFirstLetter(I18NextService.i18n.t("remove_as_admin"))
        ) : (
          capitalizeFirstLetter(I18NextService.i18n.t("appoint_as_admin"))
        )}
      </button>
    );
  }

  get transferCommunityButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.handleShowConfirmTransferCommunity)}
      >
        {capitalizeFirstLetter(I18NextService.i18n.t("transfer_community"))}
      </button>
    );
  }

  get modRemoveButton() {
    const removed = this.postView.post.removed;
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(
          this,
          !removed ? this.handleModRemoveShow : this.handleModRemoveSubmit,
        )}
      >
        {/* TODO: Find an icon for this. */}
        {this.state.removeLoading ? (
          <Spinner />
        ) : !removed ? (
          capitalizeFirstLetter(I18NextService.i18n.t("remove_post"))
        ) : (
          <>
            {capitalizeFirstLetter(I18NextService.i18n.t("restore"))}{" "}
            {I18NextService.i18n.t("post")}
          </>
        )}
      </button>
    );
  }

  removeAndBanDialogs() {
    const post = this.postView;
    const purgeTypeText =
      this.state.purgeType === PurgeType.Post
        ? I18NextService.i18n.t("purge_post")
        : `${I18NextService.i18n.t("purge")} ${post.creator.name}`;
    return (
      <>
        {this.state.showRemoveDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleModRemoveSubmit)}
          >
            <label
              className="visually-hidden"
              htmlFor="post-listing-remove-reason"
            >
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              id="post-listing-remove-reason"
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("reason")}
              value={this.state.removeReason}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button type="submit" className="btn btn-secondary">
              {this.state.removeLoading ? (
                <Spinner />
              ) : (
                I18NextService.i18n.t("remove_post")
              )}
            </button>
          </form>
        )}
        {this.state.showConfirmTransferCommunity && (
          <>
            <button className="d-inline-block me-1 btn btn-link btn-animate text-muted py-0">
              {I18NextService.i18n.t("are_you_sure")}
            </button>
            <button
              className="btn btn-link btn-animate text-muted py-0 d-inline-block me-1"
              onClick={linkEvent(this, this.handleTransferCommunity)}
            >
              {this.state.transferLoading ? (
                <Spinner />
              ) : (
                I18NextService.i18n.t("yes")
              )}
            </button>
            <button
              className="btn btn-link btn-animate text-muted py-0 d-inline-block"
              onClick={linkEvent(
                this,
                this.handleCancelShowConfirmTransferCommunity,
              )}
              aria-label={I18NextService.i18n.t("no")}
            >
              {I18NextService.i18n.t("no")}
            </button>
          </>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div className="mb-3 row col-12">
              <label
                className="col-form-label"
                htmlFor="post-listing-ban-reason"
              >
                {I18NextService.i18n.t("reason")}
              </label>
              <input
                type="text"
                id="post-listing-ban-reason"
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("reason")}
                value={this.state.banReason}
                onInput={linkEvent(this, this.handleModBanReasonChange)}
              />
              <label className="col-form-label" htmlFor="mod-ban-expires">
                {I18NextService.i18n.t("expires")}
              </label>
              <input
                type="number"
                id="mod-ban-expires"
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
              <button type="submit" className="btn btn-secondary">
                {this.state.banLoading ? (
                  <Spinner />
                ) : (
                  <span>
                    {I18NextService.i18n.t("ban")} {post.creator.name}
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
        {this.state.showReportDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleReportSubmit)}
          >
            <label className="visually-hidden" htmlFor="post-report-reason">
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              id="post-report-reason"
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("reason")}
              required
              value={this.state.reportReason}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button type="submit" className="btn btn-secondary">
              {this.state.reportLoading ? (
                <Spinner />
              ) : (
                I18NextService.i18n.t("create_report")
              )}
            </button>
          </form>
        )}
        {this.state.showPurgeDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handlePurgeSubmit)}
          >
            <PurgeWarning />
            <label className="visually-hidden" htmlFor="purge-reason">
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              id="purge-reason"
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("reason")}
              value={this.state.purgeReason}
              onInput={linkEvent(this, this.handlePurgeReasonChange)}
            />
            {this.state.purgeLoading ? (
              <Spinner />
            ) : (
              <button type="submit" className="btn btn-secondary">
                {this.state.purgeLoading ? <Spinner /> : { purgeTypeText }}
              </button>
            )}
          </form>
        )}
      </>
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
              {this.removeAndBanDialogs()}
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
                  {this.removeAndBanDialogs()}
                </div>
              </div>
            </div>
          </article>
        </div>
      </>
    );
  }

  private get myPost(): boolean {
    return (
      this.postView.creator.id ===
      UserService.Instance.myUserInfo?.local_user_view.person.id
    );
  }

  handleEditClick(i: PostListing) {
    i.setState({ showEdit: true });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  // The actual editing is done in the receive for post
  handleEditPost(form: EditPost) {
    this.setState({ showEdit: false });
    this.props.onPostEdit(form);
  }

  handleShare(i: PostListing) {
    const { name, body, id } = i.props.post_view.post;
    share({
      title: name,
      text: body?.slice(0, 50),
      url: `${getHttpBase()}/post/${id}`,
    });
  }

  handleShowReportDialog(i: PostListing) {
    i.setState({ showReportDialog: !i.state.showReportDialog });
  }

  handleReportReasonChange(i: PostListing, event: any) {
    i.setState({ reportReason: event.target.value });
  }

  handleReportSubmit(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ reportLoading: true });
    i.props.onPostReport({
      post_id: i.postView.post.id,
      reason: i.state.reportReason ?? "",
      auth: myAuthRequired(),
    });
  }

  handleBlockPersonClick(i: PostListing) {
    i.setState({ blockLoading: true });
    i.props.onBlockPerson({
      person_id: i.postView.creator.id,
      block: true,
      auth: myAuthRequired(),
    });
  }

  handleDeleteClick(i: PostListing) {
    i.setState({ deleteLoading: true });
    i.props.onDeletePost({
      post_id: i.postView.post.id,
      deleted: !i.postView.post.deleted,
      auth: myAuthRequired(),
    });
  }

  handleSavePostClick(i: PostListing) {
    i.setState({ saveLoading: true });
    i.props.onSavePost({
      post_id: i.postView.post.id,
      save: !i.postView.saved,
      auth: myAuthRequired(),
    });
  }

  get crossPostParams(): PostFormParams {
    const queryParams: PostFormParams = {};
    const { name, url } = this.postView.post;

    queryParams.name = name;

    if (url) {
      queryParams.url = url;
    }

    const crossPostBody = this.crossPostBody();
    if (crossPostBody) {
      queryParams.body = crossPostBody;
    }

    return queryParams;
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

  handleModRemoveShow(i: PostListing) {
    i.setState({
      showRemoveDialog: !i.state.showRemoveDialog,
      showBanDialog: false,
    });
  }

  handleModRemoveReasonChange(i: PostListing, event: any) {
    i.setState({ removeReason: event.target.value });
  }

  handleModRemoveDataChange(i: PostListing, event: any) {
    i.setState({ removeData: event.target.checked });
  }

  handleModRemoveSubmit(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ removeLoading: true });
    i.props.onRemovePost({
      post_id: i.postView.post.id,
      removed: !i.postView.post.removed,
      auth: myAuthRequired(),
      reason: i.state.removeReason,
    });
  }

  handleModLock(i: PostListing) {
    i.setState({ lockLoading: true });
    i.props.onLockPost({
      post_id: i.postView.post.id,
      locked: !i.postView.post.locked,
      auth: myAuthRequired(),
    });
  }

  handleModFeaturePostLocal(i: PostListing) {
    i.setState({ featureLocalLoading: true });
    i.props.onFeaturePost({
      post_id: i.postView.post.id,
      featured: !i.postView.post.featured_local,
      feature_type: "Local",
      auth: myAuthRequired(),
    });
  }

  handleModFeaturePostCommunity(i: PostListing) {
    i.setState({ featureCommunityLoading: true });
    i.props.onFeaturePost({
      post_id: i.postView.post.id,
      featured: !i.postView.post.featured_community,
      feature_type: "Community",
      auth: myAuthRequired(),
    });
  }

  handleModBanFromCommunityShow(i: PostListing) {
    i.setState({
      showBanDialog: true,
      banType: BanType.Community,
      showRemoveDialog: false,
    });
  }

  handleModBanShow(i: PostListing) {
    i.setState({
      showBanDialog: true,
      banType: BanType.Site,
      showRemoveDialog: false,
    });
  }

  handlePurgePersonShow(i: PostListing) {
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Person,
      showRemoveDialog: false,
    });
  }

  handlePurgePostShow(i: PostListing) {
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Post,
      showRemoveDialog: false,
    });
  }

  handlePurgeReasonChange(i: PostListing, event: any) {
    i.setState({ purgeReason: event.target.value });
  }

  handlePurgeSubmit(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ purgeLoading: true });
    if (i.state.purgeType === PurgeType.Person) {
      i.props.onPurgePerson({
        person_id: i.postView.creator.id,
        reason: i.state.purgeReason,
        auth: myAuthRequired(),
      });
    } else if (i.state.purgeType === PurgeType.Post) {
      i.props.onPurgePost({
        post_id: i.postView.post.id,
        reason: i.state.purgeReason,
        auth: myAuthRequired(),
      });
    }
  }

  handleModBanReasonChange(i: PostListing, event: any) {
    i.setState({ banReason: event.target.value });
  }

  handleModBanExpireDaysChange(i: PostListing, event: any) {
    i.setState({ banExpireDays: event.target.value });
  }

  handleModBanFromCommunitySubmit(i: PostListing, event: any) {
    i.setState({ banType: BanType.Community });
    i.handleModBanBothSubmit(i, event);
  }

  handleModBanSubmit(i: PostListing, event: any) {
    i.setState({ banType: BanType.Site });
    i.handleModBanBothSubmit(i, event);
  }

  handleModBanBothSubmit(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ banLoading: true });

    const ban = !i.props.post_view.creator_banned_from_community;
    // If its an unban, restore all their data
    if (ban === false) {
      i.setState({ removeData: false });
    }
    const person_id = i.props.post_view.creator.id;
    const remove_data = i.state.removeData;
    const reason = i.state.banReason;
    const expires = futureDaysToUnixTime(i.state.banExpireDays);

    if (i.state.banType === BanType.Community) {
      const community_id = i.postView.community.id;
      i.props.onBanPersonFromCommunity({
        community_id,
        person_id,
        ban,
        remove_data,
        reason,
        expires,
        auth: myAuthRequired(),
      });
    } else {
      i.props.onBanPerson({
        person_id,
        ban,
        remove_data,
        reason,
        expires,
        auth: myAuthRequired(),
      });
    }
  }

  handleAddModToCommunity(i: PostListing) {
    i.setState({ addModLoading: true });
    i.props.onAddModToCommunity({
      community_id: i.postView.community.id,
      person_id: i.postView.creator.id,
      added: !i.creatorIsMod_,
      auth: myAuthRequired(),
    });
  }

  handleAddAdmin(i: PostListing) {
    i.setState({ addAdminLoading: true });
    i.props.onAddAdmin({
      person_id: i.postView.creator.id,
      added: !i.creatorIsAdmin_,
      auth: myAuthRequired(),
    });
  }

  handleShowConfirmTransferCommunity(i: PostListing) {
    i.setState({ showConfirmTransferCommunity: true });
  }

  handleCancelShowConfirmTransferCommunity(i: PostListing) {
    i.setState({ showConfirmTransferCommunity: false });
  }

  handleTransferCommunity(i: PostListing) {
    i.setState({ transferLoading: true });
    i.props.onTransferCommunity({
      community_id: i.postView.community.id,
      person_id: i.postView.creator.id,
      auth: myAuthRequired(),
    });
  }

  handleShowConfirmTransferSite(i: PostListing) {
    i.setState({ showConfirmTransferSite: true });
  }

  handleCancelShowConfirmTransferSite(i: PostListing) {
    i.setState({ showConfirmTransferSite: false });
  }

  handleImageExpandClick(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ imageExpanded: !i.state.imageExpanded });
    setupTippy();

    const auth = myAuth();
    if (auth && !i.props.post_view.read) {
      i.props.onMarkPostAsRead({
        post_id: i.props.post_view.post.id,
        read: true,
        auth: auth,
      });
    }
  }

  handleViewSource(i: PostListing) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowAdvanced(i: PostListing) {
    i.setState({ showAdvanced: !i.state.showAdvanced });
    setupTippy();
  }

  handleShowMoreMobile(i: PostListing) {
    i.setState({
      showMoreMobile: !i.state.showMoreMobile,
      showAdvanced: !i.state.showAdvanced,
    });
    setupTippy();
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

  get canModOnSelf_(): boolean {
    return canMod(
      this.postView.creator.id,
      this.props.moderators,
      this.props.admins,
      undefined,
      true,
    );
  }

  get canMod_(): boolean {
    return canMod(
      this.postView.creator.id,
      this.props.moderators,
      this.props.admins,
    );
  }

  get canAdmin_(): boolean {
    return canAdmin(this.postView.creator.id, this.props.admins);
  }

  get creatorIsMod_(): boolean {
    return isMod(this.postView.creator.id, this.props.moderators);
  }

  get creatorIsAdmin_(): boolean {
    return isAdmin(this.postView.creator.id, this.props.admins);
  }
}
