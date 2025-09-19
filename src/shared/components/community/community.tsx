import {
  commentsToFlatNodes,
  communityRSSUrl,
  editComment,
  editPersonNotes,
  editPost,
  enableNsfw,
  getDataTypeString,
  mixedToCommentSortType,
  mixedToPostSortType,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
  bareRoutePush,
  cursorComponents,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import type {
  DirectionalCursor,
  QueryParams,
  StringBoolean,
} from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import {
  Component,
  InfernoNode,
  RefObject,
  createRef,
  linkEvent,
} from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddAdmin,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
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
  DeleteCommunity,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditCommunity,
  EditPost,
  FeaturePost,
  FollowCommunity,
  GetComments,
  GetCommentsResponse,
  GetCommunity,
  GetCommunityResponse,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  HidePost,
  LemmyHttp,
  LockPost,
  PostResponse,
  PurgeComment,
  PurgeCommunity,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemoveCommunity,
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
  UpdateCommunityNotifications,
  LockComment,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
import { CommentViewType, DataType, InitialFetchRequest } from "@utils/types";
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
import { PostSortSelect, CommentSortSelect } from "../common/sort-select";
import { SiteSidebar } from "../home/site-sidebar";
import { PostListings } from "../post/post-listings";
import { PaginatorCursor } from "../common/paginator-cursor";
import { getHttpBaseInternal } from "../../utils/env";
import {
  CommentsLoadingSkeleton,
  PostsLoadingSkeleton,
} from "../common/loading-skeleton";
import { Sidebar } from "./sidebar";
import { IRoutePropsWithFetch } from "@utils/routes";
import PostHiddenSelect from "../common/post-hidden-select";
import { isBrowser } from "@utils/browser";
import { CommunityHeader } from "./community-header";
import { nowBoolean } from "@utils/date";
import { NoOptionI18nKeys } from "i18next";
import { TimeIntervalSelect } from "@components/common/time-interval-select";

type CommunityData = RouteDataResponse<{
  communityRes: GetCommunityResponse;
  postsRes: GetPostsResponse;
  commentsRes: GetCommentsResponse;
}>;

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  postsRes: RequestState<GetPostsResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  isIsomorphic: boolean;
  markPageAsReadLoading: boolean;
  expandAllImages: boolean;
}

interface CommunityProps {
  dataType: DataType;
  sort: PostSortType | CommentSortType;
  postTimeRange: number;
  cursor?: DirectionalCursor;
  showHidden?: StringBoolean;
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
      dataType: getDataTypeFromQuery,
      cursor: (cursor?: string) => cursor,
      sort: getSortTypeFromQuery,
      postTimeRange: getPostTimeRangeFromQuery,
      showHidden: (include?: StringBoolean) => include,
    },
    source,
    {
      sort:
        local_user?.default_post_sort_type ?? local_site.default_post_sort_type,
      postTimeRange: local_user?.default_post_time_range_seconds ?? 0,
    },
  );
}

