import classNames from "classnames";
import { Component } from "inferno";

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
    if (this.props.src.endsWith("webm")) {
      return (
        <video
          poster={this.src("png")}
          autoPlay
          loop
          muted
          className={classNames("overflow-hidden pictrs-image", {
            "img-fluid": !this.props.icon && !this.props.iconOverlay,
            banner: this.props.banner,
            "thumbnail rounded object-fit-cover":
              this.props.thumbnail && !this.props.icon && !this.props.banner,
            "img-expanded slight-radius":
              !this.props.thumbnail && !this.props.icon,
            "img-blur": this.props.thumbnail && this.props.nsfw,
            "object-fit-cover img-icon me-1": this.props.icon,
            "ms-2 mb-0 rounded-circle object-fit-cover avatar-overlay":
              this.props.iconOverlay,
            "avatar-pushup": this.props.pushup,
          })}
        >
          <source src={this.props.src} type="video/webm" />
          <img
            src={this.src("png")}
            alt={this.alt()}
            title="Unable to play webm video, your browser does not support it"
            loading="lazy"
          />
        </video>
      );
    } else {
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
              "object-fit-cover img-icon me-1": this.props.icon,
              "ms-2 mb-0 rounded-circle object-fit-cover avatar-overlay":
                this.props.iconOverlay,
              "avatar-pushup": this.props.pushup,
            })}
          />
        </picture>
      );
    }
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
