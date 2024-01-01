import { Component } from "inferno";

interface LoadingSkeletonProps {
  itemCount: number;
}

export class LoadingPostsSkeleton extends Component<LoadingSkeletonProps, any> {
  render() {
    return Array.from({ length: this.props.itemCount }, (_, index) => (
      <LoadingPostsSkeletonItem key={index} />
    ));
  }
}

class ThumbnailLoadingSkeleton extends Component<any, any> {
  render() {
    return (
      <div className="thumbnail rounded d-flex justify-content-center skeleton-pulse"></div>
    );
  }
}

class LoadingPostsSkeletonItem extends Component<any, any> {
  render() {
    {
      /* TODO: The mobile view*/
    }
    {
      /* The larger view*/
    }
    return (
      <div className="mt-2">
        <div className="d-none d-sm-block">
          <div className="col flex-grow-1">
            <div className="row">
              <div className="col flex-grow-0">
                <ThumbnailLoadingSkeleton />
              </div>
              <div className="col flex-grow-1">
                <div className="col-12 post-line-loading-skeleton skeleton-pulse"></div>
                <div className="col-8 post-line-loading-skeleton skeleton-pulse"></div>
                <div className="col-4 post-line-loading-skeleton skeleton-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
