import {
  commentsToFlatNodes,
  editComment,
  editPersonNotes,
  editPost,
  enableNsfw,
  getDataTypeString,
  mixedToCommentSortType,
  mixedToPostSortType,
  myAuth,
  setIsoData,
  showLocal,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  cursorComponents,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import type {
  DirectionalCursor,
  QueryParams,
  StringBoolean,
} from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { NoOptionI18nKeys } from "i18next";
import { Component, InfernoNode, MouseEventHandler, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  CommentResponse,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditPost,
  FeaturePost,
  GetComments,
  GetCommentsResponse,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  HidePost,
  LemmyHttp,
  ListingType,
  LockPost,
  PostResponse,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  PostSortType,
  SuccessResponse,
  TransferCommunity,
  CommentSortType,
  MyUserInfo,
  MarkPostAsRead,
  NotePerson,
  LockComment,
  BlockCommunity,
  PostListingMode,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
import { CommentViewType, DataType, InitialFetchRequest } from "@utils/types";
import { mdToHtml } from "@utils/markdown";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";
import { toast } from "@utils/app";
import { CommentNodes } from "../comment/comment-nodes";
import { DataTypeSelect } from "../common/data-type-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { CommentSortSelect, PostSortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PostListings } from "../post/post-listings";
import { SiteSidebar } from "./site-sidebar";
import { PaginatorCursor } from "../common/paginator-cursor";
import { getHttpBaseInternal } from "../../utils/env";
import {
  CommentsLoadingSkeleton,
  PostsLoadingSkeleton,
} from "../common/loading-skeleton";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import PostHiddenSelect from "../common/post-hidden-select";
import { isBrowser } from "@utils/browser";
import { DonationDialog } from "./donation-dialog";
import { nowBoolean } from "@utils/date";
import { TimeIntervalSelect } from "@components/common/time-interval-select";
import { BannedDialog } from "./banned-dialog";
import { PostListingModeSelect } from "@components/common/post-listing-mode-select";

interface HomeState {
  postsRes: RequestState<GetPostsResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  showSubscribedMobile: boolean;
  showSidebarMobile: boolean;
  subscribedCollapsed: boolean;
  tagline?: string;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
  markPageAsReadLoading: boolean;
  postListingMode: PostListingMode;
}

interface HomeProps {
  listingType?: ListingType;
  dataType: DataType;
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
  cursor?: DirectionalCursor;
  showHidden?: StringBoolean;
}

type HomeData = RouteDataResponse<{
  postsRes: GetPostsResponse;
  commentsRes: GetCommentsResponse;
}>;

function getRss(listingType: ListingType, sort: PostSortType) {
  let rss: string | undefined = undefined;

  const queryString = getQueryString({ sort });
  switch (listingType) {
    case "All": {
      rss = "/feeds/all.xml" + queryString;
      break;
    }
    case "Local": {
      rss = "/feeds/local.xml" + queryString;
      break;
    }
    case "Subscribed": {
      const auth = myAuth();
      rss = auth ? `/feeds/front/${auth}.xml${queryString}` : undefined;
      break;
    }
  }

  return (
    rss && (
      <>
        <a href={rss} rel={relTags} title="RSS">
          <Icon icon="rss" classes="text-muted small" />
        </a>
        <link rel="alternate" type="application/atom+xml" href={rss} />
      </>
    )
  );
}

function getDataTypeFromQuery(type?: string): DataType {
  return type ? DataType[type] : DataType.Post;
}

function getListingTypeFromQuery(
  type: string | undefined,
  fallback: ListingType,
): ListingType {
  return type ? (type as ListingType) : fallback;
}

function getSortTypeFromQuery(
  type: string | undefined,
  fallback: PostSortType | CommentSortType,
): PostSortType {
  return type ? (type as PostSortType | CommentSortType) : fallback;
}

function getPostTimeRangeFromQuery(
  type: string | undefined,
  fallback: number,
): number {
  return type ? Number(type) : fallback;
}

type Fallbacks = {
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
  listingType: ListingType;
};

export function getHomeQueryParams(
  source: string | undefined,
  siteRes: GetSiteResponse,
  myUserInfo?: MyUserInfo,
): HomeProps {
  const local_user = myUserInfo?.local_user_view.local_user;
  const local_site = siteRes.site_view.local_site;
  return getQueryParams<HomeProps, Fallbacks>(
    {
      sort: getSortTypeFromQuery,
      postTimeRange: getPostTimeRangeFromQuery,
      listingType: getListingTypeFromQuery,
      cursor: (cursor?: string) => cursor,
      dataType: getDataTypeFromQuery,
      showHidden: (include?: StringBoolean) => include,
    },
    source,
    {
      sort:
        local_user?.default_post_sort_type ?? local_site.default_post_sort_type,
      listingType:
        local_user?.default_listing_type ??
        local_site.default_post_listing_type,
      postTimeRange: local_user?.default_post_time_range_seconds ?? 0,
    },
  );
}

const MobileButton = ({
  textKey,
  show,
  onClick,
}: {
  textKey: NoOptionI18nKeys;
  show: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) => (
  <button
    className="btn btn-secondary d-inline-block mb-2 me-3"
    onClick={onClick}
  >
    {I18NextService.i18n.t(textKey)}{" "}
    <Icon icon={show ? `minus-square` : `plus-square`} classes="icon-inline" />
  </button>
);

type HomePathProps = Record<string, never>;
type HomeRouteProps = RouteComponentProps<HomePathProps> & HomeProps;
export type HomeFetchConfig = IRoutePropsWithFetch<
  HomeData,
  HomePathProps,
  HomeProps
>;

@scrollMixin
@tippyMixin
export class Home extends Component<HomeRouteProps, HomeState> {
  private isoData = setIsoData<HomeData>(this.context);
  state: HomeState = {
    postsRes: EMPTY_REQUEST,
    commentsRes: EMPTY_REQUEST,
    siteRes: this.isoData.siteRes,
    showSubscribedMobile: false,
    showSidebarMobile: false,
    subscribedCollapsed: false,
    isIsomorphic: false,
    markPageAsReadLoading: false,
    postListingMode:
      this.isoData.myUserInfo?.local_user_view.local_user.post_listing_mode ??
      this.isoData.siteRes.site_view.local_site.default_post_listing_mode,
  };

  loadingSettled(): boolean {
    return resourcesSettled([
      this.props.dataType === DataType.Post
        ? this.state.postsRes
        : this.state.commentsRes,
    ]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleCommentSortChange = this.handleCommentSortChange.bind(this);
    this.handlePostTimeRangeChange = this.handlePostTimeRangeChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePostListingModeChange =
      this.handlePostListingModeChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handleShowHiddenChange = this.handleShowHiddenChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleBlockCommunity = this.handleBlockCommunity.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleLockComment = this.handleLockComment.bind(this);
    this.handleCommentVote = this.handleCommentVote.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleCommentReport = this.handleCommentReport.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePost = this.handleFeaturePost.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.handleHidePost = this.handleHidePost.bind(this);
    this.handlePersonNote = this.handlePersonNote.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { commentsRes, postsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        commentsRes,
        postsRes,
        isIsomorphic: true,
      };
    }

    this.state.tagline = this.state?.siteRes?.tagline?.content;
  }

  async componentWillMount() {
    if (
      (!this.state.isIsomorphic ||
        !Object.values(this.isoData.routeData).some(
          res => res.state === "success" || res.state === "failed",
        )) &&
      isBrowser()
    ) {
      await this.fetchData(this.props);
    }
  }

  componentWillReceiveProps(
    nextProps: HomeRouteProps & { children?: InfernoNode },
  ) {
    this.fetchData(nextProps);
  }

  static async fetchInitialData({
    query: { listingType, dataType, sort, postTimeRange, cursor, showHidden },
    headers,
  }: InitialFetchRequest<HomePathProps, HomeProps>): Promise<HomeData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    let postsFetch: Promise<RequestState<GetPostsResponse>> =
      Promise.resolve(EMPTY_REQUEST);
    let commentsFetch: Promise<RequestState<GetCommentsResponse>> =
      Promise.resolve(EMPTY_REQUEST);

    if (dataType === DataType.Post) {
      const getPostsForm: GetPosts = {
        type_: listingType,
        ...cursorComponents(cursor),
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        show_hidden: showHidden === "true",
      };

      postsFetch = client.getPosts(getPostsForm);
    } else {
      const getCommentsForm: GetComments = {
        sort: mixedToCommentSortType(sort),
        type_: listingType,
      };

      commentsFetch = client.getComments(getCommentsForm);
    }

    const [postsRes, commentsRes] = await Promise.all([
      postsFetch,
      commentsFetch,
    ]);

    return {
      commentsRes,
      postsRes,
    };
  }

  get documentTitle(): string {
    const { name, description } = this.state.siteRes.site_view.site;

    return description ? `${name} - ${description}` : name;
  }

  render() {
    const {
      tagline,
      siteRes: {
        site_view: {
          local_site: { site_setup },
        },
      },
    } = this.state;

    return (
      <div className="home container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {site_setup && (
          <div className="row">
            <div className="col-12 col-md-8 col-lg-9">
              <DonationDialog myUserInfo={this.isoData.myUserInfo} />
              {this.isoData.myUserInfo?.local_user_view.banned && (
                <BannedDialog
                  expires={
                    this.isoData.myUserInfo?.local_user_view.ban_expires_at
                  }
                />
              )}
              {tagline && (
                <div
                  id="tagline"
                  dangerouslySetInnerHTML={mdToHtml(tagline, () =>
                    this.forceUpdate(),
                  )}
                ></div>
              )}
              <div className="d-block d-md-none">{this.mobileView}</div>
              {this.posts}
            </div>
            <aside className="d-none d-md-block col-md-4 col-lg-3">
              {this.mySidebar}
            </aside>
          </div>
        )}
      </div>
    );
  }

  get hasFollows(): boolean {
    const mui = this.isoData.myUserInfo;
    return !!mui && mui.follows.length > 0;
  }

  get mobileView() {
    const {
      siteRes: {
        site_view: { local_site, site },
        admins,
      },
      showSubscribedMobile,
      showSidebarMobile,
    } = this.state;

    return (
      <div className="row">
        <div className="col-12">
          {this.hasFollows && (
            <MobileButton
              textKey="subscribed"
              show={showSubscribedMobile}
              onClick={linkEvent(this, this.handleShowSubscribedMobile)}
            />
          )}
          <MobileButton
            textKey="sidebar"
            show={showSidebarMobile}
            onClick={linkEvent(this, this.handleShowSidebarMobile)}
          />
          {showSidebarMobile && (
            <SiteSidebar
              site={site}
              admins={admins}
              localSite={local_site}
              isMobile
              myUserInfo={this.isoData.myUserInfo}
              allLanguages={this.state.siteRes.all_languages}
              siteLanguages={this.state.siteRes.discussion_languages}
            />
          )}
          {showSubscribedMobile && (
            <div className="card mb-3">{this.subscribedCommunities(true)}</div>
          )}
        </div>
      </div>
    );
  }

  get mySidebar() {
    const {
      siteRes: {
        site_view: { local_site, site },
        admins,
      },
    } = this.state;

    return (
      <div id="sidebarContainer">
        <SiteSidebar
          site={site}
          admins={admins}
          localSite={local_site}
          myUserInfo={this.isoData.myUserInfo}
          allLanguages={this.state.siteRes.all_languages}
          siteLanguages={this.state.siteRes.discussion_languages}
        />
        {this.hasFollows && (
          <div className="accordion">
            <section id="sidebarSubscribed" className="card mb-3">
              {this.subscribedCommunities(false)}
            </section>
          </div>
        )}
      </div>
    );
  }

  subscribedCommunities(isMobile = false) {
    const { subscribedCollapsed } = this.state;

    return (
      <>
        <header
          className="card-header d-flex align-items-center"
          id="sidebarSubscribedHeader"
        >
          <h5 className="mb-0 d-inline">
            <T className="d-inline" i18nKey="subscribed_to_communities">
              #
              <Link className="text-body" to="/communities">
                #
              </Link>
            </T>
          </h5>
          {!isMobile && (
            <button
              type="button"
              className="btn btn-sm text-muted"
              onClick={linkEvent(this, this.handleCollapseSubscribe)}
              aria-label={
                subscribedCollapsed
                  ? I18NextService.i18n.t("expand")
                  : I18NextService.i18n.t("collapse")
              }
              data-tippy-content={
                subscribedCollapsed
                  ? I18NextService.i18n.t("expand")
                  : I18NextService.i18n.t("collapse")
              }
              aria-expanded="true"
              aria-controls="sidebarSubscribedBody"
            >
              <Icon
                icon={`${subscribedCollapsed ? "plus" : "minus"}-square`}
                classes="icon-inline"
              />
            </button>
          )}
        </header>
        {!subscribedCollapsed && (
          <div
            id="sidebarSubscribedBody"
            aria-labelledby="sidebarSubscribedHeader"
          >
            <div className="card-body">
              <ul className="list-inline mb-0">
                {this.isoData.myUserInfo?.follows.map(cfv => (
                  <li
                    key={cfv.community.id}
                    className="list-inline-item d-inline-block"
                  >
                    <CommunityLink
                      community={cfv.community}
                      myUserInfo={this.isoData.myUserInfo}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
    );
  }

  async updateUrl(props: Partial<HomeProps>) {
    const { dataType, listingType, cursor, sort, postTimeRange, showHidden } = {
      ...this.props,
      ...props,
    };
    const queryParams: QueryParams<HomeProps> = {
      dataType: getDataTypeString(dataType ?? DataType.Post),
      listingType,
      cursor,
      sort,
      postTimeRange: postTimeRange.toString(),
      showHidden,
    };

    this.props.history.push({
      pathname: "/",
      search: getQueryString(queryParams),
    });
  }

  get posts() {
    return (
      <div className="main-content-wrapper">
        <div>
          {this.selects}
          {this.listings}
          <div className="row">
            <div className="col">
              <PaginatorCursor
                current={this.props.cursor}
                resource={this.currentRes}
                onPageChange={this.handlePageChange}
              />
            </div>
            <div className="col-auto">{this.markPageAsReadButton}</div>
          </div>
        </div>
      </div>
    );
  }

  get markPageAsReadButton(): InfernoNode {
    const { dataType } = this.props;
    const { postsRes, markPageAsReadLoading } = this.state;

    if (markPageAsReadLoading) return <Spinner />;

    const haveUnread =
      dataType === DataType.Post &&
      postsRes.state === "success" &&
      postsRes.data.posts.some(p => !p.post_actions?.read_at);

    if (!haveUnread || !this.isoData.myUserInfo) return undefined;
    return (
      <div className="my-2">
        <button
          className="btn btn-secondary"
          onClick={linkEvent(this, this.handleMarkPageAsRead)}
        >
          {I18NextService.i18n.t("mark_page_as_read")}
        </button>
      </div>
    );
  }

  async handleMarkPageAsRead(i: Home) {
    const { dataType } = i.props;
    const { postsRes } = i.state;

    const post_ids =
      dataType === DataType.Post &&
      postsRes.state === "success" &&
      postsRes.data.posts
        .filter(p => !p.post_actions?.read_at)
        .map(p => p.post.id);

    if (post_ids && post_ids.length) {
      i.setState({ markPageAsReadLoading: true });
      const res = await HttpService.client.markManyPostAsRead({
        post_ids,
      });
      if (res.state === "success") {
        i.setState(s => {
          if (s.postsRes.state === "success") {
            s.postsRes.data.posts.forEach(p => {
              if (post_ids.includes(p.post.id) && i.isoData.myUserInfo) {
                if (!p.post_actions) {
                  p.post_actions = {};
                }
                p.post_actions.read_at = nowBoolean(true);
              }
            });
          }
          return { postsRes: s.postsRes, markPageAsReadLoading: false };
        });
      } else {
        i.setState({ markPageAsReadLoading: false });
      }
    }
  }

  get currentRes() {
    if (this.props.dataType === DataType.Post) {
      return this.state.postsRes;
    } else {
      return this.state.commentsRes;
    }
  }

  get listings() {
    const { dataType } = this.props;
    const siteRes = this.state.siteRes;

    if (dataType === DataType.Post) {
      switch (this.state.postsRes?.state) {
        case "empty":
          return <div style="min-height: 20000px;"></div>;
        case "loading":
          return <PostsLoadingSkeleton />;
        case "success": {
          const posts = this.state.postsRes.data.posts;
          return (
            <PostListings
              posts={posts}
              showCommunity
              showCrossPosts="Small"
              markable
              viewOnly={false}
              enableNsfw={enableNsfw(siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onBlockPerson={this.handleBlockPerson}
              onBlockCommunity={this.handleBlockCommunity}
              onPostEdit={this.handlePostEdit}
              onPostVote={this.handlePostVote}
              onPostReport={this.handlePostReport}
              onLockPost={this.handleLockPost}
              onDeletePost={this.handleDeletePost}
              onRemovePost={this.handleRemovePost}
              onSavePost={this.handleSavePost}
              onPurgePerson={this.handlePurgePerson}
              onPurgePost={this.handlePurgePost}
              onBanPerson={this.handleBanPerson}
              onBanPersonFromCommunity={this.handleBanFromCommunity}
              onAddModToCommunity={this.handleAddModToCommunity}
              onAddAdmin={this.handleAddAdmin}
              onTransferCommunity={this.handleTransferCommunity}
              onFeaturePost={this.handleFeaturePost}
              onMarkPostAsRead={this.handleMarkPostAsRead}
              onHidePost={this.handleHidePost}
              onPersonNote={this.handlePersonNote}
              postListingMode={this.state.postListingMode}
              onScrollIntoCommentsClick={() => {}}
            />
          );
        }
      }
    } else {
      switch (this.state.commentsRes.state) {
        case "loading":
          return <CommentsLoadingSkeleton />;
        case "success": {
          const comments = this.state.commentsRes.data.comments;
          return (
            <CommentNodes
              nodes={commentsToFlatNodes(comments)}
              viewType={CommentViewType.Flat}
              isTopLevel
              showCommunity
              showContext
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onSaveComment={this.handleSaveComment}
              onBlockPerson={this.handleBlockPerson}
              onBlockCommunity={this.handleBlockCommunity}
              onDeleteComment={this.handleDeleteComment}
              onRemoveComment={this.handleRemoveComment}
              onCommentVote={this.handleCommentVote}
              onCommentReport={this.handleCommentReport}
              onDistinguishComment={this.handleDistinguishComment}
              onAddModToCommunity={this.handleAddModToCommunity}
              onAddAdmin={this.handleAddAdmin}
              onTransferCommunity={this.handleTransferCommunity}
              onPurgeComment={this.handlePurgeComment}
              onPurgePerson={this.handlePurgePerson}
              onBanPersonFromCommunity={this.handleBanFromCommunity}
              onBanPerson={this.handleBanPerson}
              onCreateComment={this.handleCreateComment}
              onEditComment={this.handleEditComment}
              onPersonNote={this.handlePersonNote}
              onLockComment={this.handleLockComment}
            />
          );
        }
      }
    }
  }

  get selects() {
    const { listingType, dataType, sort, postTimeRange, showHidden } =
      this.props;

    return (
      <div className="row align-items-center mb-3 g-3">
        <div className="col-auto">
          <DataTypeSelect
            type_={dataType}
            onChange={this.handleDataTypeChange}
          />
        </div>
        {dataType === DataType.Post && this.isoData.myUserInfo && (
          <div className="col-auto">
            <PostHiddenSelect
              showHidden={showHidden}
              onShowHiddenChange={this.handleShowHiddenChange}
            />
          </div>
        )}
        <div className="col-auto">
          <ListingTypeSelect
            type_={
              listingType ??
              this.state.siteRes.site_view.local_site.default_post_listing_type
            }
            showLocal={showLocal(this.isoData)}
            showSubscribed
            myUserInfo={this.isoData.myUserInfo}
            onChange={this.handleListingTypeChange}
          />
        </div>
        <div className="col-auto">
          <PostListingModeSelect
            current={this.state.postListingMode}
            onChange={this.handlePostListingModeChange}
          />
        </div>
        {this.props.dataType === DataType.Post ? (
          <>
            <div className="col-auto">
              <PostSortSelect
                current={mixedToPostSortType(sort)}
                onChange={this.handleSortChange}
              />
            </div>
            <div className="col-6 col-md-3">
              <TimeIntervalSelect
                currentSeconds={postTimeRange}
                onChange={this.handlePostTimeRangeChange}
              />
            </div>
          </>
        ) : (
          <div className="col-auto">
            <CommentSortSelect
              current={mixedToCommentSortType(sort)}
              onChange={this.handleCommentSortChange}
            />
          </div>
        )}
        <div className="col-auto ps-0">
          {getRss(
            listingType ??
              this.state.siteRes.site_view.local_site.default_post_listing_type,
            sort,
          )}
        </div>
      </div>
    );
  }

  fetchDataToken?: symbol;
  async fetchData({
    dataType,
    cursor,
    listingType,
    sort,
    postTimeRange,
    showHidden,
  }: HomeProps) {
    const token = (this.fetchDataToken = Symbol());
    if (dataType === DataType.Post) {
      this.setState({ postsRes: LOADING_REQUEST, commentsRes: EMPTY_REQUEST });
      const postsRes = await HttpService.client.getPosts({
        ...cursorComponents(cursor),
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        type_: listingType,
        show_hidden: showHidden === "true",
      });
      if (token === this.fetchDataToken) {
        this.setState({ postsRes });
      }
    } else {
      this.setState({ commentsRes: LOADING_REQUEST, postsRes: EMPTY_REQUEST });
      const commentsRes = await HttpService.client.getComments({
        sort: mixedToCommentSortType(sort),
        type_: listingType,
      });
      if (token === this.fetchDataToken) {
        this.setState({ commentsRes });
      }
    }
  }

  handleShowSubscribedMobile(i: Home) {
    i.setState({ showSubscribedMobile: !i.state.showSubscribedMobile });
  }

  handleShowSidebarMobile(i: Home) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleCollapseSubscribe(i: Home) {
    i.setState({ subscribedCollapsed: !i.state.subscribedCollapsed });
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  handleSortChange(val: PostSortType) {
    this.updateUrl({ sort: val, cursor: undefined });
  }

  handlePostTimeRangeChange(val: number) {
    this.updateUrl({ postTimeRange: val, cursor: undefined });
  }

  handleCommentSortChange(val: CommentSortType) {
    this.updateUrl({ sort: val, cursor: undefined });
  }

  handleListingTypeChange(val: ListingType) {
    this.updateUrl({ listingType: val, cursor: undefined });
  }

  async handlePostListingModeChange(val: PostListingMode) {
    this.setState({ postListingMode: val });

    // Also, save your user settings to this mode
    if (this.isoData.myUserInfo) {
      await HttpService.client.saveUserSettings({
        post_listing_mode: val,
      });
    }
  }

  handleDataTypeChange(val: DataType) {
    this.updateUrl({ dataType: val, cursor: undefined });
  }

  handleShowHiddenChange(show?: StringBoolean) {
    this.updateUrl({
      showHidden: show,
      cursor: undefined,
    });
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    // TODO not sure what to do here
    await HttpService.client.addModToCommunity(form);
  }

  async handlePurgePerson(form: PurgePerson) {
    const purgePersonRes = await HttpService.client.purgePerson(form);
    this.purgeItem(purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    const purgeCommentRes = await HttpService.client.purgeComment(form);
    this.purgeItem(purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    const purgeRes = await HttpService.client.purgePost(form);
    this.purgeItem(purgeRes);
  }

  async handleBlockPerson(form: BlockPerson) {
    const blockPersonRes = await HttpService.client.blockPerson(form);
    if (blockPersonRes.state === "success") {
      updatePersonBlock(blockPersonRes.data, this.isoData.myUserInfo);
    }
  }

  async handleBlockCommunity(form: BlockCommunity) {
    const blockCommunityRes = await HttpService.client.blockCommunity(form);
    if (blockCommunityRes.state === "success") {
      updateCommunityBlock(blockCommunityRes.data, this.isoData.myUserInfo);
    }
  }

  async handleCreateComment(form: CreateComment) {
    const createCommentRes = await HttpService.client.createComment(form);
    this.createAndUpdateComments(createCommentRes);

    if (createCommentRes.state === "failed") {
      toast(
        I18NextService.i18n.t(createCommentRes.err.name as NoOptionI18nKeys),
        "danger",
      );
    }
    return createCommentRes;
  }

  async handleEditComment(form: EditComment) {
    const editCommentRes = await HttpService.client.editComment(form);
    this.findAndUpdateCommentEdit(editCommentRes);

    if (editCommentRes.state === "failed") {
      toast(
        I18NextService.i18n.t(editCommentRes.err.name as NoOptionI18nKeys),
        "danger",
      );
    }
    return editCommentRes;
  }

  async handlePersonNote(form: NotePerson) {
    const res = await HttpService.client.notePerson(form);

    if (res.state === "success") {
      this.setState(s => {
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.comments = editPersonNotes(
            form.note,
            form.person_id,
            s.commentsRes.data.comments,
          );
        }
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts = editPersonNotes(
            form.note,
            form.person_id,
            s.postsRes.data.posts,
          );
        }
        toast(
          I18NextService.i18n.t(form.note ? "note_created" : "note_deleted"),
        );
        return s;
      });
    }
  }

  async handleDeleteComment(form: DeleteComment) {
    const deleteCommentRes = await HttpService.client.deleteComment(form);
    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    const deleteRes = await HttpService.client.deletePost(form);
    this.findAndUpdatePost(deleteRes);
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = await HttpService.client.removePost(form);
    this.findAndUpdatePost(removeRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    const removeCommentRes = await HttpService.client.removeComment(form);
    this.findAndUpdateComment(removeCommentRes);
  }

  async handleLockComment(form: LockComment) {
    const res = await HttpService.client.lockComment(form);
    this.findAndUpdateComment(res);
  }

  async handleSaveComment(form: SaveComment) {
    const saveCommentRes = await HttpService.client.saveComment(form);
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    const saveRes = await HttpService.client.savePost(form);
    this.findAndUpdatePost(saveRes);
  }

  async handleFeaturePost(form: FeaturePost) {
    const featureRes = await HttpService.client.featurePost(form);
    this.findAndUpdatePost(featureRes);
  }

  async handleMarkPostAsRead(form: MarkPostAsRead) {
    const res = await HttpService.client.markPostAsRead(form);
    if (res.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts.forEach(p => {
            if (p.post.id === form.post_id && this.isoData.myUserInfo) {
              if (!p.post_actions) {
                p.post_actions = {};
              }
              p.post_actions.read_at = nowBoolean(form.read);
            }
          });
        }
        return { postsRes: s.postsRes };
      });
    }
  }

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(voteRes);
  }

  async handlePostEdit(form: EditPost) {
    const res = await HttpService.client.editPost(form);
    this.findAndUpdatePost(res);
    return res;
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = await HttpService.client.likePost(form);
    this.findAndUpdatePost(voteRes);
    return voteRes;
  }

  async handleCommentReport(form: CreateCommentReport) {
    const reportRes = await HttpService.client.createCommentReport(form);
    if (reportRes.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    const reportRes = await HttpService.client.createPostReport(form);
    if (reportRes.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    const lockRes = await HttpService.client.lockPost(form);
    this.findAndUpdatePost(lockRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    const distinguishRes = await HttpService.client.distinguishComment(form);
    this.findAndUpdateComment(distinguishRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = await HttpService.client.addAdmin(form);

    if (addAdminRes.state === "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    await HttpService.client.transferCommunity(form);
    toast(I18NextService.i18n.t("transfer_community"));
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
  }

  async handleHidePost(form: HidePost) {
    const hideRes = await HttpService.client.hidePost(form);

    if (hideRes.state === "success") {
      this.setState(prev => {
        if (prev.postsRes.state === "success" && this.isoData.myUserInfo) {
          for (const post of prev.postsRes.data.posts.filter(
            p => form.post_id === p.post.id,
          )) {
            if (!post.post_actions) {
              post.post_actions = {};
            }
            post.post_actions.hidden_at = nowBoolean(form.hide);
          }
        }

        return prev;
      });

      toast(I18NextService.i18n.t(form.hide ? "post_hidden" : "post_unhidden"));
    }
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => {
              c.creator_banned_from_community = banRes.data.banned;
            });
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => {
              c.creator_banned_from_community = banRes.data.banned;
            });
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator_banned = banRes.data.banned));
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator_banned = banRes.data.banned));
        }
        return s;
      });
    }
  }

  purgeItem(purgeRes: RequestState<SuccessResponse>) {
    if (purgeRes.state === "success") {
      toast(I18NextService.i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  findAndUpdateCommentEdit(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments = editComment(
          res.data.comment_view,
          s.commentsRes.data.comments,
        );
      }
      return s;
    });
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments = editComment(
          res.data.comment_view,
          s.commentsRes.data.comments,
        );
      }
      return s;
    });
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments.unshift(res.data.comment_view);
      }
      return s;
    });
  }

  findAndUpdatePost(res: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postsRes.state === "success" && res.state === "success") {
        s.postsRes.data.posts = editPost(
          res.data.post_view,
          s.postsRes.data.posts,
        );
      }
      return s;
    });
  }
}
