import {
  allRSSUrl,
  commentsToFlatNodes,
  defaultPostListingMode,
  editComment,
  editPersonNotes,
  editPost,
  enableNsfw,
  localRSSUrl,
  mixedToCommentSortType,
  mixedToPostSortType,
  myAuth,
  reportToast,
  setIsoData,
  showLocal,
  subscribedRSSUrl,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import type { ItemIdAndRes, QueryParams } from "@utils/types";
import { itemLoading, RouteDataResponse } from "@utils/types";
import { NoOptionI18nKeys } from "i18next";
import { Component, InfernoNode, MouseEventHandler } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  PersonResponse,
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
  CommentView,
  GetPosts,
  PostView,
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
  PagedResponse,
  PaginationCursor,
  CommentId,
  PostId,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
import { PostOrCommentType, InitialFetchRequest } from "@utils/types";
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
import { PostOrCommentTypeDropdown } from "../common/post-or-comment-type-dropdown";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { CommentSortDropdown, PostSortDropdown } from "../common/sort-dropdown";
import { CommunityLink } from "../community/community-link";
import { PostListings } from "../post/post-listings";
import { SiteSidebar } from "./site-sidebar";
import { PaginatorCursor } from "../common/paginator-cursor";
import { getHttpBaseInternal } from "@utils/env";
import {
  CommentsLoadingSkeleton,
  PostsLoadingSkeleton,
} from "../common/loading-skeleton";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { DonationDialog } from "./donation-dialog";
import { nowBoolean } from "@utils/date";
import { TimeIntervalFilter } from "@components/common/time-interval-filter";
import { BannedDialog } from "./banned-dialog";
import { PostListingModeDropdown } from "@components/common/post-listing-mode-dropdown";
import { MultiCommunityLink } from "@components/multi-community/multi-community-link";
import { ListingTypeDropdown } from "@components/common/listing-type-dropdown";
import { FilterChipCheckbox } from "@components/common/filter-chip-checkbox";

interface HomeState {
  postsRes: RequestState<PagedResponse<PostView>>;
  commentsRes: RequestState<PagedResponse<CommentView>>;
  createCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  editCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  voteCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  votePostRes: ItemIdAndRes<PostId, PostResponse>;
  showSubscribedMobile: boolean;
  showSidebarMobile: boolean;
  subscribedCollapsed: boolean;
  subscribedMultisCollapsed: boolean;
  tagline?: string;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
  markPageAsReadLoading: boolean;
  postListingMode: PostListingMode;
}

interface HomeProps {
  listingType?: ListingType;
  postOrCommentType: PostOrCommentType;
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
  showHidden?: boolean;
  showRead?: boolean;
  cursor?: PaginationCursor;
}

type HomeData = RouteDataResponse<{
  postsRes: PagedResponse<PostView>;
  commentsRes: PagedResponse<CommentView>;
}>;

function getRss(listingType: ListingType, sort: PostSortType) {
  let rss: string | undefined = undefined;

  const queryString = getQueryString({ sort });
  switch (listingType) {
    case "all": {
      rss = allRSSUrl(queryString);
      break;
    }
    case "local": {
      rss = localRSSUrl(queryString);
      break;
    }
    case "subscribed": {
      const auth = myAuth();
      rss = auth ? subscribedRSSUrl(auth, queryString) : undefined;
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

function getPostOrCommentTypeFromQuery(type?: string): PostOrCommentType {
  return type ? (type as PostOrCommentType) : "post";
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

function getShowHiddenFromQuery(hidden: string | undefined): boolean {
  return hidden === "true";
}

function getShowReadFromQuery(
  showRead: string | undefined,
  fallback: boolean,
): boolean {
  return showRead ? showRead === "true" : fallback;
}

type Fallbacks = {
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
  listingType: ListingType;
  showRead: boolean;
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
      postOrCommentType: getPostOrCommentTypeFromQuery,
      showHidden: getShowHiddenFromQuery,
      showRead: getShowReadFromQuery,
    },
    source,
    {
      sort:
        local_user?.default_post_sort_type ?? local_site.default_post_sort_type,
      listingType:
        local_user?.default_listing_type ??
        local_site.default_post_listing_type,
      postTimeRange: local_user?.default_post_time_range_seconds ?? 0,
      showRead: local_user?.show_read_posts ?? true,
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
    className="btn btn-sm btn-light border-light-subtle d-inline-block mb-2 me-3"
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
    createCommentRes: { id: 0, res: EMPTY_REQUEST },
    editCommentRes: { id: 0, res: EMPTY_REQUEST },
    voteCommentRes: { id: 0, res: EMPTY_REQUEST },
    votePostRes: { id: 0, res: EMPTY_REQUEST },
    siteRes: this.isoData.siteRes,
    showSubscribedMobile: false,
    showSidebarMobile: false,
    subscribedCollapsed: false,
    subscribedMultisCollapsed: false,
    isIsomorphic: false,
    markPageAsReadLoading: false,
    postListingMode: defaultPostListingMode(this.isoData),
  };

  loadingSettled(): boolean {
    return resourcesSettled([
      this.props.postOrCommentType === "post"
        ? this.state.postsRes
        : this.state.commentsRes,
    ]);
  }

  constructor(props: any, context: any) {
    super(props, context);

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

  static fetchInitialData = async ({
    query: {
      listingType,
      postOrCommentType,
      sort,
      postTimeRange,
      cursor,
      showHidden,
      showRead,
    },
    headers,
  }: InitialFetchRequest<HomePathProps, HomeProps>): Promise<HomeData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    let postsFetch: Promise<RequestState<PagedResponse<PostView>>> =
      Promise.resolve(EMPTY_REQUEST);
    let commentsFetch: Promise<RequestState<PagedResponse<CommentView>>> =
      Promise.resolve(EMPTY_REQUEST);

    if (postOrCommentType === "post") {
      const getPostsForm: GetPosts = {
        type_: listingType,
        page_cursor: cursor,
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        show_hidden: showHidden,
        show_read: showRead,
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
  };

  get documentTitle(): string {
    const { name, summary } = this.state.siteRes.site_view.site;

    return summary ? `${name} - ${summary}` : name;
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
    const myUserInfo = this.isoData.myUserInfo;

    return (
      <div className="home container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {site_setup && (
          <div className="row">
            <div className="col-12 col-md-8 col-lg-9">
              <DonationDialog
                myUserInfo={myUserInfo}
                onHideDialog={() => handleHideDonationDialog(myUserInfo)}
              />
              {myUserInfo?.local_user_view.banned && (
                <BannedDialog
                  expires={myUserInfo?.local_user_view.ban_expires_at}
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

  get hasMultiFollows(): boolean {
    const mui = this.isoData.myUserInfo;
    return !!mui && mui.multi_community_follows.length > 0;
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
              onClick={() => handleShowSubscribedMobile(this)}
            />
          )}
          <MobileButton
            textKey="sidebar"
            show={showSidebarMobile}
            onClick={() => handleShowSidebarMobile(this)}
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
              activePlugins={this.state.siteRes.active_plugins}
            />
          )}
          {showSubscribedMobile && (
            <>
              <div className="card mb-3">
                {this.subscribedCommunities(true)}
              </div>
              <div className="card mb-3">
                {this.subscribedMultiCommunities(true)}
              </div>
            </>
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
          activePlugins={this.state.siteRes.active_plugins}
        />
        {this.hasFollows && (
          <div className="accordion">
            <section id="sidebarSubscribed" className="card mb-3">
              {this.subscribedCommunities(false)}
            </section>
          </div>
        )}
        {this.hasMultiFollows && (
          <div className="accordion">
            <section id="sidebarSubscribedMultis" className="card mb-3">
              {this.subscribedMultiCommunities(false)}
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
              onClick={() => handleCollapseSubscribe(this)}
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

  subscribedMultiCommunities(isMobile = false) {
    const { subscribedMultisCollapsed } = this.state;

    return (
      <>
        <header
          className="card-header d-flex align-items-center"
          id="sidebarSubscribedMultisHeader"
        >
          <h5 className="mb-0 d-inline text-body">
            {I18NextService.i18n.t("multi_communities")}
          </h5>
          {!isMobile && (
            <button
              type="button"
              className="btn btn-sm text-muted"
              onClick={() => handleCollapseMultisSubscribe(this)}
              aria-label={
                subscribedMultisCollapsed
                  ? I18NextService.i18n.t("expand")
                  : I18NextService.i18n.t("collapse")
              }
              data-tippy-content={
                subscribedMultisCollapsed
                  ? I18NextService.i18n.t("expand")
                  : I18NextService.i18n.t("collapse")
              }
              aria-expanded="true"
              aria-controls="sidebarSubscribedMultisBody"
            >
              <Icon
                icon={`${subscribedMultisCollapsed ? "plus" : "minus"}-square`}
                classes="icon-inline"
              />
            </button>
          )}
        </header>
        {!subscribedMultisCollapsed && (
          <div
            id="sidebarSubscribedMultisBody"
            aria-labelledby="sidebarSubscribedMultisHeader"
          >
            <div className="card-body">
              <ul className="list-inline mb-0">
                {this.isoData.myUserInfo?.multi_community_follows.map(mv => (
                  <li
                    key={mv.multi.id}
                    className="list-inline-item d-inline-block"
                  >
                    <MultiCommunityLink
                      multiCommunity={mv.multi}
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

  updateUrl(props: Partial<HomeProps>) {
    const {
      postOrCommentType,
      listingType,
      cursor,
      sort,
      postTimeRange,
      showHidden,
      showRead,
    } = {
      ...this.props,
      ...props,
    };
    const queryParams: QueryParams<HomeProps> = {
      postOrCommentType: postOrCommentType ?? "post",
      listingType,
      cursor,
      sort,
      postTimeRange: postTimeRange.toString(),
      showHidden: showHidden?.toString(),
      showRead: showRead?.toString(),
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
                onPageChange={cursor => handlePageChange(this, cursor)}
              />
            </div>
            <div className="col-auto">{this.markPageAsReadButton}</div>
          </div>
        </div>
      </div>
    );
  }

  get markPageAsReadButton(): InfernoNode {
    const { postOrCommentType } = this.props;
    const { postsRes, markPageAsReadLoading } = this.state;

    if (markPageAsReadLoading) return <Spinner />;

    const haveUnread =
      postOrCommentType === "post" &&
      postsRes.state === "success" &&
      postsRes.data.items.some(p => !p.post_actions?.read_at);

    if (!haveUnread || !this.isoData.myUserInfo) return undefined;
    return (
      <div className="my-2">
        <button
          className="btn btn-light border-light-subtle"
          onClick={() => handleMarkPageAsRead(this)}
        >
          {I18NextService.i18n.t("mark_page_as_read")}
        </button>
      </div>
    );
  }

  get currentRes() {
    if (this.props.postOrCommentType === "post") {
      return this.state.postsRes;
    } else {
      return this.state.commentsRes;
    }
  }

  get listings() {
    const { postOrCommentType } = this.props;
    const siteRes = this.state.siteRes;
    const myUserInfo = this.isoData.myUserInfo;

    if (postOrCommentType === "post") {
      switch (this.state.postsRes?.state) {
        case "empty":
          return <div style="min-height: 20000px;"></div>;
        case "loading":
          return <PostsLoadingSkeleton />;
        case "success": {
          const posts = this.state.postsRes.data.items;
          return (
            <PostListings
              posts={posts}
              showCommunity
              showCrossPosts="small"
              showMarkRead="dropdown"
              viewOnly={false}
              enableNsfw={enableNsfw(siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              voteLoading={itemLoading(this.state.votePostRes)}
              onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
              onBlockCommunity={form => handleBlockCommunity(form, myUserInfo)}
              onPostEdit={form => handlePostEdit(this, form)}
              onPostVote={form => handlePostVote(this, form)}
              onPostReport={form => handlePostReport(form)}
              onLockPost={form => handleLockPost(this, form)}
              onDeletePost={form => handleDeletePost(this, form)}
              onRemovePost={form => handleRemovePost(this, form)}
              onSavePost={form => handleSavePost(this, form)}
              onPurgePerson={form => handlePurgePerson(this, form)}
              onPurgePost={form => handlePurgePost(this, form)}
              onBanPerson={form => handleBanPerson(this, form)}
              onBanPersonFromCommunity={form =>
                handleBanFromCommunity(this, form)
              }
              onAddModToCommunity={form => handleAddModToCommunity(form)}
              onAddAdmin={form => handleAddAdmin(this, form)}
              onTransferCommunity={form => handleTransferCommunity(form)}
              onFeaturePost={form => handleFeaturePost(this, form)}
              onMarkPostAsRead={form => handleMarkPostAsRead(this, form)}
              onHidePost={form => handleHidePost(this, form)}
              onPersonNote={form => handlePersonNote(this, form)}
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
          const comments = this.state.commentsRes.data.items;
          return (
            <CommentNodes
              nodes={commentsToFlatNodes(comments)}
              createLoading={itemLoading(this.state.createCommentRes)}
              editLoading={itemLoading(this.state.editCommentRes)}
              voteLoading={itemLoading(this.state.voteCommentRes)}
              fetchChildrenLoading={undefined}
              viewType={"flat"}
              isTopLevel
              showCommunity
              showContext
              showMarkRead={"hide"}
              markReadLoading={undefined}
              hideImages={false}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onSaveComment={form => handleSaveComment(this, form)}
              onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
              onBlockCommunity={form => handleBlockCommunity(form, myUserInfo)}
              onDeleteComment={form => handleDeleteComment(this, form)}
              onRemoveComment={form => handleRemoveComment(this, form)}
              onCommentVote={form => handleCommentVote(this, form)}
              onCommentReport={form => handleCommentReport(form)}
              onDistinguishComment={form =>
                handleDistinguishComment(this, form)
              }
              onAddModToCommunity={form => handleAddModToCommunity(form)}
              onAddAdmin={form => handleAddAdmin(this, form)}
              onTransferCommunity={form => handleTransferCommunity(form)}
              onPurgeComment={form => handlePurgeComment(this, form)}
              onPurgePerson={form => handlePurgePerson(this, form)}
              onBanPersonFromCommunity={form =>
                handleBanFromCommunity(this, form)
              }
              onBanPerson={form => handleBanPerson(this, form)}
              onCreateComment={form => handleCreateComment(this, form)}
              onEditComment={form => handleEditComment(this, form)}
              onPersonNote={form => handlePersonNote(this, form)}
              onLockComment={form => handleLockComment(this, form)}
              onMarkRead={() => {}}
              onFetchChildren={() => {}}
            />
          );
        }
      }
    }
  }

  get selects() {
    const {
      listingType,
      postOrCommentType,
      sort,
      postTimeRange,
      showHidden,
      showRead,
    } = this.props;

    return (
      <div className="row row-cols-auto align-items-center g-3 mb-3">
        <div className="col">
          <PostOrCommentTypeDropdown
            currentOption={postOrCommentType}
            onSelect={val => handlePostOrCommentTypeChange(this, val)}
          />
        </div>
        {postOrCommentType === "post" && this.isoData.myUserInfo && (
          <>
            <div className="col">
              <FilterChipCheckbox
                option={"show_hidden_posts"}
                isChecked={showHidden ?? false}
                onCheck={hidden => handleShowHiddenChange(this, hidden)}
              />
            </div>
            <div className="col">
              <FilterChipCheckbox
                option={"hide_read_posts"}
                isChecked={!(showRead ?? false)}
                onCheck={hideRead => handleHideReadChange(this, hideRead)}
              />
            </div>
          </>
        )}
        {/** TODO add show read posts also **/}
        <div className="col">
          <ListingTypeDropdown
            currentOption={
              listingType ??
              this.state.siteRes.site_view.local_site.default_post_listing_type
            }
            showLocal={showLocal(this.isoData)}
            showSubscribed
            showSuggested={
              !!this.isoData.siteRes.site_view.local_site.suggested_communities
            }
            showLabel
            myUserInfo={this.isoData.myUserInfo}
            onSelect={val => handleListingTypeChange(this, val)}
          />
        </div>
        <div className="col">
          <PostListingModeDropdown
            currentOption={this.state.postListingMode}
            onSelect={val => handlePostListingModeChange(this, val)}
            showLabel
          />
        </div>
        {this.props.postOrCommentType === "post" ? (
          <>
            <div className="col">
              <PostSortDropdown
                currentOption={mixedToPostSortType(sort)}
                onSelect={val => handleSortChange(this, val)}
                showLabel
              />
            </div>
            <div className="col">
              <TimeIntervalFilter
                currentSeconds={postTimeRange}
                onChange={seconds => handlePostTimeRangeChange(this, seconds)}
              />
            </div>
          </>
        ) : (
          <div className="col">
            <CommentSortDropdown
              currentOption={mixedToCommentSortType(sort)}
              onSelect={val => handleCommentSortChange(this, val)}
              showLabel
            />
          </div>
        )}
        <div className="col">
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
    postOrCommentType,
    cursor,
    listingType,
    sort,
    postTimeRange,
    showHidden,
    showRead,
  }: HomeProps) {
    const token = (this.fetchDataToken = Symbol());
    if (postOrCommentType === "post") {
      this.setState({ postsRes: LOADING_REQUEST, commentsRes: EMPTY_REQUEST });
      const postsRes = await HttpService.client.getPosts({
        page_cursor: cursor,
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        type_: listingType,
        show_hidden: showHidden,
        show_read: showRead,
      });
      if (token === this.fetchDataToken) {
        this.setState({ postsRes });
      }
    } else {
      this.setState({ commentsRes: LOADING_REQUEST, postsRes: EMPTY_REQUEST });
      const commentsRes = await HttpService.client.getComments({
        page_cursor: cursor,
        sort: mixedToCommentSortType(sort),
        type_: listingType,
      });
      if (token === this.fetchDataToken) {
        this.setState({ commentsRes });
      }
    }
  }

  updateBanFromCommunity(
    banRes: RequestState<PersonResponse>,
    banned: boolean,
  ) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.items
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => {
              c.creator_banned_from_community = banned;
            });
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.items
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => {
              c.creator_banned_from_community = banned;
            });
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<PersonResponse>, banned: boolean) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.items
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator_banned = banned));
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.items
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator_banned = banned));
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
        s.commentsRes.data.items = editComment(
          res.data.comment_view,
          s.commentsRes.data.items,
        );
      }
      return s;
    });
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.items = editComment(
          res.data.comment_view,
          s.commentsRes.data.items,
        );
      }
      return s;
    });
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.items.unshift(res.data.comment_view);
      }
      return s;
    });
  }

  findAndUpdatePost(res: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postsRes.state === "success" && res.state === "success") {
        s.postsRes.data.items = editPost(
          res.data.post_view,
          s.postsRes.data.items,
        );
      }
      return s;
    });
  }
}

function handleShowSubscribedMobile(i: Home) {
  i.setState({ showSubscribedMobile: !i.state.showSubscribedMobile });
}

function handleShowSidebarMobile(i: Home) {
  i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
}

function handleCollapseSubscribe(i: Home) {
  i.setState({ subscribedCollapsed: !i.state.subscribedCollapsed });
}

function handleCollapseMultisSubscribe(i: Home) {
  i.setState({
    subscribedMultisCollapsed: !i.state.subscribedMultisCollapsed,
  });
}

function handlePageChange(i: Home, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleSortChange(i: Home, val: PostSortType) {
  i.updateUrl({ sort: val, cursor: undefined });
}

function handlePostTimeRangeChange(i: Home, val: number) {
  i.updateUrl({ postTimeRange: val, cursor: undefined });
}

function handleCommentSortChange(i: Home, val: CommentSortType) {
  i.updateUrl({ sort: val, cursor: undefined });
}

function handleListingTypeChange(i: Home, val: ListingType) {
  i.updateUrl({ listingType: val, cursor: undefined });
}

async function handlePostListingModeChange(
  i: Home,
  val: PostListingMode,
  myUserInfo?: MyUserInfo,
) {
  i.setState({ postListingMode: val });

  // Also, save your user settings to this mode
  if (myUserInfo) {
    await HttpService.client.saveUserSettings({
      post_listing_mode: val,
    });
  }
}

function handlePostOrCommentTypeChange(i: Home, val: PostOrCommentType) {
  i.updateUrl({ postOrCommentType: val, cursor: undefined });
}

function handleShowHiddenChange(i: Home, showHidden: boolean) {
  i.updateUrl({
    showHidden,
    cursor: undefined,
  });
}

function handleHideReadChange(i: Home, hideRead: boolean) {
  i.updateUrl({
    showRead: !hideRead,
    cursor: undefined,
  });
}

async function handleAddModToCommunity(form: AddModToCommunity) {
  const addModRes = await HttpService.client.addModToCommunity(form);
  if (addModRes.state === "success") {
    toast(I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"));
  }
}

async function handlePurgePerson(i: Home, form: PurgePerson) {
  const purgePersonRes = await HttpService.client.purgePerson(form);
  i.purgeItem(purgePersonRes);
}

async function handlePurgeComment(i: Home, form: PurgeComment) {
  const purgeCommentRes = await HttpService.client.purgeComment(form);
  i.purgeItem(purgeCommentRes);
}

async function handlePurgePost(i: Home, form: PurgePost) {
  const purgeRes = await HttpService.client.purgePost(form);
  i.purgeItem(purgeRes);
}

async function handleBlockPerson(form: BlockPerson, myUserInfo?: MyUserInfo) {
  const blockPersonRes = await HttpService.client.blockPerson(form);
  if (blockPersonRes.state === "success") {
    updatePersonBlock(blockPersonRes.data, form.block, myUserInfo);
  }
}

async function handleBlockCommunity(
  form: BlockCommunity,
  myUserInfo?: MyUserInfo,
) {
  const blockCommunityRes = await HttpService.client.blockCommunity(form);
  if (blockCommunityRes.state === "success") {
    updateCommunityBlock(blockCommunityRes.data, form.block, myUserInfo);
  }
}

async function handleCreateComment(i: Home, form: CreateComment) {
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res: LOADING_REQUEST,
    },
  });
  const res = await HttpService.client.createComment(form);
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res,
    },
  });
  i.createAndUpdateComments(res);

  if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  return res;
}

