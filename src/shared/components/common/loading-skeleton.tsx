import { Component } from "inferno";

interface LoadingSkeletonProps {
  itemCount?: number;
}

interface LoadingSkeletonLineProps {
  size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

class LoadingSkeletonLine extends Component<LoadingSkeletonLineProps, any> {
  render() {
    const className = "placeholder placeholder-lg col-" + this.props.size;
    return (
      <p className="placeholder-glow m-0">
        <span className={`${className} h-100`} />
      </p>
    );
  }
}

export class PostsLoadingSkeleton extends Component<LoadingSkeletonProps, any> {
  render() {
    return Array.from({ length: this.props.itemCount ?? 10 }, (_, index) => (
      <PostsLoadingSkeletonItem key={index} />
    ));
  }
}

class PostThumbnailLoadingSkeleton extends Component<any, any> {
  render() {
    return (
      <div className="thumbnail rounded d-flex justify-content-center placeholder-glow">
        <span className="placeholder placeholder-lg h-100 w-100 rounded" />
      </div>
    );
  }
}

class PostsLoadingSkeletonItem extends Component<any, any> {
  render() {
    return (
      <div className="my-3">
        <div className="col flex-grow-1">
          <div className="row">
            <div className="col flex-grow-0 order-last order-sm-first">
              <PostThumbnailLoadingSkeleton />
            </div>
            <div className="col flex-grow-1">
              <LoadingSkeletonLine size={12} />
              <LoadingSkeletonLine size={8} />
              <LoadingSkeletonLine size={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export class CommentsLoadingSkeleton extends Component<any, any> {
  render() {
    return Array.from({ length: this.props.itemCount ?? 10 }, (_, index) => (
      <CommentsLoadingSkeletonItem key={index} />
    ));
  }
}

class CommentsLoadingSkeletonItem extends Component<any, any> {
  render() {
    return (
      <div className="col flex-grow-1 my-2 p-2">
        <div className="row">
          <div className="col flex-grow-1">
            <LoadingSkeletonLine size={6} />
            <LoadingSkeletonLine size={12} />
            <LoadingSkeletonLine size={7} />
            <LoadingSkeletonLine size={4} />
          </div>
        </div>
      </div>
    );
  }
}
