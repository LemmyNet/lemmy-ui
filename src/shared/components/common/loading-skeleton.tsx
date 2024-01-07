import { setIsoData } from "@utils/app";
import dataBsTheme from "@utils/browser/data-bs-theme";
import { Component } from "inferno";

interface LoadingSkeletonProps {
  itemCount?: number;
}

interface LoadingSkeletonItemProps {
  theme: string;
}

export class PostsLoadingSkeleton extends Component<LoadingSkeletonProps, any> {
  private theme: string = dataBsTheme(setIsoData(this.context).site_res);

  render() {
    return Array.from({ length: this.props.itemCount ?? 10 }, (_, index) => (
      <PostsLoadingSkeletonItem key={index} theme={this.theme} />
    ));
  }
}

class PostThumbnailLoadingSkeleton extends Component<
  LoadingSkeletonItemProps,
  any
> {
  render() {
    return (
      <div
        className="thumbnail rounded d-flex justify-content-center skeleton-pulse"
        data-bs-theme={this.props.theme}
      ></div>
    );
  }
}

class PostsLoadingSkeletonItem extends Component<
  LoadingSkeletonItemProps,
  any
> {
  render() {
    return (
      <>
        {/* mobile */}
        <div className="d-block d-sm-none">
          <div className="col flex-grow-1 mt-2">
            <div className="row">
              <div className="col flex-grow-1">
                <div
                  className="col-12 post-line-loading-skeleton skeleton-pulse"
                  data-bs-theme={this.props.theme}
                ></div>
                <div
                  className="col-8 post-line-loading-skeleton skeleton-pulse"
                  data-bs-theme={this.props.theme}
                ></div>
                <div
                  className="col-6 post-line-loading-skeleton skeleton-pulse"
                  data-bs-theme={this.props.theme}
                ></div>
              </div>
              <div className="col flex-grow-0">
                <PostThumbnailLoadingSkeleton theme={this.props.theme} />
              </div>
            </div>
          </div>
        </div>
        {/* desktop */}
        <div className="d-none d-sm-block">
          <div className="col flex-grow-1 mt-2">
            <div className="row">
              <div className="col flex-grow-0">
                <PostThumbnailLoadingSkeleton theme={this.props.theme} />
              </div>
              <div className="col flex-grow-1">
                <div
                  className="col-12 post-line-loading-skeleton skeleton-pulse"
                  data-bs-theme={this.props.theme}
                ></div>
                <div
                  className="col-8 post-line-loading-skeleton skeleton-pulse"
                  data-bs-theme={this.props.theme}
                ></div>
                <div
                  className="col-4 post-line-loading-skeleton skeleton-pulse"
                  data-bs-theme={this.props.theme}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export class TrendingCommunitiesLoadingSkeleton extends Component<
  LoadingSkeletonProps,
  any
> {
  private theme: string = dataBsTheme(setIsoData(this.context).site_res);

  render() {
    return (
      <div className="mb-2">
        {Array.from({ length: this.props.itemCount ?? 10 }, (_, index) => (
          <TrendingCommunitiesLoadingSkeletonItem
            key={index}
            theme={this.theme}
          />
        ))}
      </div>
    );
  }
}

class TrendingCommunitiesLoadingSkeletonItem extends Component<
  LoadingSkeletonItemProps,
  any
> {
  render() {
    return (
      <div
        className="col flex-grow-1 mt-2"
        style={{
          "padding-left": "calc(var(--bs-gutter-x) *0.5)",
          "padding-right": "calc(var(--bs-gutter-x) * 1)",
        }}
      >
        <div className="row">
          <div className="col flex-grow-0" style={{ "padding-right": "0px" }}>
            <div
              className="trending-community-icon-skeleton d-flex skeleton-pulse"
              data-bs-theme={this.props.theme}
            ></div>
          </div>
          <div className="col flex-grow-1" style={{ "padding-right": "0px" }}>
            <div
              className="col-12 post-line-loading-skeleton skeleton-pulse"
              data-bs-theme={this.props.theme}
            ></div>
          </div>
        </div>
      </div>
    );
  }
}

export class CommentsLoadingSkeleton extends Component<
  LoadingSkeletonProps,
  any
> {
  private theme: string = dataBsTheme(setIsoData(this.context).site_res);

  render() {
    return Array.from({ length: this.props.itemCount ?? 10 }, (_, index) => (
      <CommentsLoadingSkeletonItem key={index} theme={this.theme} />
    ));
  }
}

class CommentsLoadingSkeletonItem extends Component<
  LoadingSkeletonItemProps,
  any
> {
  render() {
    return (
      <div className="col flex-grow-1 my-2 p-2">
        <div className="row">
          <div className="col flex-grow-1">
            <div
              className="col-6 post-line-loading-skeleton skeleton-pulse"
              data-bs-theme={this.props.theme}
            ></div>
            <div
              className="col-12 post-line-loading-skeleton skeleton-pulse"
              data-bs-theme={this.props.theme}
            ></div>
            <div
              className="col-7 post-line-loading-skeleton skeleton-pulse"
              data-bs-theme={this.props.theme}
            ></div>
            <div
              className="col-4 post-line-loading-skeleton skeleton-pulse"
              data-bs-theme={this.props.theme}
            ></div>
          </div>
        </div>
      </div>
    );
  }
}
