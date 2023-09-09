import classNames from "classnames";
import { Component } from "inferno";

import { UserService } from "../../services";

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
}

export class PictrsImage extends Component<PictrsImageProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let user_blur_nsfw = true;
    if (UserService.Instance.myUserInfo) {
      user_blur_nsfw =
        UserService.Instance.myUserInfo?.local_user_view.local_user.blur_nsfw;
    }

    const blur_image = this.props.nsfw && user_blur_nsfw;

    return (
      <picture>
        <source srcSet={this.src("webp")} type="image/webp" />
        <source srcSet={this.props.src} />
        <source srcSet={this.src("jpg")} type="image/jpeg" />
        <img
          src={this.props.src}
          alt={this.alt()}
          title={this.alt()}
          loading="lazy"
          className={classNames("overflow-hidden pictrs-image", {
            "img-fluid": !this.props.icon && !this.props.iconOverlay,
            banner: this.props.banner,
            "thumbnail rounded object-fit-cover":
              this.props.thumbnail && !this.props.icon && !this.props.banner,
            "img-expanded slight-radius":
              !this.props.thumbnail && !this.props.icon,
            "img-blur-icon": this.props.icon && blur_image,
            "img-blur-thumb": this.props.thumbnail && blur_image,
            "object-fit-cover img-icon me-1": this.props.icon,
            "ms-2 mb-0 rounded-circle object-fit-cover avatar-overlay":
              this.props.iconOverlay,
            "avatar-pushup": this.props.pushup,
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
