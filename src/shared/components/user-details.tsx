import { Component, linkEvent } from 'inferno';
import { i18n } from '../i18next';
import {
  PostView,
  CommentView,
  SortType,
  GetUserDetailsResponse,
  UserViewSafe,
} from 'lemmy-js-client';
import { UserDetailsView } from '../interfaces';
import { commentsToFlatNodes, setupTippy } from '../utils';
import { PostListing } from './post-listing';
import { CommentNodes } from './comment-nodes';

interface UserDetailsProps {
  userRes: GetUserDetailsResponse;
  admins: UserViewSafe[];
  page: number;
  limit: number;
  sort: SortType;
  enableDownvotes: boolean;
  enableNsfw: boolean;
  view: UserDetailsView;
  onPageChange(page: number): number | any;
}

interface UserDetailsState {}

enum ItemEnum {
  Comment,
  Post,
}
type ItemType = {
  id: number;
  type_: ItemEnum;
  view: CommentView | PostView;
  published: string;
  score: number;
};

export class UserDetails extends Component<UserDetailsProps, UserDetailsState> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  // TODO needed here?
  componentDidMount() {
    setupTippy();
  }

  // TODO wut?
  // componentDidUpdate(lastProps: UserDetailsProps) {
  //   for (const key of Object.keys(lastProps)) {
  //     if (lastProps[key] !== this.props[key]) {
  //       this.fetchUserData();
  //       break;
  //     }
  //   }
  // }

  render() {
    return (
      <div>
        {this.viewSelector(this.props.view)}
        {this.paginator()}
      </div>
    );
  }

  viewSelector(view: UserDetailsView) {
    if (view === UserDetailsView.Overview || view === UserDetailsView.Saved) {
      return this.overview();
    } else if (view === UserDetailsView.Comments) {
      return this.comments();
    } else if (view === UserDetailsView.Posts) {
      return this.posts();
    } else {
      return null;
    }
  }

  renderItemType(i: ItemType) {
    switch (i.type_) {
      case ItemEnum.Comment:
        let c = i.view as CommentView;
        return (
          <CommentNodes
            key={i.id}
            nodes={[{ comment_view: c }]}
            admins={this.props.admins}
            noBorder
            noIndent
            showCommunity
            showContext
            enableDownvotes={this.props.enableDownvotes}
          />
        );
      case ItemEnum.Post:
        let p = i.view as PostView;
        return (
          <PostListing
            key={i.id}
            post_view={p}
            admins={this.props.admins}
            showCommunity
            enableDownvotes={this.props.enableDownvotes}
            enableNsfw={this.props.enableNsfw}
          />
        );
      default:
        return <div />;
    }
  }

  overview() {
    let id = 0;
    let comments: ItemType[] = this.props.userRes.comments.map(r => ({
      id: id++,
      type_: ItemEnum.Comment,
      view: r,
      published: r.comment.published,
      score: r.counts.score,
    }));
    let posts: ItemType[] = this.props.userRes.posts.map(r => ({
      id: id++,
      type_: ItemEnum.Comment,
      view: r,
      published: r.post.published,
      score: r.counts.score,
    }));

    let combined = [...comments, ...posts];

    // Sort it
    if (this.props.sort === SortType.New) {
      combined.sort((a, b) => b.published.localeCompare(a.published));
    } else {
      combined.sort((a, b) => b.score - a.score);
    }

    return (
      <div>
        {combined.map(i => [this.renderItemType(i), <hr class="my-3" />])}
      </div>
    );
  }

  comments() {
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.props.userRes.comments)}
          admins={this.props.admins}
          noIndent
          showCommunity
          showContext
          enableDownvotes={this.props.enableDownvotes}
        />
      </div>
    );
  }

  posts() {
    return (
      <div>
        {this.props.userRes.posts.map(post => (
          <>
            <PostListing
              post_view={post}
              admins={this.props.admins}
              showCommunity
              enableDownvotes={this.props.enableDownvotes}
              enableNsfw={this.props.enableNsfw}
            />
            <hr class="my-3" />
          </>
        ))}
      </div>
    );
  }

  paginator() {
    return (
      <div class="my-2">
        {this.props.page > 1 && (
          <button
            class="btn btn-secondary mr-1"
            onClick={linkEvent(this, this.prevPage)}
          >
            {i18n.t('prev')}
          </button>
        )}
        {this.props.userRes.comments.length + this.props.userRes.posts.length >
          0 && (
          <button
            class="btn btn-secondary"
            onClick={linkEvent(this, this.nextPage)}
          >
            {i18n.t('next')}
          </button>
        )}
      </div>
    );
  }

  nextPage(i: UserDetails) {
    i.props.onPageChange(i.props.page + 1);
  }

  prevPage(i: UserDetails) {
    i.props.onPageChange(i.props.page - 1);
  }
}
