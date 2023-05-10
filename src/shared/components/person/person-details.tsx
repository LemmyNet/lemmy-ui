import { Component } from "inferno";
import { CommentView } from "lemmy-js-client/dist/types/CommentView";
import { GetPersonDetailsResponse } from "lemmy-js-client/dist/types/GetPersonDetailsResponse";
import { Language } from "lemmy-js-client/dist/types/Language";
import { PersonView } from "lemmy-js-client/dist/types/PersonView";
import { PostView } from "lemmy-js-client/dist/types/PostView";
import { SortType } from "lemmy-js-client/dist/types/SortType";
import { CommentViewType, PersonDetailsView } from "../../interfaces";
import { commentsToFlatNodes, setupTippy } from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { Paginator } from "../common/paginator";
import { PostListing } from "../post/post-listing";

interface PersonDetailsProps {
  personRes: GetPersonDetailsResponse;
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  page: bigint;
  limit: bigint;
  sort: SortType;
  enableDownvotes: boolean;
  enableNsfw: boolean;
  view: PersonDetailsView;
  onPageChange(page: bigint): bigint | any;
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
  score: bigint;
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
            nodes={[{ comment_view: c, children: [], depth: 0 }]}
            viewType={CommentViewType.Flat}
            admins={this.props.admins}
            noBorder
            noIndent
            showCommunity
            showContext
            enableDownvotes={this.props.enableDownvotes}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
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
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
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
    if (this.props.sort === "New") {
      combined.sort((a, b) => b.published.localeCompare(a.published));
    } else {
      combined.sort((a, b) => Number(b.score - a.score));
    }

    return (
      <div>
        {combined.map(i => [
          this.renderItemType(i),
          <hr key={i.type_} className="my-3" />,
        ])}
      </div>
    );
  }

  comments() {
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.props.personRes.comments)}
          viewType={CommentViewType.Flat}
          admins={this.props.admins}
          noIndent
          showCommunity
          showContext
          enableDownvotes={this.props.enableDownvotes}
          allLanguages={this.props.allLanguages}
          siteLanguages={this.props.siteLanguages}
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
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
            />
            <hr className="my-3" />
          </>
        ))}
      </div>
    );
  }

  handlePageChange(val: bigint) {
    this.props.onPageChange(val);
  }
}
