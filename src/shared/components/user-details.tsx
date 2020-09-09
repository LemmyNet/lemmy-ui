import { Component, linkEvent } from 'inferno';
import { i18n } from '../i18next';
import { Post, Comment, SortType, UserDetailsResponse } from 'lemmy-js-client';
import { UserDetailsView } from '../interfaces';
import { commentsToFlatNodes, setupTippy } from '../utils';
import { PostListing } from './post-listing';
import { CommentNodes } from './comment-nodes';

interface UserDetailsProps {
  userRes: UserDetailsResponse;
  page: number;
  limit: number;
  sort: SortType;
  enableDownvotes: boolean;
  enableNsfw: boolean;
  view: UserDetailsView;
  onPageChange(page: number): number | any;
}

interface UserDetailsState {}

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

  overview() {
    const comments = this.props.userRes.comments.map((c: Comment) => {
      return { type: 'comments', data: c };
    });
    const posts = this.props.userRes.posts.map((p: Post) => {
      return { type: 'posts', data: p };
    });

    const combined: { type: string; data: Comment | Post }[] = [
      ...comments,
      ...posts,
    ];

    // Sort it
    if (this.props.sort === SortType.New) {
      combined.sort((a, b) => b.data.published.localeCompare(a.data.published));
    } else {
      combined.sort((a, b) => b.data.score - a.data.score);
    }

    return (
      <div>
        {combined.map(i => (
          <>
            <div>
              {i.type === 'posts' ? (
                <PostListing
                  key={(i.data as Post).id}
                  post={i.data as Post}
                  admins={this.props.userRes.admins}
                  showCommunity
                  enableDownvotes={this.props.enableDownvotes}
                  enableNsfw={this.props.enableNsfw}
                />
              ) : (
                <CommentNodes
                  key={(i.data as Comment).id}
                  nodes={[{ comment: i.data as Comment }]}
                  admins={this.props.userRes.admins}
                  noBorder
                  noIndent
                  showCommunity
                  showContext
                  enableDownvotes={this.props.enableDownvotes}
                />
              )}
            </div>
            <hr class="my-3" />
          </>
        ))}
      </div>
    );
  }

  comments() {
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.props.userRes.comments)}
          admins={this.props.userRes.admins}
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
              post={post}
              admins={this.props.userRes.admins}
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
