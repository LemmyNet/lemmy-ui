import classNames from "classnames";
import { Component } from "inferno";

import { setIsoData } from "@utils/app";
import { IsoDataOptionalSite } from "shared/interfaces";
import { shouldBlurNsfw } from "@utils/helpers";

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
}

export class PictrsImage extends Component<PictrsImageProps, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const { src, icon, iconOverlay, banner, thumbnail, nsfw, pushup, cardTop } =
      this.props;

    const blurImage = nsfw && shouldBlurNsfw(this.isoData.site_res);

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
            "img-blur-icon": icon && blurImage,
            "img-blur-thumb": thumbnail && blurImage,
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

    let url: URL | undefined;
    try {
      url = new URL(this.props.src);
    } catch {
      return this.props.src;
    }

    // If there's no match, then it's not a pictrs image
    if (!url.pathname.includes("/pictrs/image/")) {
      return this.props.src;
    }

    // Keeps original search params. Could probably do `url.search = ""` here.

    url.searchParams.set("format", format);

    if (this.props.thumbnail) {
      url.searchParams.set("thumbnail", thumbnailSize.toString());
    } else if (this.props.icon) {
      url.searchParams.set("thumbnail", iconThumbnailSize.toString());
    } else {
      url.searchParams.delete("thumbnail");
    }

    return url.href;
  }

  alt(): string {
    if (this.props.icon) {
      return "";
    }
    return this.props.alt || "";
  }
}