function getDataTypeFromQuery(type?: string): DataType {
  return type ? DataType[type] : DataType.Post;
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
    siteRes: this.isoData.siteRes,
    showSidebarMobile: false,
    isIsomorphic: false,
    markPageAsReadLoading: false,
    expandAllImages: false,
  };
  private readonly mainContentRef: RefObject<HTMLDivElement>;

  loadingSettled() {
    return resourcesSettled([
      this.state.communityRes,
      this.props.dataType === DataType.Post
        ? this.state.postsRes
        : this.state.commentsRes,
    ]);
  }

  constructor(props: CommunityRouteProps, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleCommentSortChange = this.handleCommentSortChange.bind(this);
    this.handlePostTimeRangeChange = this.handlePostTimeRangeChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    // All of the action binds
    this.handleDeleteCommunity = this.handleDeleteCommunity.bind(this);
    this.handleEditCommunity = this.handleEditCommunity.bind(this);
    this.handleFollow = this.handleFollow.bind(this);
    this.handleRemoveCommunity = this.handleRemoveCommunity.bind(this);
    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockCommunity = this.handleBlockCommunity.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleLockComment = this.handleLockComment.bind(this);
    this.handleCommentVote = this.handleCommentVote.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgeCommunity = this.handlePurgeCommunity.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleCommentReport = this.handleCommentReport.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePost = this.handleFeaturePost.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.handleHidePost = this.handleHidePost.bind(this);
    this.handleShowHiddenChange = this.handleShowHiddenChange.bind(this);
    this.handlePersonNote = this.handlePersonNote.bind(this);
    this.handleExpandImageClick = this.handleExpandImageClick.bind(this);

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
    const communityRes = await HttpService.client.getCommunity({
      name: props.match.params.name,
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
    query: { dataType, cursor, sort, postTimeRange, showHidden },
    match: {
      params: { name: communityName },
    },
  }: InitialFetchRequest<
    CommunityPathProps,
    CommunityProps
  >): Promise<CommunityData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const communityForm: GetCommunity = {
      name: communityName,
    };

    let postsFetch: Promise<RequestState<GetPostsResponse>> =
      Promise.resolve(EMPTY_REQUEST);
    let commentsFetch: Promise<RequestState<GetCommentsResponse>> =
      Promise.resolve(EMPTY_REQUEST);

    if (dataType === DataType.Post) {
      const getPostsForm: GetPosts = {
        community_name: communityName,
        ...cursorComponents(cursor),
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        type_: "All",
        show_hidden: showHidden === "true",
        ...cursorComponents(cursor),
      };

      postsFetch = client.getPosts(getPostsForm);
    } else {
      const getCommentsForm: GetComments = {
        community_name: communityName,
        sort: mixedToCommentSortType(sort),
        type_: "All",
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

  get currentRes() {
    if (this.props.dataType === DataType.Post) {
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
            description={res.community_view.community.description}
            image={res.community_view.community.icon}
          />
        )}

        {this.communityInfo()}
        <div className="d-block d-md-none">
          <button
            className="btn btn-secondary d-inline-block mb-2 me-3"
            onClick={linkEvent(this, this.handleShowSidebarMobile)}
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
    return (
      <div className="community container-lg">
        <div className="row">
          <div className="col-12 col-md-8 col-lg-9" ref={this.mainContentRef}>
            {this.renderCommunity()}
            {this.selects()}
            {this.listings()}
            <div class="row">
              <div class="col">
                <PaginatorCursor
                  current={this.props.cursor}
                  resource={this.currentRes}
                  onPageChange={this.handlePageChange}
                />
              </div>
              <div class="col-auto">{this.markPageAsReadButton}</div>
            </div>
          </div>
          <aside className="d-none d-md-block col-md-4 col-lg-3">
            {this.sidebar()}
          </aside>
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
      <div class="my-2">
        <button
          class="btn btn-secondary"
          onClick={linkEvent(this, this.handleMarkPageAsRead)}
        >
          {I18NextService.i18n.t("mark_page_as_read")}
        </button>
      </div>
    );
  }

  async handleMarkPageAsRead(i: Community) {
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

  sidebar() {
    if (this.state.communityRes.state !== "success") {
      return undefined;
    }
    const res = this.state.communityRes.data;
    const siteRes = this.isoData.siteRes;
    // For some reason, this returns an empty vec if it matches the site langs
    const communityLangs =
      res.discussion_languages.length === 0
        ? siteRes.all_languages.map(({ id }) => id)
        : res.discussion_languages;

    return (
      <>
        <Sidebar
          community_view={res.community_view}
          moderators={res.moderators}
          admins={siteRes.admins}
          enableNsfw={enableNsfw(siteRes)}
          editable
          allLanguages={siteRes.all_languages}
          siteLanguages={siteRes.discussion_languages}
          communityLanguages={communityLangs}
          myUserInfo={this.isoData.myUserInfo}
          onDeleteCommunity={this.handleDeleteCommunity}
          onRemoveCommunity={this.handleRemoveCommunity}
          onLeaveModTeam={this.handleAddModToCommunity}
          onFollowCommunity={this.handleFollow}
          onBlockCommunity={this.handleBlockCommunity}
          onPurgeCommunity={this.handlePurgeCommunity}
          onEditCommunity={this.handleEditCommunity}
          onUpdateCommunityNotifs={this.handleUpdateCommunityNotifs}
        />
        {!res.community_view.community.local && res.site && (
          <SiteSidebar site={res.site} myUserInfo={this.isoData.myUserInfo} />
        )}
      </>
    );
  }

  listings() {
    const { dataType } = this.props;
    const siteRes = this.isoData.siteRes;

    if (dataType === DataType.Post) {
      switch (this.state.postsRes.state) {
        case "loading":
          return <PostsLoadingSkeleton />;
        case "success":
          return (
            <PostListings
              posts={this.state.postsRes.data.posts}
              showDupes="ShowSeparately"
              markable
              enableNsfw={enableNsfw(siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onBlockPerson={this.handleBlockPerson}
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
              expandAllImages={this.state.expandAllImages}
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
              nodes={commentsToFlatNodes(this.state.commentsRes.data.comments)}
              viewType={CommentViewType.Flat}
              isTopLevel
              showContext
              admins={siteRes.admins}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              onSaveComment={this.handleSaveComment}
              onBlockPerson={this.handleBlockPerson}
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
    const { dataType, sort, postTimeRange, showHidden } = this.props;
    const communityRss = res
      ? communityRSSUrl(res.community_view.community, sort)
      : undefined;

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
          <button
            class="btn btn-secondary"
            onClick={this.handleExpandImageClick}
            aria-label={I18NextService.i18n.t("expand_all_images")}
            data-tippy-content={I18NextService.i18n.t("expand_all_images")}
          >
            <Icon icon={this.state.expandAllImages ? "minus" : "plus"} />
          </button>
        </div>
        {communityRss && (
          <>
            <a href={communityRss} title="RSS" rel={relTags}>
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link
              rel="alternate"
              type="application/atom+xml"
              href={communityRss}
            />
          </>
        )}
      </div>
    );
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  handleSortChange(sort: PostSortType) {
    this.updateUrl({ sort, cursor: undefined });
  }

  handlePostTimeRangeChange(val: number) {
    this.updateUrl({ postTimeRange: val, cursor: undefined });
  }

  handleCommentSortChange(sort: CommentSortType) {
    this.updateUrl({ sort, cursor: undefined });
  }

  handleDataTypeChange(dataType: DataType) {
    this.updateUrl({ dataType, cursor: undefined });
  }

  handleShowHiddenChange(show?: StringBoolean) {
    this.updateUrl({
      showHidden: show,
      cursor: undefined,
    });
  }

  handleShowSidebarMobile(i: Community) {
    i.setState(({ showSidebarMobile }) => ({
      showSidebarMobile: !showSidebarMobile,
    }));
  }

  handleExpandImageClick() {
    this.setState({ expandAllImages: !this.state.expandAllImages });
  }

  async updateUrl(props: Partial<CommunityProps>) {
    const {
      dataType,
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
      dataType: getDataTypeString(dataType ?? DataType.Post),
      cursor,
      sort,
      showHidden: showHidden,
    };

    this.props.history.push(`/c/${name}${getQueryString(queryParams)}`);
  }

  fetchDataToken?: symbol;
  async fetchData(props: CommunityRouteProps) {
    const token = (this.fetchDataToken = Symbol());
    const { dataType, cursor, sort, postTimeRange, showHidden } = props;
    const { name } = props.match.params;

    if (dataType === DataType.Post) {
      this.setState({ postsRes: LOADING_REQUEST, commentsRes: EMPTY_REQUEST });
      const postsRes = await HttpService.client.getPosts({
        ...cursorComponents(cursor),
        sort: mixedToPostSortType(sort),
        time_range_seconds: postTimeRange,
        type_: "All",
        community_name: name,
        show_hidden: showHidden === "true",
      });
      if (token === this.fetchDataToken) {
        this.setState({ postsRes });
      }
    } else {
      this.setState({ commentsRes: LOADING_REQUEST, postsRes: EMPTY_REQUEST });
      const commentsRes = await HttpService.client.getComments({
        sort: mixedToCommentSortType(sort),
        type_: "All",
        community_name: name,
      });
      if (token === this.fetchDataToken) {
        this.setState({ commentsRes });
      }
    }
  }

  async handleDeleteCommunity(form: DeleteCommunity) {
    const deleteCommunityRes = await HttpService.client.deleteCommunity(form);
    this.updateCommunity(deleteCommunityRes);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    const addModRes = await HttpService.client.addModToCommunity(form);
    this.updateModerators(addModRes);
  }

  async handleFollow(form: FollowCommunity) {
    const followCommunityRes = await HttpService.client.followCommunity(form);
    this.updateCommunity(followCommunityRes);

    // Update myUserInfo
    if (followCommunityRes.state === "success") {
      const communityId = followCommunityRes.data.community_view.community.id;
      const mui = this.isoData.myUserInfo;
      if (mui) {
        mui.follows = mui.follows.filter(i => i.community.id !== communityId);
      }
    }
  }

  async handlePurgeCommunity(form: PurgeCommunity) {
    const purgeCommunityRes = await HttpService.client.purgeCommunity(form);
    this.purgeItem(purgeCommunityRes);
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

  async handleBlockCommunity(form: BlockCommunity) {
    const blockCommunityRes = await HttpService.client.blockCommunity(form);
    if (blockCommunityRes.state === "success") {
      updateCommunityBlock(blockCommunityRes.data, this.isoData.myUserInfo);
      this.setState(s => {
        if (s.communityRes.state === "success" && this.isoData.myUserInfo) {
          const cv = s.communityRes.data.community_view;
          if (!cv.community_actions) {
            cv.community_actions = {};
          }
          cv.community_actions.blocked_at = nowBoolean(
            blockCommunityRes.data.blocked,
          );
        }
      });
    }
  }

  async handleBlockPerson(form: BlockPerson) {
    const blockPersonRes = await HttpService.client.blockPerson(form);
    if (blockPersonRes.state === "success") {
      updatePersonBlock(blockPersonRes.data, this.isoData.myUserInfo);
    }
  }

  async handleRemoveCommunity(form: RemoveCommunity) {
    const removeCommunityRes = await HttpService.client.removeCommunity(form);
    this.updateCommunity(removeCommunityRes);
  }

  async handleEditCommunity(form: EditCommunity) {
    const res = await HttpService.client.editCommunity(form);
    this.updateCommunity(res);

    return res;
  }

  async handleUpdateCommunityNotifs(form: UpdateCommunityNotifications) {
    const res = await HttpService.client.updateCommunityNotifications(form);
    if (res.state === "success") {
      toast(I18NextService.i18n.t("notifications_updated"));
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
    const transferCommunityRes =
      await HttpService.client.transferCommunity(form);
    toast(I18NextService.i18n.t("transfer_community"));
    this.updateCommunityFull(transferCommunityRes);
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
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

  updateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.discussion_languages =
          res.data.discussion_languages;
      }
      return s;
    });
  }

  updateCommunityFull(res: RequestState<GetCommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.moderators = res.data.moderators;
      }
      return s;
    });
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

  updateModerators(res: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }
}
