import {
  canViewCommunity,
  commentsToFlatNodes,
  communityRSSUrl,
  defaultPostListingMode,
  editComment,
  editPersonNotes,
  editPost,
  enableNsfw,
  mixedToCommentSortType,
  mixedToPostSortType,
  reportToast,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import { T } from "inferno-i18next-dess";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
  bareRoutePush,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import type { ItemIdAndRes, QueryParams } from "@utils/types";
import { itemLoading, RouteDataResponse } from "@utils/types";
import { Component, InfernoNode, RefObject, createRef } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddAdmin,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanPerson,
  PersonResponse,
  BlockCommunity,
  BlockPerson,
  CommentResponse,
  CommunityResponse,
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
  FollowCommunity,
  GetComments,
  PagedResponse,
  CommentView,
  GetCommunity,
  GetCommunityResponse,
  GetPosts,
  PostView,
  GetSiteResponse,
  HidePost,
  LemmyHttp,
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
  EditCommunityNotifications,
  LockComment,
  PostListingMode,
  PaginationCursor,
  PurgeCommunity,
  RemoveCommunity,
  CommentId,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
import { PostOrCommentType, InitialFetchRequest } from "@utils/types";
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
import { PostSortDropdown, CommentSortDropdown } from "../common/sort-dropdown";
import { SiteSidebar } from "../home/site-sidebar";
import { PostListings } from "../post/post-listings";
import { PaginatorCursor } from "../common/paginator-cursor";
import { getHttpBaseInternal } from "../../utils/env";
import {
  CommentsLoadingSkeleton,
  PostsLoadingSkeleton,
} from "../common/loading-skeleton";
import { CommunitySidebar } from "./community-sidebar";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { CommunityHeader } from "./community-header";
import { nowBoolean } from "@utils/date";
import { NoOptionI18nKeys } from "i18next";
import { TimeIntervalFilter } from "@components/common/time-interval-filter";
import { PostListingModeDropdown } from "@components/common/post-listing-mode-dropdown";
import { communityName } from "./community-link";
import { FilterChipCheckbox } from "@components/common/filter-chip-checkbox";

type CommunityData = RouteDataResponse<{
  communityRes: GetCommunityResponse;
  postsRes: PagedResponse<PostView>;
  commentsRes: PagedResponse<CommentView>;
}>;

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  postsRes: RequestState<PagedResponse<PostView>>;
  commentsRes: RequestState<PagedResponse<CommentView>>;
  followCommunityRes: RequestState<CommunityResponse>;
  removeCommunityRes: RequestState<CommunityResponse>;
  addModToCommunityRes: RequestState<AddModToCommunityResponse>;
  purgeCommunityRes: RequestState<SuccessResponse>;
  createCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  editCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  isIsomorphic: boolean;
  markPageAsReadLoading: boolean;
  postListingMode: PostListingMode;
}

interface CommunityProps {
  postOrCommentType: PostOrCommentType;
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
  cursor?: PaginationCursor;
  showHidden?: boolean;
}

type Fallbacks = {
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
};

export function getCommunityQueryParams(
  source: string | undefined,
  siteRes: GetSiteResponse,
  myUserInfo?: MyUserInfo,
) {
  const local_user = myUserInfo?.local_user_view.local_user;
  const local_site = siteRes.site_view.local_site;
  return getQueryParams<CommunityProps, Fallbacks>(
    {
      postOrCommentType: getPostOrCommentTypeFromQuery,
      cursor: (cursor?: string) => cursor,
      sort: getSortTypeFromQuery,
      postTimeRange: getPostTimeRangeFromQuery,
      showHidden: getShowHiddenFromQuery,
    },
    source,
    {
      sort:
        local_user?.default_post_sort_type ?? local_site.default_post_sort_type,
      postTimeRange: local_user?.default_post_time_range_seconds ?? 0,
    },
  );
}

function getPostOrCommentTypeFromQuery(type?: string): PostOrCommentType {
  return type ? (type as PostOrCommentType) : "post";
}

