import { Component, linkEvent } from "inferno";
import { i18n } from "../i18next";
import {
  PostView,
  CommentView,
  SortType,
  GetPersonDetailsResponse,
  PersonViewSafe,
} from "lemmy-js-client";
import { PersonDetailsView } from "../interfaces";
import { commentsToFlatNodes, setupTippy } from "../utils";
import { PostListing } from "./post-listing";
import { CommentNodes } from "./comment-nodes";

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
            admins={this.props.admins}
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
            admins={this.props.admins}
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
        {this.props.personRes.posts.map(post => (
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
            {i18n.t("prev")}
          </button>
        )}
        {this.props.personRes.comments.length +
          this.props.personRes.posts.length >
          0 && (
          <button
            class="btn btn-secondary"
            onClick={linkEvent(this, this.nextPage)}
          >
            {i18n.t("next")}
          </button>
        )}
      </div>
    );
  }

  nextPage(i: PersonDetails) {
    i.props.onPageChange(i.props.page + 1);
  }

  prevPage(i: PersonDetails) {
    i.props.onPageChange(i.props.page - 1);
  }
}