async function handleEditComment(i: Home, form: EditComment) {
  i.setState({
    editCommentRes: { id: form.comment_id, res: LOADING_REQUEST },
  });

  const res = await HttpService.client.editComment(form);
  i.setState({
    editCommentRes: { id: form.comment_id, res },
  });

  i.findAndUpdateCommentEdit(res);

  if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  return res;
}

async function handlePersonNote(i: Home, form: NotePerson) {
  const res = await HttpService.client.notePerson(form);

  if (res.state === "success") {
    i.setState(s => {
      if (s.commentsRes.state === "success") {
        s.commentsRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.commentsRes.data.items,
        );
      }
      if (s.postsRes.state === "success") {
        s.postsRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.postsRes.data.items,
        );
      }
      toast(I18NextService.i18n.t(form.note ? "note_created" : "note_deleted"));
      return s;
    });
  }
}

async function handleDeleteComment(i: Home, form: DeleteComment) {
  const deleteCommentRes = await HttpService.client.deleteComment(form);
  i.findAndUpdateComment(deleteCommentRes);
}

async function handleDeletePost(i: Home, form: DeletePost) {
  const deleteRes = await HttpService.client.deletePost(form);
  i.findAndUpdatePost(deleteRes);
}

async function handleRemovePost(i: Home, form: RemovePost) {
  const removeRes = await HttpService.client.removePost(form);
  i.findAndUpdatePost(removeRes);
}

