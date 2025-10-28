import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  EditPost,
  FeaturePost,
  HidePost,
  Language,
  LanguageId,
  LocalSite,
  LockPost,
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PersonView,
  PostListingMode,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { PostListing } from "./post-listing";
import { ShowCrossPostsType } from "@utils/types";

interface PostListingsProps {
  posts: PostView[];
  allLanguages: Language[];
  siteLanguages: LanguageId[];
  showCommunity: boolean;
  showCrossPosts: ShowCrossPostsType;
  markable: boolean;
  enableNsfw: boolean;
  showAdultConsentModal: boolean;
  viewOnly: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  postListingMode: PostListingMode;
  onPostEdit(form: EditPost): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onBlockPerson(form: BlockPerson): void;
  onBlockCommunity(form: BlockCommunity): void;
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
  onMarkPostAsRead(form: MarkPostAsRead): void;
  onHidePost(form: HidePost): void;
  onPersonNote(form: NotePerson): void;
  onScrollIntoCommentsClick(): void;
}

export class PostListings extends Component<PostListingsProps, any> {
  duplicatesMap = new Map<number, PostView[]>();

  constructor(props: any, context: any) {
    super(props, context);
  }

  get posts() {
    return this.props.showCrossPosts !== "show_separately"
      ? this.removeDuplicates()
      : this.props.posts;
  }

  render() {
    return (
      <div className="post-listings">
        {this.posts.length > 0 ? (
          <div className="row post-listings-grid">
            {this.posts.map((postView, idx) => (
              <div className={postListingModeCols(this.props.postListingMode)}>
                <PostListing
                  postView={postView}
                  crossPosts={this.duplicatesMap.get(postView.post.id) ?? []}
                  showCrossPosts={this.props.showCrossPosts}
                  showCommunity={this.props.showCommunity}
                  enableNsfw={this.props.enableNsfw}
                  showAdultConsentModal={this.props.showAdultConsentModal}
                  viewOnly={this.props.viewOnly}
                  allLanguages={this.props.allLanguages}
                  siteLanguages={this.props.siteLanguages}
                  myUserInfo={this.props.myUserInfo}
                  localSite={this.props.localSite}
                  admins={this.props.admins}
                  showBody={"preview"}
                  hideImage={false}
                  disableAutoMarkAsRead={false}
                  editLoading={false}
                  onPostEdit={this.props.onPostEdit}
                  onPostVote={this.props.onPostVote}
                  onPostReport={this.props.onPostReport}
                  onBlockPerson={this.props.onBlockPerson}
                  onBlockCommunity={this.props.onBlockCommunity}
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
                  onHidePost={this.props.onHidePost}
                  markable={this.props.markable}
                  onMarkPostAsRead={this.props.onMarkPostAsRead}
                  onPersonNote={this.props.onPersonNote}
                  postListingMode={this.props.postListingMode}
                  onScrollIntoCommentsClick={
                    this.props.onScrollIntoCommentsClick
                  }
                />
                {idx + 1 !== this.posts.length && <hr className="my-3" />}
              </div>
            ))}
          </div>
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
      if (e[1].length === 1) {
        urlMap.delete(e[0]);
      } else {
        e[1].sort((a, b) =>
          a.post.published_at.localeCompare(b.post.published_at),
        );
      }
    }

    for (let i = 0; i < posts.length; i++) {
      const pv = posts[i];
      const url = pv.post.url;
      if (url) {
        const found = urlMap.get(url);
        if (found) {
          // If its the oldest, add
          if (pv.post.id === found[0].post.id) {
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

function postListingModeCols(mode: PostListingMode): string {
  switch (mode) {
    case "list":
      return "col-12";
    case "card":
    case "small_card":
      return "col-12 col-md-6";
  }
}
