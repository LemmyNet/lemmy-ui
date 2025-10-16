import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { decodeBlurHash } from "fast-blurhash";

import { setIsoData } from "@utils/app";
import { IsoData } from "@utils/types";
import { getStaticDir } from "@utils/env";
import { isBrowser } from "@utils/browser";

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

  render() {
    const {
      icon,
      iconOverlay,
      banner,
      thumbnail,
      nsfw,
      pushup,
      cardTop,
      // blurhash,
    } = this.props;

    const { src } = this.state;

    const blurImage =
      nsfw &&
      (this.isoData.myUserInfo?.local_user_view.local_user.blur_nsfw ??
        !this.isoData.siteRes.site_view.site.content_warning);

    const [width, height] = this.widthAndHeight();

    const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
    const blurHashBase64 = blurhash
      ? computeBlurHashBase64(blurhash, width, height)
      : undefined;

    return (
      !this.isoData.showAdultConsentModal && (
        <picture>
          <source srcSet={this.src("webp")} type="image/webp" />
          <source srcSet={src} />
          <source srcSet={this.src("jpg")} type="image/jpeg" />
          <img
            src={src}
            alt={this.alt()}
            title={this.alt()}
            loading="lazy"
            width={width}
            height={height}
            style={{
              "background-image": `url(${blurHashBase64})`,
              "background-repeat": "no-repeat",
              "background-size": "cover",
              "background-position": "center",
            }}
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

function computeBlurHashBase64(
  blurhash: string,
  width: number,
  height: number,
): string | undefined {
  let canvas: HTMLCanvasElement | undefined;
  if (isBrowser()) {
    const pixels = decodeBlurHash(blurhash, width, height);
    canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const imageData = ctx!.createImageData(width, height);
    imageData.data.set(pixels);
    ctx!.putImageData(imageData, 0, 0);
  }
  return canvas?.toDataURL();
}
