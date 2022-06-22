import { None, Some } from "@sniptt/monads/build";
import { Component } from "inferno";
import {
  CommentView,
  GetPersonDetailsResponse,
  PersonViewSafe,
  PostView,
  SortType,
} from "lemmy-js-client";
import { PersonDetailsView } from "../../interfaces";
import { commentsToFlatNodes, setupTippy } from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { Paginator } from "../common/paginator";
import { PostListing } from "../post/post-listing";

interface PersonDetailsProps {
  personRes: GetPersonDetailsResponse;
  admins: PersonViewSafe[];
  page: number;
  limit: number;
  sort: SortType;
  enableDownvotes: boolean;
  enableNsfw: boolean;
  view: PersonDetailsView;
  onPageChange(page: number): number | any;
}

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

export class PersonDetails extends Component<PersonDetailsProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
  }

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

        <Paginator page={this.props.page} onChange={this.handlePageChange} />
      </div>
    );
  }

  viewSelector(view: PersonDetailsView) {
    if (
      view === PersonDetailsView.Overview ||
      view === PersonDetailsView.Saved
    ) {
      return this.overview();
    } else if (view === PersonDetailsView.Comments) {
      return this.comments();
    } else if (view === PersonDetailsView.Posts) {
      return this.posts();
    } else {
      return null;
    }
  }

  renderItemType(i: ItemType) {
    switch (i.type_) {
      case ItemEnum.Comment: {
        let c = i.view as CommentView;
        return (
          <CommentNodes
            key={i.id}
            nodes={[{ comment_view: c }]}
            admins={Some(this.props.admins)}
            moderators={None}
            maxCommentsShown={None}
            noBorder
            noIndent
            showCommunity
            showContext
            enableDownvotes={this.props.enableDownvotes}
          />
        );
      }
      case ItemEnum.Post: {
        let p = i.view as PostView;
        return (
          <PostListing
            key={i.id}
            post_view={p}
            admins={Some(this.props.admins)}
            duplicates={None}
            moderators={None}
            showCommunity
            enableDownvotes={this.props.enableDownvotes}
            enableNsfw={this.props.enableNsfw}
          />
        );
      }
      default:
        return <div />;
    }
  }

  overview() {
    let id = 0;
    let comments: ItemType[] = this.props.personRes.comments.map(r => ({
      id: id++,
      type_: ItemEnum.Comment,
      view: r,
      published: r.comment.published,
      score: r.counts.score,
    }));
    let posts: ItemType[] = this.props.personRes.posts.map(r => ({
      id: id++,
      type_: ItemEnum.Post,
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
          nodes={commentsToFlatNodes(this.props.personRes.comments)}
          admins={Some(this.props.admins)}
          moderators={None}
          maxCommentsShown={None}
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
        {this.props.personRes.posts.map(post => (
          <>
            <PostListing
              post_view={post}
              admins={Some(this.props.admins)}
              showCommunity
              duplicates={None}
              moderators={None}
              enableDownvotes={this.props.enableDownvotes}
              enableNsfw={this.props.enableNsfw}
            />
            <hr class="my-3" />
          </>
        ))}
      </div>
    );
  }

  handlePageChange(val: number) {
    this.props.onPageChange(val);
  }
}
