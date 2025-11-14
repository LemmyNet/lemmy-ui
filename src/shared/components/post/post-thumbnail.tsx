import { Icon } from "@components/common/icon";
import { PictrsImage } from "@components/common/pictrs-image";
import { I18NextService } from "@services/index";
import { hideAnimatedImage, hideImages, linkTarget } from "@utils/app";
import { relTags } from "@utils/config";
import { isImage, isVideo } from "@utils/media";
import classNames from "classnames";
import { Link } from "inferno-router";
import { PostView, MyUserInfo } from "lemmy-js-client";

type Props = {
  postView: PostView;
  hideImage: boolean;
  myUserInfo: MyUserInfo | undefined;
  imageExpanded?: boolean;
  showAdultConsentModal?: boolean;
};
export function PostThumbnail({
  postView,
  hideImage,
  myUserInfo,
  imageExpanded,
  showAdultConsentModal,
}: Props) {
  // Don't show images if adult consent modal should be shown
  if (showAdultConsentModal) {
    return <></>;
  }
  const post = postView.post;
  const url = post.url;
  const thumbnail = post.thumbnail_url;
  const hideImages_ = hideImages(hideImage, myUserInfo);

  if (
    !hideImages_ &&
    url &&
    isImage(url) &&
    !hideAnimatedImage(url, myUserInfo) &&
    thumbnail
  ) {
    // Show expanded full image or thumbnail based on imageExpanded state
    if (imageExpanded) {
      return (
        <ImageLink url={url} myUserInfo={myUserInfo}>
          <PictrsImage
            src={url}
            alt={post.alt_text}
            imageDetails={postView.image_details}
            nsfw={post.nsfw || postView.community.nsfw}
          />
          <Icon
            icon="image"
            small
            classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
          />
        </ImageLink>
      );
    } else {
      return (
        <ImageLink url={url} myUserInfo={myUserInfo}>
          <ImgThumb postView={postView} />
          <Icon
            icon="image"
            small
            classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
          />
        </ImageLink>
      );
    }
  } else if (
    !hideImages_ &&
    url &&
    !hideAnimatedImage(url, myUserInfo) &&
    thumbnail &&
    !isVideo(url)
  ) {
    return (
      <ImageLink url={url} myUserInfo={myUserInfo}>
        <ImgThumb postView={postView} />
        <Icon
          icon="external-link"
          small
          classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
        />
      </ImageLink>
    );
  } else if (url) {
    if ((!hideImages_ && isVideo(url)) || post.embed_video_url) {
      return (
        <ImageLink
          url={url}
          myUserInfo={myUserInfo}
          className={classNames(
            "thumbnail rounded",
            thumbnail
              ? "d-block position-relative"
              : "text-body bg-light d-flex justify-content-center",
          )}
        >
          <ImgThumb postView={postView} />
          <Icon
            icon="video"
            small
            classes={
              thumbnail
                ? "d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
                : "d-flex align-items-center"
            }
          />
        </ImageLink>
      );
    } else {
      return (
        <ImageLink url={url} myUserInfo={myUserInfo} className="text-body">
          <div className="thumbnail rounded bg-light d-flex justify-content-center">
            <Icon
              icon="external-link"
              small
              classes="d-flex align-items-center"
            />
          </div>
        </ImageLink>
      );
    }
  } else {
    return (
      <Link
        className="text-body"
        to={`/post/${post.id}`}
        title={I18NextService.i18n.t("comments")}
        target={linkTarget(myUserInfo)}
      >
        <div className="thumbnail rounded bg-light d-flex justify-content-center">
          <Icon
            icon="message-square"
            small
            classes="d-flex align-items-center"
          />
        </div>
      </Link>
    );
  }
}

/**
 * Wrapper component for image/thumbnail links
 * Centralizes link behavior and attributes for all thumbnail types
 */
type ImageLinkProps = {
  url: string;
  myUserInfo: MyUserInfo | undefined;
  className?: string;
  children: any;
};
function ImageLink({ url, myUserInfo, className, children }: ImageLinkProps) {
  return (
    <a
      className={className ?? "d-block position-relative"}
      href={url}
      rel={relTags}
      title={url}
      target={linkTarget(myUserInfo)}
    >
      {children}
    </a>
  );
}

type ImgThumbProps = {
  postView: PostView;
};
/**
 * Renders a thumbnail only if one exists
 **/
function ImgThumb({ postView }: ImgThumbProps) {
  return postView.post.thumbnail_url ? (
    <PictrsImage
      src={postView.post.thumbnail_url}
      thumbnail
      alt={postView.post.alt_text}
      imageDetails={postView.image_details}
      nsfw={postView.post.nsfw || postView.community.nsfw}
    />
  ) : (
    <></>
  );
}
