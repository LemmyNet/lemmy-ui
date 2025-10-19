// @ts-expect-error has a weird import error
import { lazyLoad } from "unlazy";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";

import { setIsoData } from "@utils/app";
import { IsoData } from "@utils/types";
import { getStaticDir } from "@utils/env";
import { masonryUpdate } from "@utils/browser";

const iconThumbnailSize = 96;
const thumbnailSize = 256;

// For some reason, masonry needs a default image size, and will properly size it down
const defaultImgSize = 512;

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
  width?: number;
  height?: number;
  blurhash?: string;
  blurhash_base64?: string;
}

interface PictrsImageState {
  src: string;
}

function handleImgLoadError(i: PictrsImage) {
  i.setState({
    src: `${getStaticDir()}/assets/images/broken-image-fallback.png`,
  });
}

export class PictrsImage extends Component<PictrsImageProps, PictrsImageState> {
  private readonly isoData: IsoData = setIsoData(this.context);

  state: PictrsImageState = {
    src: this.props.src,
  };

  componentDidUpdate(prevProps: PictrsImageProps) {
    if (prevProps.src !== this.props.src) {
      this.setState({ src: this.props.src });
    }
  }

  async componentDidMount() {
    lazyLoad();
  }

  render() {
    const {
      icon,
      iconOverlay,
      banner,
      thumbnail,
      nsfw,
      pushup,
      cardTop,
      blurhash,
      blurhash_base64,
    } = this.props;

    const { src } = this.state;

    const blurImage =
      nsfw &&
      (this.isoData.myUserInfo?.local_user_view.local_user.blur_nsfw ??
        !this.isoData.siteRes.site_view.site.content_warning);

    const [width, height] = this.widthAndHeight();

    // A testable blurhash
    // const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

    // Unlazy recommends you only:
    // - Set src as the server-side-computed blurred image.
    // - Set data-src or data-srcset as the full size image
    // - Set data-blurhash as the blurhash simple string (only if you need to compute it on the front end)
    //
    // More info here:
    // https://unlazy.byjohann.dev/guide/usage.html

    // Don't set the blurhash string if there's a base64, otherwise it will try to compute it in the front end.
    const blurhashString = blurhash_base64 ? undefined : blurhash;

    // Set the src as the blurhash PNG data-url
    const blurhashDataUrl = blurhash_base64
      ? blurhashBase64DataUrlPng(blurhash_base64)
      : undefined;

    return (
      !this.isoData.showAdultConsentModal && (
        <picture>
          <source data-srcset={this.src("webp")} type="image/webp" />
          <source data-srcset={src} />
          <source data-srcset={this.src("jpg")} type="image/jpeg" />
          <img
            src={blurhashDataUrl}
            data-src={src}
            data-blurhash={blurhashString}
            alt={this.alt()}
            title={this.alt()}
            loading="lazy"
            width={width}
            height={height}
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
            onLoad={() => masonryUpdate()}
            onError={linkEvent(this, handleImgLoadError)}
          />
        </picture>
      )
    );
  }

  src(format: string): string {
    // sample url:
    // http://localhost:8535/pictrs/image/file.png?thumbnail=256&format=jpg

    let url: URL | undefined;
    try {
      url = new URL(this.state.src);
    } catch {
      return this.state.src;
    }

    // If there's no match, then it's not a pictrs image
    if (
      !url.pathname.includes("/pictrs/image/") &&
      !url.pathname.includes("/api/v3/image_proxy") &&
      !url.pathname.includes("/api/v4/image/proxy")
    ) {
      return this.state.src;
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

  widthAndHeight(): [number, number] {
    if (this.props.icon) {
      return [iconThumbnailSize, iconThumbnailSize];
    } else if (this.props.thumbnail) {
      return [thumbnailSize, thumbnailSize];
    } else {
      return [
        this.props.width ?? defaultImgSize,
        this.props.height ?? defaultImgSize,
      ];
    }
  }
}

function blurhashBase64DataUrlPng(blurhash_base64: string): string {
  return `data:image/png;base64,${blurhash_base64}`;
}