async function handleRemoveComment(i: Home, form: RemoveComment) {
  const removeCommentRes = await HttpService.client.removeComment(form);
  i.findAndUpdateComment(removeCommentRes);
}

async function handleLockComment(i: Home, form: LockComment) {
  const res = await HttpService.client.lockComment(form);
  i.findAndUpdateComment(res);
}

async function handleSaveComment(i: Home, form: SaveComment) {
  const saveCommentRes = await HttpService.client.saveComment(form);
  i.findAndUpdateComment(saveCommentRes);
}

async function handleSavePost(i: Home, form: SavePost) {
  const saveRes = await HttpService.client.savePost(form);
  i.findAndUpdatePost(saveRes);
}

async function handleFeaturePost(i: Home, form: FeaturePost) {
  const featureRes = await HttpService.client.featurePost(form);
  i.findAndUpdatePost(featureRes);
}

async function handleMarkPostAsRead(
  i: Home,
  form: MarkPostAsRead,
  myUserInfo?: MyUserInfo,
) {
  const res = await HttpService.client.markPostAsRead(form);
  if (res.state === "success") {
    i.setState(s => {
      if (s.postsRes.state === "success") {
        s.postsRes.data.items.forEach(p => {
          if (p.post.id === form.post_id && myUserInfo) {
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

async function handleCommentVote(i: Home, form: CreateCommentLike) {
  i.setState({ voteCommentRes: { id: form.comment_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.likeComment(form);
  i.setState({ voteCommentRes: { id: form.comment_id, res } });

  i.findAndUpdateComment(res);
}

async function handlePostEdit(i: Home, form: EditPost) {
  const res = await HttpService.client.editPost(form);
  i.findAndUpdatePost(res);
  return res;
}

async function handlePostVote(i: Home, form: CreatePostLike) {
  i.setState({ votePostRes: { id: form.post_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.likePost(form);
  i.setState({ votePostRes: { id: form.post_id, res } });

  i.findAndUpdatePost(res);
  return res;
}

async function handleCommentReport(form: CreateCommentReport) {
  const reportRes = await HttpService.client.createCommentReport(form);
  reportToast(reportRes);
}

async function handlePostReport(form: CreatePostReport) {
  const reportRes = await HttpService.client.createPostReport(form);
  reportToast(reportRes);
}

async function handleLockPost(i: Home, form: LockPost) {
  const lockRes = await HttpService.client.lockPost(form);
  i.findAndUpdatePost(lockRes);
}

async function handleDistinguishComment(i: Home, form: DistinguishComment) {
  const distinguishRes = await HttpService.client.distinguishComment(form);
  i.findAndUpdateComment(distinguishRes);
}

async function handleAddAdmin(i: Home, form: AddAdmin) {
  const addAdminRes = await HttpService.client.addAdmin(form);

  if (addAdminRes.state === "success") {
    i.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
  }
}

async function handleTransferCommunity(form: TransferCommunity) {
  await HttpService.client.transferCommunity(form);
  toast(I18NextService.i18n.t("transfer_community"));
}

async function handleBanFromCommunity(i: Home, form: BanFromCommunity) {
  const banRes = await HttpService.client.banFromCommunity(form);
  i.updateBanFromCommunity(banRes, form.ban);
}

async function handleBanPerson(i: Home, form: BanPerson) {
  const banRes = await HttpService.client.banPerson(form);
  i.updateBan(banRes, form.ban);
}

async function handleHidePost(
  i: Home,
  form: HidePost,
  myUserInfo?: MyUserInfo,
) {
  const hideRes = await HttpService.client.hidePost(form);

  if (hideRes.state === "success") {
    i.setState(prev => {
      if (prev.postsRes.state === "success" && myUserInfo) {
        for (const post of prev.postsRes.data.items.filter(
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

async function handleMarkPageAsRead(i: Home, myUserInfo?: MyUserInfo) {
  const { postOrCommentType } = i.props;
  const { postsRes } = i.state;

  const post_ids =
    postOrCommentType === "post" &&
    postsRes.state === "success" &&
    postsRes.data.items
      .filter(p => !p.post_actions?.read_at)
      .map(p => p.post.id);

  if (post_ids && post_ids.length) {
    i.setState({ markPageAsReadLoading: true });
    const res = await HttpService.client.markManyPostAsRead({
      post_ids,
      read: true,
    });
    if (res.state === "success") {
      i.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.items.forEach(p => {
            if (post_ids.includes(p.post.id) && myUserInfo) {
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

async function handleHideDonationDialog(myUserInfo?: MyUserInfo) {
  const res = await HttpService.client.donationDialogShown();
  if (res.state === "success") {
    if (myUserInfo !== undefined) {
      myUserInfo.local_user_view.local_user.last_donation_notification_at =
        new Date(0).toString();
    }
  }
}
