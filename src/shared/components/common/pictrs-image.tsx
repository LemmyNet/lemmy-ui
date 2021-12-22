import { Component } from "inferno";

const iconThumbnailSize = 96;
const thumbnailSize = 256;
const maxImageSize = 3000;

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
    return (
      <picture>
        <source srcSet={this.src("webp")} type="image/webp" />
        <source srcSet={this.src("jpg")} type="image/jpeg" />
        <img
          src={this.src("jpg")}
          alt={this.alt()}
          loading="lazy"
          className={`
        ${!this.props.icon && !this.props.iconOverlay && "img-fluid "}
        ${this.props.banner && "banner "}
        ${
          this.props.thumbnail && !this.props.icon && !this.props.banner
            ? "thumbnail rounded "
            : "img-expanded "
        }
        ${this.props.thumbnail && this.props.nsfw && "img-blur "}
        ${this.props.icon && "rounded-circle img-icon mr-2 "}
        ${this.props.iconOverlay && "ml-2 mb-0 rounded-circle avatar-overlay "}
        ${this.props.pushup && "avatar-pushup "}
        `}
        />
      </picture>
    );
  }

  src(format: string): string {
    // sample url:
    // http://localhost:8535/pictrs/image/file.png?thumbnail=256&format=jpg

    let split = this.props.src.split("/pictrs/image/");

    // If theres not multiple, then its not a pictrs image
    if (split.length == 1) {
      return this.props.src;
    }

    let host = split[0];
    let path = split[1];

    let params = { format };

    if (this.props.thumbnail) {
      params["thumbnail"] = thumbnailSize;
    } else if (this.props.icon) {
      params["thumbnail"] = iconThumbnailSize;
    } else {
      params["thumbnail"] = maxImageSize;
    }

    let paramsStr = `?${new URLSearchParams(params).toString()}`;
    let out = `${host}/pictrs/image/${path}${paramsStr}`;

    return out;
  }

  alt(): string {
    if (this.props.icon) {
      return "";
    }
    return this.props.alt || "";
  }
}
