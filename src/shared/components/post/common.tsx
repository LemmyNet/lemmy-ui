import { Icon } from "@components/common/icon";
import { MomentTime } from "@components/common/moment-time";
import { PictrsImage } from "@components/common/pictrs-image";
import { UserBadges } from "@components/common/user-badges";
import { CommunityLink } from "@components/community/community-link";
import { PersonListing } from "@components/person/person-listing";
import { I18NextService } from "@services/index";
import { linkTarget } from "@utils/app";
import { relTags, torrentHelpUrl } from "@utils/config";
import { formatRelativeDate } from "@utils/date";
import { getExternalHost } from "@utils/env";
import { mdToHtmlInline } from "@utils/markdown";
import {
  isMagnetLink,
  extractMagnetLinkDownloadName,
  isImage,
  isMedia,
} from "@utils/media";
import { Link } from "inferno-router";
import { Post, PostView, MyUserInfo, Language } from "lemmy-js-client";
import { T } from "inferno-i18next-dess";
import { hostname } from "@utils/helpers";
import { ShowBodyType } from "@utils/types";

type PostNameProps = {
  post: Post;
  showBody: ShowBodyType;
};
export function PostName({ post, showBody }: PostNameProps) {
  const url = post.url;

  // Only navigate to external, if its media, or the full post
  const navigateExternal = (url && isMedia(url)) || showBody === "Full";

  return (
    <h1 className="post-name h5 d-inline text-break">
      {navigateExternal ? (
        <a
          className={
            !post.featured_community && !post.featured_local
              ? "text-body"
              : "link-primary"
          }
          href={url}
          title={url}
          rel={relTags}
          dangerouslySetInnerHTML={mdToHtmlInline(post.name)}
        ></a>
      ) : (
        <PostLink post={post} />
      )}
    </h1>
  );
}

type PostBadgesProps = {
  post: Post;
};
function PostBadges({ post }: PostBadgesProps) {
  {
    /**
     * If there is (a) a URL and an embed title, or (b) a post body, and
     * we were not told to show the body by the parent component, show the
     * MetadataCard/body toggle.
     */
  }
  return (
    <>
      {post.removed && (
        <small className="ms-2 badge text-bg-light">
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
          data-tippy-content={I18NextService.i18n.t("featured_in_community")}
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
    </>
  );
}

type PostCreatedLineProps = {
  postView: PostView;
  showCommunity: boolean;
  showPublishedTime: boolean;
  showUrlLine: boolean;
  allLanguages: Language[];
  myUserInfo: MyUserInfo | undefined;
};
export function PostCreatedLine({
  postView,
  showCommunity,
  showPublishedTime,
  showUrlLine,
  allLanguages,
  myUserInfo,
}: PostCreatedLineProps) {
  return (
    <div className="small mb-1 mb-md-0">
      {showCommunity && (
        <>
          <CommunityLink
            community={postView.community}
            myUserInfo={myUserInfo}
          />
          {" · "}
        </>
      )}
      <PersonListing person={postView.creator} myUserInfo={myUserInfo} muted />
      <UserBadges
        classNames="ms-1"
        isModerator={postView.creator_is_moderator}
        isAdmin={postView.creator_is_admin}
        creator={postView.creator}
        isBanned={postView.creator_banned}
        isBannedFromCommunity={postView.creator_banned_from_community}
        myUserInfo={myUserInfo}
        personActions={postView.person_actions}
      />
      {postView.post.language_id !== 0 && (
        <span className="mx-1 badge text-bg-light">
          {
            allLanguages.find(lang => lang.id === postView.post.language_id)
              ?.name
          }
        </span>
      )}{" "}
      {postView.post.scheduled_publish_time_at && (
        <span className="mx-1 badge text-bg-light">
          {I18NextService.i18n.t("publish_in_time", {
            time: formatRelativeDate(postView.post.scheduled_publish_time_at),
          })}
        </span>
      )}
      <PostBadges post={postView.post} />
      {showUrlLine && (
        <>
          {" · "}
          <UrlLine postView={postView} myUserInfo={myUserInfo} />
        </>
      )}
      {showPublishedTime && (
        <>
          {" · "}
          <PostPublishedTime post={postView.post} />
        </>
      )}
    </div>
  );
}

type PostPublishedTimeProps = {
  post: Post;
};
export function PostPublishedTime({ post }: PostPublishedTimeProps) {
  return (
    <MomentTime
      published={post.published_at}
      updated={post.updated_at}
      showAgo={false}
    />
  );
}

type PostLinkProps = {
  post: Post;
};
function PostLink({ post }: PostLinkProps) {
  const featured = post.featured_community || post.featured_local;

  return (
    <Link
      className={`d-inline ${featured ? "link-primary" : "text-body"}`}
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

type UrlLineProps = {
  postView: PostView;
  myUserInfo: MyUserInfo | undefined;
};
export function UrlLine({ postView, myUserInfo }: UrlLineProps) {
  const post = postView.post;
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
        url &&
        !(hostname(url) === getExternalHost()) && (
          <>
            <a
              className="fst-italic text-body link-opacity-75 link-opacity-100-hover"
              href={url}
              title={url}
              rel={relTags}
              target={linkTarget(myUserInfo)}
            >
              {linkName}
            </a>
          </>
        )
      );
    }
  }
}

type PostImgProps = {
  postView: PostView;
  showAdultConsentModal: boolean;
};
export function PostImg({ postView, showAdultConsentModal }: PostImgProps) {
  if (showAdultConsentModal) {
    return <></>;
  }

  // Use the full-size image for expands
  const post = postView.post;
  const url = post.url;
  const thumbnail = post.thumbnail_url;
  const imageSrc = url && isImage(url) ? url : thumbnail;
  const imageDetails = postView.image_details;

  return imageSrc ? (
    <div className="my-2">
      <a href={imageSrc}>
        <PictrsImage
          src={imageSrc}
          alt={post.alt_text}
          width={imageDetails?.width}
          height={imageDetails?.height}
          nsfw={postView.post.nsfw || postView.community.nsfw}
        />
      </a>
    </div>
  ) : (
    <></>
  );
}

export function TorrentHelp() {
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
