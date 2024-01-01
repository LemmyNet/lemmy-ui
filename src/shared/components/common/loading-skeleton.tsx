import { Component } from "inferno";

interface PostsLoadingSkeletonProps {
  itemCount: number;
}

export class PostsLoadingSkeleton extends Component<
  PostsLoadingSkeletonProps,
  any
> {
  render() {
    return Array.from({ length: this.props.itemCount }, (_, index) => (
      <PostsLoadingSkeletonItem key={index} />
    ));
  }
}

class PostThumbnailLoadingSkeleton extends Component<any, any> {
  render() {
    return (
      <div className="thumbnail rounded d-flex justify-content-center skeleton-pulse"></div>
    );
  }
}

class PostsLoadingSkeletonItem extends Component<any, any> {
  render() {
    {
      /* TODO: The mobile view*/
    }
    {
      /* The larger view*/
    }
    return (
      <div className="col flex-grow-1 mt-2">
        <div className="row">
          <div className="col flex-grow-0">
            <PostThumbnailLoadingSkeleton />
          </div>
          <div className="col flex-grow-1">
            <div className="col-12 post-line-loading-skeleton skeleton-pulse"></div>
            <div className="col-8 post-line-loading-skeleton skeleton-pulse"></div>
            <div className="col-4 post-line-loading-skeleton skeleton-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
}

interface TrendingCommunitiesLoadingSkeletonProps {
  itemCount: number;
}

export class TrendingCommunitiesLoadingSkeleton extends Component<
  TrendingCommunitiesLoadingSkeletonProps,
  any
> {
  render() {
    return Array.from({ length: this.props.itemCount }, (_, index) => (
      <TrendingCommunitiesLoadingSkeletonItem key={index} />
    ));
  }
}

class TrendingCommunitiesLoadingSkeletonItem extends Component<any, any> {
  render() {
    {
      /* TODO: The mobile view*/
    }
    {
      /* The larger view*/
    }
    return (
      <div className="flex-grow-1 mt-2 col">
        <div className="row">
          <div
            className="col flex-grow-0 post-line-loading-skeleton skeleton-pulse"
            style={{ "border-radius": "100px" }}
          ></div>
          <div className="col flex-grow-1 post-line-loading-skeleton skeleton-pulse"></div>
        </div>
      </div>
    );
  }
}
