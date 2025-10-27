import { Icon } from "@components/common/icon";
import { PictrsImage } from "@components/common/pictrs-image";
import { I18NextService } from "@services/index";
import { linkTarget } from "@utils/app";
import { relTags } from "@utils/config";
import { isImage, isVideo } from "@utils/media";
import classNames from "classnames";
import { Link } from "inferno-router";
import { PostView, MyUserInfo } from "lemmy-js-client";

type Props = {
  postView: PostView;
  hideImage: boolean;
  myUserInfo: MyUserInfo | undefined;
};
export function PostThumbnail({ postView, hideImage, myUserInfo }: Props) {
  const post = postView.post;
  const url = post.url;
  const thumbnail = post.thumbnail_url;

  if (!hideImage && url && isImage(url) && thumbnail) {
    return (
      <a
        className="d-block position-relative"
        href={url}
        rel={relTags}
        title={url}
        target={linkTarget(myUserInfo)}
      >
        <ImgThumb postView={postView} />
        <Icon
          icon="image"
          small
          classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
        />
      </a>
    );
  } else if (!hideImage && url && thumbnail && !isVideo(url)) {
    return (
      <a
        className="d-block position-relative"
        href={url}
        rel={relTags}
        title={url}
        target={linkTarget(myUserInfo)}
      >
        <ImgThumb postView={postView} />
        <Icon
          icon="external-link"
          small
          classes="d-block text-white position-absolute end-0 top-0 mini-overlay text-opacity-75 text-opacity-100-hover"
        />
      </a>
    );
  } else if (url) {
    if ((!hideImage && isVideo(url)) || post.embed_video_url) {
      return (
        <a
          className={classNames(
            "thumbnail rounded",
            thumbnail
              ? "d-block position-relative"
              : "text-body bg-light d-flex justify-content-center",
          )}
          href={url}
          title={url}
          rel={relTags}
          target={linkTarget(myUserInfo)}
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
        </a>
      );
    } else {
      return (
        <a
          className="text-body"
          href={url}
          title={url}
          rel={relTags}
          target={linkTarget(myUserInfo)}
        >
          <div className="thumbnail rounded bg-light d-flex justify-content-center">
            <Icon
              icon="external-link"
              small
              classes="d-flex align-items-center"
            />
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
