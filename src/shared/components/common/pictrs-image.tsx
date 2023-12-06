import classNames from "classnames";
import { Component } from "inferno";
import { MyUserInfo } from "lemmy-js-client";

const iconThumbnailSize = 96;
const thumbnailSize = 256;

interface PictrsImageProps {
  src: string;
  alt?: string;
  icon?: boolean;
  banner?: boolean;
  thumbnail?: boolean;
  nsfw?: boolean;
  iconOverlay?: boolean;
  pushup?: boolean;
  cardTop?: boolean;
  myUserInfo?: MyUserInfo;
}

export class PictrsImage extends Component<PictrsImageProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { src, icon, iconOverlay, banner, thumbnail, nsfw, pushup, cardTop } =
      this.props;
    let user_blur_nsfw = true;
    if (this.props.myUserInfo) {
      user_blur_nsfw =
        this.props.myUserInfo?.local_user_view.local_user.blur_nsfw;
    }

    const blur_image = nsfw && user_blur_nsfw;

    return (
      <picture>
        <source srcSet={this.src("webp")} type="image/webp" />
        <source srcSet={src} />
        <source srcSet={this.src("jpg")} type="image/jpeg" />
        <img
          src={src}
          alt={this.alt()}
          title={this.alt()}
          loading="lazy"
          className={classNames("overflow-hidden pictrs-image", {
            "img-fluid": !(icon || iconOverlay),
            banner,
            "thumbnail rounded object-fit-cover":
              thumbnail && !(icon || banner),
            "img-expanded slight-radius": !(thumbnail || icon),
            "img-blur": thumbnail && nsfw,
            "object-fit-cover img-icon me-1": icon,
            "img-blur-icon": icon && blur_image,
            "img-blur-thumb": thumbnail && blur_image,
            "ms-2 mb-0 rounded-circle object-fit-cover avatar-overlay":
              iconOverlay,
            "avatar-pushup": pushup,
            "card-img-top": cardTop,
          })}
        />
      </picture>
    );
  }

  src(format: string): string {
    // sample url:
    // http://localhost:8535/pictrs/image/file.png?thumbnail=256&format=jpg

    const split = this.props.src.split("/pictrs/image/");

    // If theres not multiple, then its not a pictrs image
    if (split.length === 1) {
      return this.props.src;
    }

    const host = split[0];
    const path = split[1];

    const params = { format };

    if (this.props.thumbnail) {
      params["thumbnail"] = thumbnailSize;
    } else if (this.props.icon) {
      params["thumbnail"] = iconThumbnailSize;
    }

    const paramsStr = new URLSearchParams(params).toString();
    const out = `${host}/pictrs/image/${path}?${paramsStr}`;

    return out;
  }

  alt(): string {
    if (this.props.icon) {
      return "";
    }
    return this.props.alt || "";
  }
}
