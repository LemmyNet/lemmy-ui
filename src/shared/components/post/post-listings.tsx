import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  EditPost,
  FeaturePost,
  Language,
  LockPost,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { PostListing } from "./post-listing";

interface PostListingsProps {
  posts: PostView[];
  allLanguages: Language[];
  siteLanguages: number[];
  showCommunity?: boolean;
  removeDuplicates?: boolean;
  enableDownvotes?: boolean;
  enableNsfw?: boolean;
  viewOnly?: boolean;
  onPostEdit(form: EditPost): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onBlockPerson(form: BlockPerson): void;
  onLockPost(form: LockPost): void;
  onDeletePost(form: DeletePost): void;
  onRemovePost(form: RemovePost): void;
  onSavePost(form: SavePost): void;
  onFeaturePost(form: FeaturePost): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgePost(form: PurgePost): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onTransferCommunity(form: TransferCommunity): void;
}

interface PostListingsState {
  highlightedPost: number;
  isExpanded: boolean;
}

export class PostListings extends Component<
  PostListingsProps,
  PostListingsState
> {
  state: PostListingsState = {
    highlightedPost: 0,
    isExpanded: false,
  };

  duplicatesMap = new Map<number, PostView[]>();

  constructor(props: any, context: any) {
    super(props, context);
    this.handleHighlight = this.handleHighlight.bind(this);
    this.handleKeybinds = this.handleKeybinds.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);
  }

  get posts() {
    return this.props.removeDuplicates
      ? this.removeDuplicates()
      : this.props.posts;
  }

  render() {
    return (
      <div
        className="post-listings"
        onKeyDown={this.handleKeybinds}
        role="menu"
        tabIndex={0}
      >
        {this.posts.length > 0 ? (
          this.posts.map((post_view, idx) => (
            <>
              <PostListing
                idx={idx}
                post_view={post_view}
                crossPosts={this.duplicatesMap.get(post_view.post.id)}
                showCommunity={this.props.showCommunity}
                enableDownvotes={this.props.enableDownvotes}
                enableNsfw={this.props.enableNsfw}
                viewOnly={this.props.viewOnly}
                allLanguages={this.props.allLanguages}
                siteLanguages={this.props.siteLanguages}
                isHighlighted={this.state.highlightedPost == idx}
                isExpanded={this.state.isExpanded}
                onPostEdit={this.props.onPostEdit}
                onPostVote={this.props.onPostVote}
                onPostReport={this.props.onPostReport}
                onBlockPerson={this.props.onBlockPerson}
                onLockPost={this.props.onLockPost}
                onDeletePost={this.props.onDeletePost}
                onRemovePost={this.props.onRemovePost}
                onSavePost={this.props.onSavePost}
                onFeaturePost={this.props.onFeaturePost}
                onPurgePerson={this.props.onPurgePerson}
                onPurgePost={this.props.onPurgePost}
                onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
                onBanPerson={this.props.onBanPerson}
                onAddModToCommunity={this.props.onAddModToCommunity}
                onAddAdmin={this.props.onAddAdmin}
                onTransferCommunity={this.props.onTransferCommunity}
                handleHighlight={this.handleHighlight}
                toggleExpand={this.toggleExpand}
              />
              {idx + 1 !== this.posts.length && <hr className="my-0" />}
            </>
          ))
        ) : (
          <>
            <div>{I18NextService.i18n.t("no_posts")}</div>
            {this.props.showCommunity && (
              <T i18nKey="subscribe_to_communities">
                #<Link to="/communities">#</Link>
              </T>
            )}
          </>
        )}
      </div>
    );
  }

  handleHighlight(postIndex: number | undefined) {
    postIndex != undefined && this.setState({ highlightedPost: postIndex });
  }

  toggleExpand() {
    this.setState({ isExpanded: !this.state.isExpanded });
  }

  handleKeybinds(event: KeyboardEvent) {
    const idx = this.state.highlightedPost;
    if (
      !this.props.viewOnly &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      switch (event.key) {
        case "j": {
          idx + 1 == this.posts.length
            ? window.scrollTo(0, document.body.scrollHeight)
            : this.setState({ highlightedPost: idx + 1 });
          break;
        }
        case "k": {
          idx > 0
            ? this.setState({ highlightedPost: idx - 1 })
            : window.scrollTo(0, 0);
          break;
        }
        case "J": {
          this.setState({ highlightedPost: this.posts.length - 1 });
          window.scrollTo(0, document.body.scrollHeight);
          break;
        }
        case "K": {
          this.setState({ highlightedPost: 0 });
          window.scrollTo(0, 0);
          break;
        }
      }
    }
  }

  removeDuplicates(): PostView[] {
    // Must use a spread to clone the props, because splice will fail below otherwise.
    const posts = [...this.props.posts].filter(empty => empty);

    // A map from post url to list of posts (dupes)
    const urlMap = new Map<string, PostView[]>();

    // Loop over the posts, find ones with same urls
    for (const pv of posts) {
      const url = pv.post.url;
      if (
        !pv.post.deleted &&
        !pv.post.removed &&
        !pv.community.deleted &&
        !pv.community.removed &&
        url
      ) {
        if (!urlMap.get(url)) {
          urlMap.set(url, [pv]);
        } else {
          urlMap.get(url)?.push(pv);
        }
      }
    }

    // Sort by oldest
    // Remove the ones that have no length
    for (const e of urlMap.entries()) {
      if (e[1].length == 1) {
        urlMap.delete(e[0]);
      } else {
        e[1].sort((a, b) => a.post.published.localeCompare(b.post.published));
      }
    }

    for (let i = 0; i < posts.length; i++) {
      const pv = posts[i];
      const url = pv.post.url;
      if (url) {
        const found = urlMap.get(url);
        if (found) {
          // If its the oldest, add
          if (pv.post.id == found[0].post.id) {
            this.duplicatesMap.set(pv.post.id, found.slice(1));
          }
          // Otherwise, delete it
          else {
            posts.splice(i--, 1);
          }
        }
      }
    }

    return posts;
  }
}
