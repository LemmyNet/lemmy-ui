// @ts-expect-error has a weird import error
import { lazyLoad } from "unlazy";
import classNames from "classnames";
import { Component } from "inferno";

import { setIsoData } from "@utils/app";
import { IsoData } from "@utils/types";
import { getStaticDir } from "@utils/env";
import { masonryUpdate } from "@utils/browser";
import { ImageDetails } from "lemmy-js-client";
import { createRef } from "inferno";

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
  imageDetails?: ImageDetails;
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
  private imageRef = createRef<HTMLImageElement>();
  private lazyLoadCleanup: undefined | (() => void);

  state: PictrsImageState = {
    src: this.props.src,
  };

  componentDidUpdate(prevProps: PictrsImageProps) {
    if (prevProps.src !== this.props.src) {
      this.setState({ src: this.props.src });
    }
  }

  componentDidMount() {
    if (this.imageRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.lazyLoadCleanup = lazyLoad(this.imageRef.current);
    }
  }

  componentWillUnmount() {
    this.lazyLoadCleanup?.();
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
      imageDetails,
    } = this.props;

    const { src } = this.state;

    const blurImage =
      nsfw &&
      (this.isoData.myUserInfo?.local_user_view.local_user.blur_nsfw ??
        !this.isoData.siteRes.site_view.site.content_warning);

    const [width, height] = this.widthAndHeight();

    // Unlazy recommends you manually set the src to the blurred image.
    // https://unlazy.byjohann.dev/guide/usage.html
    //
    // A testable blurhash
    // const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

    return (
      !this.isoData.showAdultConsentModal && (
        <picture>
          <source data-srcset={this.src("webp")} type="image/webp" />
          <source data-srcset={src} />
          <source data-srcset={this.src("jpg")} type="image/jpeg" />
          <img
            ref={this.imageRef}
            src={base64Placeholder(width, height)}
            data-src={src}
            data-blurhash={imageDetails?.blurhash}
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
            onError={() => handleImgLoadError(this)}
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
        this.props.imageDetails?.width ?? defaultImgSize,
        this.props.imageDetails?.height ?? defaultImgSize,
      ];
    }
  }
}
function base64Placeholder(width: number = 32, height: number = 32) {
  return `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3e%3c/svg%3e`;
}
