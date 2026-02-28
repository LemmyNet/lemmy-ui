// @ts-expect-error has a weird import error
import { lazyLoad } from "unlazy";
import Viewer from "viewerjs";
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

type PictrsImageType =
  | "full_size"
  | "thumbnail"
  | "icon"
  | "banner"
  | "icon_under_banner"
  | "card_top";

type Props = {
  src: string;
  type: PictrsImageType;
  alt?: string;
  nsfw?: boolean;
  imageDetails?: ImageDetails;
  viewer?: boolean;
};

type State = {
  src: string;
  viewerjs?: Viewer;
};

function handleImgLoadError(i: PictrsImage) {
  i.setState({
    src: `${getStaticDir()}/assets/images/broken-image-fallback.png`,
  });
}

export class PictrsImage extends Component<Props, State> {
  // TODO this should be a prop
  private readonly isoData: IsoData = setIsoData(this.context);
  private imageRef = createRef<HTMLImageElement>();
  private lazyLoadCleanup: undefined | (() => void);

  state: State = {
    src: this.props.src,
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.src !== this.props.src) {
      this.setState({ src: this.props.src });
    }
  }

  componentDidMount() {
    if (this.imageRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.lazyLoadCleanup = lazyLoad(this.imageRef.current);

      if (this.props.viewer) {
        const viewerjs = new Viewer(this.imageRef.current, {
          title: () => this.alt() ?? undefined,
          url: (image: { src: string }) => viewerJsFullSizeImageUrl(image),
          toolbar: false,
        });
        this.setState({ viewerjs });
      }
    }
  }

  componentWillUnmount() {
    this.lazyLoadCleanup?.();

    if (this.state.viewerjs) {
      this.state.viewerjs.destroy();
    }
  }

  render() {
    const { type, nsfw, imageDetails } = this.props;

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
          <img
            ref={this.imageRef}
            src={base64Placeholder(width, height)}
            data-src={this.src()}
            data-blurhash={imageDetails?.blurhash}
            alt={this.alt()}
            title={this.alt()}
            loading="lazy"
            width={width}
            height={height}
            className={classNames("overflow-hidden pictrs-image", {
              "img-fluid": type !== "icon",
              "thumbnail rounded object-fit-cover": type === "thumbnail",
              "img-expanded slight-radius":
                type !== "thumbnail" && type !== "icon",
              "img-blur": type === "thumbnail" && nsfw,
              "object-fit-cover img-icon me-1": type === "icon",
              "img-blur-icon": type === "icon" && blurImage,
              "img-blur-thumb": type === "thumbnail" && blurImage,
              "ms-2 mb-0 rounded-circle object-fit-cover avatar-overlay avatar-pushup":
                type === "icon_under_banner",
              "card-img-top": type === "card_top",
            })}
            onLoad={() => masonryUpdate()}
            onError={() => handleImgLoadError(this)}
          />
        </picture>
      )
    );
  }

  src(): string {
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
      !url.pathname.includes("/api/v3/image") &&
      !url.pathname.includes("/api/v4/image")
    ) {
      return this.state.src;
    }

    switch (this.props.type) {
      case "thumbnail":
        url.searchParams.set("max_size", thumbnailSize.toString());
        break;
      case "icon":
        url.searchParams.set("max_size", iconThumbnailSize.toString());
        break;
      default:
        url.searchParams.set("max_size", defaultImgSize.toString());
        break;
    }

    return url.href;
  }

  alt(): string {
    switch (this.props.type) {
      case "icon":
      case "banner":
      case "icon_under_banner":
        return "";
      default:
        return this.props.alt || "";
    }
  }

  widthAndHeight(): [number, number] {
    switch (this.props.type) {
      case "icon":
        return [iconThumbnailSize, iconThumbnailSize];
      case "thumbnail":
        return [thumbnailSize, thumbnailSize];
      default:
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

export function viewerJsFullSizeImageUrl(image: { src: string }): string {
  // Remove the max_size params from the image viewer
  const srcUrl = new URL(image.src);
  srcUrl.searchParams.delete("max_size");

  return srcUrl.href;
}
