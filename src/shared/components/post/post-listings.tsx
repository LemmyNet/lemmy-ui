import { None, Some } from "@sniptt/monads";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { PostView } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { PostListing } from "./post-listing";

interface PostListingsProps {
  posts: PostView[];
  showCommunity?: boolean;
  removeDuplicates?: boolean;
  enableDownvotes: boolean;
  enableNsfw: boolean;
}

export class PostListings extends Component<PostListingsProps, any> {
  duplicatesMap = new Map<number, PostView[]>();

  constructor(props: any, context: any) {
    super(props, context);
  }

  get posts() {
    return this.props.removeDuplicates
      ? this.removeDuplicates()
      : this.props.posts;
  }

  render() {
    return (
      <div>
        {this.posts.length > 0 ? (
          this.posts.map(post_view => (
            <>
              <PostListing
                post_view={post_view}
                duplicates={Some(this.duplicatesMap.get(post_view.post.id))}
                moderators={None}
                admins={None}
                showCommunity={this.props.showCommunity}
                enableDownvotes={this.props.enableDownvotes}
                enableNsfw={this.props.enableNsfw}
              />
              <hr class="my-3" />
            </>
          ))
        ) : (
          <>
            <div>{i18n.t("no_posts")}</div>
            {this.props.showCommunity !== undefined && (
              <T i18nKey="subscribe_to_communities">
                #<Link to="/communities">#</Link>
              </T>
            )}
          </>
        )}
      </div>
    );
  }

  removeDuplicates(): PostView[] {
    // Must use a spread to clone the props, because splice will fail below otherwise.
    let posts = [...this.props.posts];

    // A map from post url to list of posts (dupes)
    let urlMap = new Map<string, PostView[]>();

    // Loop over the posts, find ones with same urls
    for (let pv of posts) {
      if (
        pv.post.url &&
        !pv.post.deleted &&
        !pv.post.removed &&
        !pv.community.deleted &&
        !pv.community.removed
      ) {
        if (!urlMap.get(pv.post.url)) {
          urlMap.set(pv.post.url, [pv]);
        } else {
          urlMap.get(pv.post.url).push(pv);
        }
      }
    }

    // Sort by oldest
    // Remove the ones that have no length
    for (let e of urlMap.entries()) {
      if (e[1].length == 1) {
        urlMap.delete(e[0]);
      } else {
        e[1].sort((a, b) => a.post.published.localeCompare(b.post.published));
      }
    }

    for (let i = 0; i < posts.length; i++) {
      let pv = posts[i];
      if (pv.post.url) {
        let found = urlMap.get(pv.post.url);
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