function getSortTypeFromQuery(
  type: string | undefined,
  fallback: PostSortType | CommentSortType,
): PostSortType | CommentSortType {
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

type CommunityPathProps = { name: string };
type CommunityRouteProps = RouteComponentProps<CommunityPathProps> &
  CommunityProps;
export type CommunityFetchConfig = IRoutePropsWithFetch<
  CommunityData,
  CommunityPathProps,
  CommunityProps
>;

@scrollMixin
@tippyMixin
export class Community extends Component<CommunityRouteProps, State> {
  private isoData = setIsoData<CommunityData>(this.context);
  state: State = {
    communityRes: EMPTY_REQUEST,
    postsRes: EMPTY_REQUEST,
    commentsRes: EMPTY_REQUEST,
    followCommunityRes: EMPTY_REQUEST,
    removeCommunityRes: EMPTY_REQUEST,
    addModToCommunityRes: EMPTY_REQUEST,
    purgeCommunityRes: EMPTY_REQUEST,
    createCommentRes: { id: 0, res: EMPTY_REQUEST },
    editCommentRes: { id: 0, res: EMPTY_REQUEST },
    siteRes: this.isoData.siteRes,
    showSidebarMobile: false,
    isIsomorphic: false,
    markPageAsReadLoading: false,
    postListingMode: defaultPostListingMode(this.isoData),
  };
  private readonly mainContentRef: RefObject<HTMLDivElement>;

  loadingSettled() {
    return resourcesSettled([
      this.state.communityRes,
      this.props.postOrCommentType === "post"
        ? this.state.postsRes
        : this.state.commentsRes,
    ]);
  }

  constructor(props: CommunityRouteProps, context: any) {
    super(props, context);

    this.mainContentRef = createRef();
    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { communityRes, commentsRes, postsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        commentsRes,
        communityRes,
        postsRes,
      };
    }
  }

  fetchCommunityToken?: symbol;
  async fetchCommunity(props: CommunityRouteProps) {
    const token = (this.fetchCommunityToken = Symbol());
    this.setState({ communityRes: LOADING_REQUEST });
    const name = decodeURIComponent(props.match.params.name);
    const communityRes = await HttpService.client.getCommunity({
      name,
    });
    if (token === this.fetchCommunityToken) {
      this.setState({ communityRes });
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await Promise.all([
        this.fetchCommunity(this.props),
        this.fetchData(this.props),
      ]);
    }
  }

  componentWillReceiveProps(
    nextProps: CommunityRouteProps & { children?: InfernoNode },
  ) {
    if (
      bareRoutePush(this.props, nextProps) ||
      this.props.match.params.name !== nextProps.match.params.name
    ) {
      this.fetchCommunity(nextProps);
    }
    this.fetchData(nextProps);
  }

  static async fetchInitialData({
    headers,
    query: { postOrCommentType, cursor, sort, postTimeRange, showHidden },
    match: { params: props },
  }: InitialFetchRequest<
    CommunityPathProps,
    CommunityProps
  >): Promise<CommunityData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const communityName = decodeURIComponent(props.name);
    const communityForm: GetCommunity = {
      name: communityName,
    };

    let postsFetch: Promise<RequestState<PagedResponse<PostView>>> =
      Promise.resolve(EMPTY_REQUEST);
    let commentsFetch: Promise<RequestState<PagedResponse<CommentView>>> =
      Promise.resolve(EMPTY_REQUEST);

    if (postOrCommentType === "post") {
      const getPostsForm: GetPosts = {
        community_name: communityName,
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        type_: "all",
        show_hidden: showHidden,
        page_cursor: cursor,
      };

      postsFetch = client.getPosts(getPostsForm);
    } else {
      const getCommentsForm: GetComments = {
        community_name: communityName,
        sort: mixedToCommentSortType(sort),
        type_: "all",
        page_cursor: cursor,
      };

      commentsFetch = client.getComments(getCommentsForm);
    }

    const communityFetch = client.getCommunity(communityForm);

    const [communityRes, commentsRes, postsRes] = await Promise.all([
      communityFetch,
      commentsFetch,
      postsFetch,
    ]);

    return {
      communityRes,
      commentsRes,
      postsRes,
    };
  }

  async updateUrl(props: Partial<CommunityProps>) {
    const {
      postOrCommentType,
      cursor,
      sort,
      showHidden,
      match: {
        params: { name },
      },
    } = {
      ...this.props,
      ...props,
    };

    const queryParams: QueryParams<CommunityProps> = {
      postOrCommentType: postOrCommentType ?? "post",
      cursor,
      sort,
      showHidden: showHidden?.toString(),
    };

    this.props.history.push(`/c/${name}${getQueryString(queryParams)}`);
  }

  fetchDataToken?: symbol;
  async fetchData(props: CommunityRouteProps) {
    const token = (this.fetchDataToken = Symbol());
    const { postOrCommentType, cursor, sort, postTimeRange, showHidden } =
      props;
    const name = decodeURIComponent(props.match.params.name);

    if (postOrCommentType === "post") {
      this.setState({ postsRes: LOADING_REQUEST, commentsRes: EMPTY_REQUEST });
      const postsRes = await HttpService.client.getPosts({
        page_cursor: cursor,
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        type_: "all",
        community_name: name,
        show_hidden: showHidden,
      });
      if (token === this.fetchDataToken) {
        this.setState({ postsRes });
      }
    } else {
      this.setState({ commentsRes: LOADING_REQUEST, postsRes: EMPTY_REQUEST });
      const commentsRes = await HttpService.client.getComments({
        sort: mixedToCommentSortType(sort),
        type_: "all",
        community_name: name,
        page_cursor: cursor,
      });
      if (token === this.fetchDataToken) {
        this.setState({ commentsRes });
      }
    }
  }

  get currentRes() {
    if (this.props.postOrCommentType === "post") {
      return this.state.postsRes;
    } else {
      return this.state.commentsRes;
    }
  }

  get documentTitle(): string {
    const cRes = this.state.communityRes;
    return cRes.state === "success"
      ? `${cRes.data.community_view.community.title} - ${this.isoData.siteRes.site_view.site.name}`
      : "";
  }

  renderCommunity() {
    const res =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data;
    return (
      <>
        {res && (
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            canonicalPath={res.community_view.community.ap_id}
            description={res.community_view.community.summary}
            image={res.community_view.community.icon}
          />
        )}

        {this.communityInfo()}
        <div className="d-block d-md-none">
          <button
            className="btn btn-sm btn-light border-light-subtle d-inline-block mb-2 me-3"
            onClick={() => handleShowSidebarMobile(this)}
          >
            {I18NextService.i18n.t("sidebar")}{" "}
            <Icon
              icon={
                this.state.showSidebarMobile ? `minus-square` : `plus-square`
              }
              classes="icon-inline"
            />
          </button>
          {this.state.showSidebarMobile && this.sidebar()}
        </div>
      </>
    );
  }

  render() {
    const res =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data;
    const canViewCommunity_ = res && canViewCommunity(res.community_view);
    // Show a message to the moderator if this community is not federated yet (ie it has no
    // remote followers).
    const notFederated =
      res &&
      res.community_view.can_mod &&
      res.community_view.community.subscribers ===
        res.community_view.community.subscribers_local &&
      res.community_view.community.visibility !== "local_only_public" &&
      res.community_view.community.visibility !== "local_only_private";
    const communityName_ = res && communityName(res.community_view.community);

    return (
      <div className="community container-lg">
        <div className="row">
          <div className="col-12 col-md-8 col-lg-9" ref={this.mainContentRef}>
            {notFederated && (
              <div className="alert alert-warning text-bg-warning" role="alert">
                <h4 className="alert-heading">
                  {I18NextService.i18n.t("community_not_federated_title")}
                </h4>
                <div className="card-text">
                  <T
                    className="d-inline"
                    i18nKey="community_not_federated_message"
                  >
                    #{communityName_}
                    <a href="https://lemmy-federate.com">#</a>
                  </T>
                </div>
              </div>
            )}
            {canViewCommunity_ ? (
              <>
                {this.renderCommunity()}
                {this.selects()}
                {this.listings()}
                <div className="row">
                  <div className="col">
                    <PaginatorCursor
                      current={this.props.cursor}
                      resource={this.currentRes}
                      onPageChange={() =>
                        handlePageChange(this, this.props.cursor)
                      }
                    />
                  </div>
                  <div className="col-auto">{this.markPageAsReadButton}</div>
                </div>
              </>
            ) : (
              // Check if res is set to avoid flashing the alert box on page load.
              res && (
                <div className="alert alert-danger text-bg-danger" role="alert">
                  <h4 className="alert-heading">
                    {I18NextService.i18n.t("community_visibility_private")}
                  </h4>
                  <div className="card-text">
                    {I18NextService.i18n.t(
                      "cant_view_private_community_message",
                    )}
                  </div>
                </div>
              )
            )}
          </div>
          <aside className="d-none d-md-block col-md-4 col-lg-3">
            {this.sidebar()}
          </aside>
        </div>
      </div>
    );
  }

  get markPageAsReadButton(): InfernoNode {
    const { postOrCommentType } = this.props;
    const { postsRes, markPageAsReadLoading } = this.state;
    const myUserInfo = this.isoData.myUserInfo;

    if (markPageAsReadLoading) return <Spinner />;

    const haveUnread =
      postOrCommentType === "post" &&
      postsRes.state === "success" &&
      postsRes.data.items.some(p => !p.post_actions?.read_at);

    if (!haveUnread || !myUserInfo) return undefined;
    return (
      <div className="my-2">
        <button
          className="btn btn-light border-light-subtle"
          onClick={() => handleMarkPageAsRead(this, myUserInfo)}
        >
          {I18NextService.i18n.t("mark_page_as_read")}
        </button>
      </div>
    );
  }

  sidebar() {
    if (this.state.communityRes.state !== "success") {
      return undefined;
    }
    const res = this.state.communityRes.data;
    const { siteRes, myUserInfo } = this.isoData;
    // For some reason, this returns an empty vec if it matches the site langs
    const communityLangs =
      res.discussion_languages.length === 0
        ? siteRes.all_languages.map(({ id }) => id)
        : res.discussion_languages;

    return (
      <>
        <CommunitySidebar
          communityView={res.community_view}
          moderators={res.moderators}
          admins={siteRes.admins}
          enableNsfw={enableNsfw(siteRes)}
          allLanguages={siteRes.all_languages}
          siteLanguages={siteRes.discussion_languages}
          communityLanguages={communityLangs}
          myUserInfo={this.isoData.myUserInfo}
          onFollow={form => handleFollow(this, form, myUserInfo)}
          onBlock={form => handleBlockCommunity(this, form, myUserInfo)}
          onEditNotifs={form => handleEditCommunityNotifs(form)}
          onRemove={form => handleRemoveCommunity(this, form)}
          onPurge={form => handlePurgeCommunity(this, form)}
          removeLoading={this.state.removeCommunityRes.state === "loading"}
          purgeLoading={this.state.purgeCommunityRes.state === "loading"}
          followLoading={this.state.followCommunityRes.state === "loading"}
        />
        {!res.community_view.community.local && res.site && (
          <SiteSidebar site={res.site} myUserInfo={this.isoData.myUserInfo} />
        )}
      </>
    );
  }

  listings() {
    const { postOrCommentType } = this.props;
    const { siteRes, myUserInfo } = this.isoData;

    if (postOrCommentType === "post") {
      switch (this.state.postsRes.state) {
        case "loading":
          return <PostsLoadingSkeleton />;
        case "success":
          return (
            <PostListings
              posts={this.state.postsRes.data.items}
              showCrossPosts="show_separately"
              markable
              showCommunity={false}
              viewOnly={false}
              enableNsfw={enableNsfw(siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
              onBlockCommunity={form =>
                handleBlockCommunity(this, form, myUserInfo)
              }
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
              onAddModToCommunity={form => handleAddModToCommunity(this, form)}
              onAddAdmin={form => handleAddAdmin(this, form)}
              onTransferCommunity={form => handleTransferCommunity(this, form)}
              onFeaturePost={form => handleFeaturePost(this, form)}
              onMarkPostAsRead={form =>
                handleMarkPostAsRead(this, form, myUserInfo)
              }
              onHidePost={form => handleHidePost(this, form, myUserInfo)}
              onPersonNote={form => handlePersonNote(this, form)}
              postListingMode={this.state.postListingMode}
              onScrollIntoCommentsClick={() => {}}
            />
          );
      }
    } else {
      if (this.state.communityRes.state !== "success") {
        return;
      }
      switch (this.state.commentsRes.state) {
        case "loading":
          return <CommentsLoadingSkeleton />;
        case "success":
          return (
            <CommentNodes
              nodes={commentsToFlatNodes(this.state.commentsRes.data.items)}
              viewType={"flat"}
              createLoading={itemLoading(this.state.createCommentRes)}
              editLoading={itemLoading(this.state.editCommentRes)}
              isTopLevel
              showContext
              showCommunity={false}
              hideImages={false}
              admins={siteRes.admins}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              onSaveComment={form => handleSaveComment(this, form)}
              onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
              onBlockCommunity={form =>
                handleBlockCommunity(this, form, myUserInfo)
              }
              onDeleteComment={form => handleDeleteComment(this, form)}
              onRemoveComment={form => handleRemoveComment(this, form)}
              onCommentVote={form => handleCommentVote(this, form)}
              onCommentReport={form => handleCommentReport(form)}
              onDistinguishComment={form =>
                handleDistinguishComment(this, form)
              }
              onAddModToCommunity={form => handleAddModToCommunity(this, form)}
              onAddAdmin={form => handleAddAdmin(this, form)}
              onTransferCommunity={form => handleTransferCommunity(this, form)}
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
            />
          );
      }
    }
  }

  communityInfo() {
    const res =
      (this.state.communityRes.state === "success" &&
        this.state.communityRes.data) ||
      undefined;
    const community = res && res.community_view.community;
    const urlCommunityName = this.props.match.params.name;

    return (
      <CommunityHeader
        community={community}
        urlCommunityName={urlCommunityName}
        myUserInfo={this.isoData.myUserInfo}
      />
    );
  }

  selects() {
    const res =
      this.state.communityRes.state === "success" &&
      this.state.communityRes.data;
    const { postOrCommentType, sort, postTimeRange, showHidden } = this.props;
    const communityRss = res
      ? communityRSSUrl(res.community_view.community, sort)
      : undefined;

    const myUserInfo = this.isoData.myUserInfo;

    return (
      <div className="row row-cols-auto align-items-center g-3 mb-3">
        <div className="col">
          <PostOrCommentTypeDropdown
            currentOption={postOrCommentType}
            onSelect={val => handlePostOrCommentTypeChange(this, val)}
          />
        </div>
        {postOrCommentType === "post" && myUserInfo && (
          <div className="col">
            <FilterChipCheckbox
              option={"show_hidden_posts"}
              isChecked={showHidden ?? false}
              onCheck={hidden => handleShowHiddenChange(this, hidden)}
            />
          </div>
        )}
        <div className="col">
          <PostListingModeDropdown
            currentOption={this.state.postListingMode}
            onSelect={val => handlePostListingModeChange(this, val, myUserInfo)}
          />
        </div>
        {this.props.postOrCommentType === "post" ? (
          <>
            <div className="col">
              <PostSortDropdown
                currentOption={mixedToPostSortType(sort)}
                onSelect={val => handleSortChange(this, val)}
              />
            </div>
            <div className="col">
              <TimeIntervalFilter
                currentSeconds={postTimeRange}
                onChange={val => handlePostTimeRangeChange(this, val)}
              />
            </div>
          </>
        ) : (
          <div className="col">
            <CommentSortDropdown
              currentOption={mixedToCommentSortType(sort)}
              onSelect={val => handleCommentSortChange(this, val)}
            />
          </div>
        )}
        {communityRss && (
          <div className="col">
            <a href={communityRss} title="RSS" rel={relTags}>
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link
              rel="alternate"
              type="application/atom+xml"
              href={communityRss}
            />
          </div>
        )}
      </div>
    );
  }
}

async function handleMarkPageAsRead(
  i: Community,
  myUserInfo: MyUserInfo | undefined,
) {
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
      read: true,
      post_ids,
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

function handlePageChange(i: Community, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleSortChange(i: Community, sort: PostSortType) {
  i.updateUrl({ sort, cursor: undefined });
}

function handlePostTimeRangeChange(i: Community, val: number) {
  i.updateUrl({ postTimeRange: val, cursor: undefined });
}

function handleCommentSortChange(i: Community, sort: CommentSortType) {
  i.updateUrl({ sort, cursor: undefined });
}

function handlePostOrCommentTypeChange(
  i: Community,
  postOrCommentType: PostOrCommentType,
) {
  i.updateUrl({ postOrCommentType, cursor: undefined });
}

async function handlePostListingModeChange(
  i: Community,
  val: PostListingMode,
  myUserInfo: MyUserInfo | undefined,
) {
  i.setState({ postListingMode: val });

  // Also, save your user settings to this mode
  if (myUserInfo) {
    await HttpService.client.saveUserSettings({
      post_listing_mode: val,
    });
  }
}

function handleShowHiddenChange(i: Community, showHidden: boolean) {
  i.updateUrl({
    showHidden,
    cursor: undefined,
  });
}

function handleShowSidebarMobile(i: Community) {
  i.setState(({ showSidebarMobile }) => ({
    showSidebarMobile: !showSidebarMobile,
  }));
}

async function handleAddModToCommunity(i: Community, form: AddModToCommunity) {
  i.setState({ addModToCommunityRes: LOADING_REQUEST });
  const addModToCommunityRes = await HttpService.client.addModToCommunity(form);
  i.setState({ addModToCommunityRes });

  updateModerators(i, addModToCommunityRes);
  if (addModToCommunityRes.state === "success") {
    toast(I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"));
  }
}

async function handleFollow(
  i: Community,
  form: FollowCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  i.setState({ followCommunityRes: LOADING_REQUEST });
  const followCommunityRes = await HttpService.client.followCommunity(form);
  i.setState({ followCommunityRes });

  updateCommunity(i, followCommunityRes);

  // Update myUserInfo
  if (followCommunityRes.state === "success") {
    const communityId = followCommunityRes.data.community_view.community.id;
    const mui = myUserInfo;
    if (mui) {
      mui.follows = mui.follows.filter(i => i.community.id !== communityId);
    }
  }
}

async function handlePurgePerson(i: Community, form: PurgePerson) {
  const purgePersonRes = await HttpService.client.purgePerson(form);
  purgeItem(i, purgePersonRes);
}

async function handlePurgeComment(i: Community, form: PurgeComment) {
  const purgeCommentRes = await HttpService.client.purgeComment(form);
  purgeItem(i, purgeCommentRes);
}

async function handlePurgePost(i: Community, form: PurgePost) {
  const purgeRes = await HttpService.client.purgePost(form);
  purgeItem(i, purgeRes);
}

async function handleBlockCommunity(
  i: Community,
  form: BlockCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockCommunityRes = await HttpService.client.blockCommunity(form);
  if (blockCommunityRes.state === "success") {
    updateCommunityBlock(blockCommunityRes.data, form.block, myUserInfo);
    i.setState(s => {
      if (s.communityRes.state === "success" && myUserInfo) {
        const cv = s.communityRes.data.community_view;
        if (!cv.community_actions) {
          cv.community_actions = {};
        }
        cv.community_actions.blocked_at = nowBoolean(form.block);
      }
    });
  }
}

async function handleBlockPerson(
  form: BlockPerson,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockPersonRes = await HttpService.client.blockPerson(form);
  if (blockPersonRes.state === "success") {
    updatePersonBlock(blockPersonRes.data, form.block, myUserInfo);
  }
}

async function handleEditCommunityNotifs(form: EditCommunityNotifications) {
  const res = await HttpService.client.editCommunityNotifications(form);
  if (res.state === "success") {
    toast(I18NextService.i18n.t("notifications_updated"));
  }
}

async function handleCreateComment(i: Community, form: CreateComment) {
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
  createAndUpdateComments(i, res);

  if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  return res;
}

async function handleEditComment(i: Community, form: EditComment) {
  i.setState({
    editCommentRes: { id: form.comment_id, res: LOADING_REQUEST },
  });

  const res = await HttpService.client.editComment(form);
  i.setState({
    editCommentRes: { id: form.comment_id, res },
  });

  findAndUpdateCommentEdit(i, res);

  if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  return res;
}

async function handleDeleteComment(i: Community, form: DeleteComment) {
  const deleteCommentRes = await HttpService.client.deleteComment(form);
  findAndUpdateComment(i, deleteCommentRes);
}

async function handleDeletePost(i: Community, form: DeletePost) {
  const deleteRes = await HttpService.client.deletePost(form);
  findAndUpdatePost(i, deleteRes);
}

async function handleRemovePost(i: Community, form: RemovePost) {
  const removeRes = await HttpService.client.removePost(form);
  findAndUpdatePost(i, removeRes);
}

async function handleRemoveComment(i: Community, form: RemoveComment) {
  const removeCommentRes = await HttpService.client.removeComment(form);
  findAndUpdateComment(i, removeCommentRes);
}

async function handleLockComment(i: Community, form: LockComment) {
  const res = await HttpService.client.lockComment(form);
  findAndUpdateComment(i, res);
}

async function handleSaveComment(i: Community, form: SaveComment) {
  const saveCommentRes = await HttpService.client.saveComment(form);
  findAndUpdateComment(i, saveCommentRes);
}

async function handleSavePost(i: Community, form: SavePost) {
  const saveRes = await HttpService.client.savePost(form);
  findAndUpdatePost(i, saveRes);
}

async function handleFeaturePost(i: Community, form: FeaturePost) {
  const featureRes = await HttpService.client.featurePost(form);
  findAndUpdatePost(i, featureRes);
}

async function handleMarkPostAsRead(
  i: Community,
  form: MarkPostAsRead,
  myUserInfo: MyUserInfo | undefined,
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

async function handleCommentVote(i: Community, form: CreateCommentLike) {
  const voteRes = await HttpService.client.likeComment(form);
  findAndUpdateComment(i, voteRes);
}

async function handlePostEdit(i: Community, form: EditPost) {
  const res = await HttpService.client.editPost(form);
  findAndUpdatePost(i, res);
  return res;
}

async function handlePostVote(i: Community, form: CreatePostLike) {
  const voteRes = await HttpService.client.likePost(form);
  findAndUpdatePost(i, voteRes);
  return voteRes;
}

async function handleCommentReport(form: CreateCommentReport) {
  const reportRes = await HttpService.client.createCommentReport(form);
  reportToast(reportRes);
}

async function handlePostReport(form: CreatePostReport) {
  const reportRes = await HttpService.client.createPostReport(form);
  reportToast(reportRes);
}

async function handleLockPost(i: Community, form: LockPost) {
  const lockRes = await HttpService.client.lockPost(form);
  findAndUpdatePost(i, lockRes);
}

async function handleHidePost(
  i: Community,
  form: HidePost,
  myUserInfo: MyUserInfo | undefined,
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

async function handlePersonNote(i: Community, form: NotePerson) {
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

async function handleDistinguishComment(
  i: Community,
  form: DistinguishComment,
) {
  const distinguishRes = await HttpService.client.distinguishComment(form);
  findAndUpdateComment(i, distinguishRes);
}

async function handleAddAdmin(i: Community, form: AddAdmin) {
  const addAdminRes = await HttpService.client.addAdmin(form);

  if (addAdminRes.state === "success") {
    i.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
  }
}

async function handleTransferCommunity(i: Community, form: TransferCommunity) {
  const transferCommunityRes = await HttpService.client.transferCommunity(form);
  toast(I18NextService.i18n.t("transfer_community"));
  updateCommunityFull(i, transferCommunityRes);
}

async function handleBanFromCommunity(i: Community, form: BanFromCommunity) {
  const banRes = await HttpService.client.banFromCommunity(form);
  updateBanFromCommunity(i, banRes, form.ban);
}

async function handleBanPerson(i: Community, form: BanPerson) {
  const banRes = await HttpService.client.banPerson(form);
  updateBan(i, banRes, form.ban);
}

async function handleRemoveCommunity(i: Community, form: RemoveCommunity) {
  i.setState({ removeCommunityRes: LOADING_REQUEST });
  const removeCommunityRes = await HttpService.client.removeCommunity(form);
  i.setState({ removeCommunityRes });
  updateCommunity(i, removeCommunityRes);
}

async function handlePurgeCommunity(i: Community, form: PurgeCommunity) {
  i.setState({ purgeCommunityRes: LOADING_REQUEST });
  const purgeCommunityRes = await HttpService.client.purgeCommunity(form);
  i.setState({ purgeCommunityRes });
  purgeItem(i, purgeCommunityRes);
}

function updateBanFromCommunity(
  i: Community,
  banRes: RequestState<PersonResponse>,
  banned: boolean,
) {
  // Maybe not necessary
  if (banRes.state === "success") {
    i.setState(s => {
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

function updateBan(
  i: Community,
  banRes: RequestState<PersonResponse>,
  banned: boolean,
) {
  // Maybe not necessary
  if (banRes.state === "success") {
    i.setState(s => {
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

function updateCommunity(i: Community, res: RequestState<CommunityResponse>) {
  i.setState(s => {
    if (s.communityRes.state === "success" && res.state === "success") {
      s.communityRes.data.community_view = res.data.community_view;
      s.communityRes.data.discussion_languages = res.data.discussion_languages;
    }
    return s;
  });
}

function updateCommunityFull(
  i: Community,
  res: RequestState<GetCommunityResponse>,
) {
  i.setState(s => {
    if (s.communityRes.state === "success" && res.state === "success") {
      s.communityRes.data.community_view = res.data.community_view;
      s.communityRes.data.moderators = res.data.moderators;
    }
    return s;
  });
}

function purgeItem(i: Community, purgeRes: RequestState<SuccessResponse>) {
  if (purgeRes.state === "success") {
    toast(I18NextService.i18n.t("purge_success"));
    i.context.router.history.push(`/`);
  }
}

function findAndUpdateCommentEdit(
  i: Community,
  res: RequestState<CommentResponse>,
) {
  i.setState(s => {
    if (s.commentsRes.state === "success" && res.state === "success") {
      s.commentsRes.data.items = editComment(
        res.data.comment_view,
        s.commentsRes.data.items,
      );
    }
    return s;
  });
}

function findAndUpdateComment(
  i: Community,
  res: RequestState<CommentResponse>,
) {
  i.setState(s => {
    if (s.commentsRes.state === "success" && res.state === "success") {
      s.commentsRes.data.items = editComment(
        res.data.comment_view,
        s.commentsRes.data.items,
      );
    }
    return s;
  });
}

function createAndUpdateComments(
  i: Community,
  res: RequestState<CommentResponse>,
) {
  i.setState(s => {
    if (s.commentsRes.state === "success" && res.state === "success") {
      s.commentsRes.data.items.unshift(res.data.comment_view);
    }
    return s;
  });
}

function findAndUpdatePost(i: Community, res: RequestState<PostResponse>) {
  i.setState(s => {
    if (s.postsRes.state === "success" && res.state === "success") {
      s.postsRes.data.items = editPost(
        res.data.post_view,
        s.postsRes.data.items,
      );
    }
    return s;
  });
}

function updateModerators(
  i: Community,
  res: RequestState<AddModToCommunityResponse>,
) {
  // Update the moderators
  i.setState(s => {
    if (s.communityRes.state === "success" && res.state === "success") {
      s.communityRes.data.moderators = res.data.moderators;
    }
    return s;
  });
}
