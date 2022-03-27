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
  placeholder?: boolean;
}

export class PictrsImage extends Component<PictrsImageProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  getClassNames() {
    return classNames({
      "img-fluid": !this.props.icon && !this.props.iconOverlay,
      banner: this.props.banner,
      "thumbnail rounded":
        this.props.thumbnail && !this.props.icon && !this.props.banner,
      "img-expanded slight-radius": !this.props.thumbnail && !this.props.icon,
      "img-blur": this.props.thumbnail && this.props.nsfw,
      "rounded-circle img-icon mr-2": this.props.icon,
      "ml-2 mb-0 rounded-circle avatar-overlay": this.props.iconOverlay,
      "avatar-pushup": this.props.pushup,
      "img-placeholder": this.props.placeholder,
    });
  }

  render() {
    if (this.props.placeholder) {
      return <div className={this.getClassNames()} />;
    } else {
      return (
        <picture>
          <source srcSet={this.src("webp")} type="image/webp" />
          <source srcSet={this.props.src} />
          <source srcSet={this.src("jpg")} type="image/jpeg" />
          <img
            src={this.props.src}
            alt={this.alt()}
            loading="lazy"
            className={this.getClassNames()}
          />
        </picture>
      );
    }
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
    }

    let paramsStr = new URLSearchParams(params).toString();
    let out = `${host}/pictrs/image/${path}?${paramsStr}`;

    return out;
  }

  alt(): string {
    if (this.props.icon) {
      return "";
    }
    return this.props.alt || "";
  }
}
