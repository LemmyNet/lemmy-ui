import {
  defaultPostListingMode,
  editPersonNotes,
  editPost,
  enableNsfw,
  mixedToPostSortType,
  multiCommunityRSSUrl,
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
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  PersonResponse,
  BlockCommunity,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  EditPost,
  FeaturePost,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  HidePost,
  LemmyHttp,
  LockPost,
  PostResponse,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  PostSortType,
  SuccessResponse,
  TransferCommunity,
  MyUserInfo,
  MarkPostAsRead,
  NotePerson,
  GetMultiCommunityResponse,
  GetMultiCommunity,
  FollowMultiCommunity,
  UpdateMultiCommunity,
  PostListingMode,
  MultiCommunityResponse,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
import { InitialFetchRequest } from "@utils/types";
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
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { PostSortSelect } from "../common/sort-select";
import { PostListings } from "../post/post-listings";
import { PaginatorCursor } from "../common/paginator-cursor";
import { getHttpBaseInternal } from "../../utils/env";
import { PostsLoadingSkeleton } from "../common/loading-skeleton";
import { MultiCommunitySidebar } from "./multi-community-sidebar";
import { IRoutePropsWithFetch } from "@utils/routes";
import PostHiddenSelect from "../common/post-hidden-select";
import { isBrowser } from "@utils/browser";
import { nowBoolean } from "@utils/date";
import { TimeIntervalSelect } from "@components/common/time-interval-select";
import { LoadingEllipses } from "@components/common/loading-ellipses";
import { MultiCommunityLink } from "./multi-community-link";
import { PostListingModeSelect } from "@components/common/post-listing-mode-select";

type MultiCommunityData = RouteDataResponse<{
  multiCommunityRes: GetMultiCommunityResponse;
  postsRes: GetPostsResponse;
}>;

interface State {
  multiCommunityRes: RequestState<GetMultiCommunityResponse>;
  postsRes: RequestState<GetPostsResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  isIsomorphic: boolean;
  markPageAsReadLoading: boolean;
  postListingMode: PostListingMode;
}

interface Props {
  sort: PostSortType;
  postTimeRange: number;
  cursor?: DirectionalCursor;
  showHidden?: StringBoolean;
}

type Fallbacks = {
  sort: PostSortType;
  postTimeRange: number;
};

export function getMultiCommunityQueryParams(
  source: string | undefined,
  siteRes: GetSiteResponse,
  myUserInfo?: MyUserInfo,
) {
  const local_user = myUserInfo?.local_user_view.local_user;
  const local_site = siteRes.site_view.local_site;
  return getQueryParams<Props, Fallbacks>(
    {
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

function getSortTypeFromQuery(
  type: string | undefined,
  fallback: PostSortType,
): PostSortType {
  return type ? (type as PostSortType) : fallback;
}

function getPostTimeRangeFromQuery(
  type: string | undefined,
  fallback: number,
): number {
  return type ? Number(type) : fallback;
}

// TODO this should probably be the multi-community name like the others, not id
type PathProps = { id: string };
type RouteProps = RouteComponentProps<PathProps> & Props;
export type CommunityFetchConfig = IRoutePropsWithFetch<
  MultiCommunityData,
  PathProps,
  Props
>;

@scrollMixin
@tippyMixin
export class MultiCommunity extends Component<RouteProps, State> {
  private isoData = setIsoData<MultiCommunityData>(this.context);
  state: State = {
    multiCommunityRes: EMPTY_REQUEST,
    postsRes: EMPTY_REQUEST,
    siteRes: this.isoData.siteRes,
    showSidebarMobile: false,
    isIsomorphic: false,
    markPageAsReadLoading: false,
    postListingMode: defaultPostListingMode(this.isoData),
  };
  private readonly mainContentRef: RefObject<HTMLDivElement>;

  loadingSettled() {
    return resourcesSettled([
      this.state.multiCommunityRes,
      this.state.postsRes,
    ]);
  }

  constructor(props: RouteProps, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePostTimeRangeChange = this.handlePostTimeRangeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    // All of the action binds
    this.handleFollow = this.handleFollow.bind(this);
    this.handleBlockCommunity = this.handleBlockCommunity.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
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
    this.handlePostListingModeChange =
      this.handlePostListingModeChange.bind(this);

    this.mainContentRef = createRef();
    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { multiCommunityRes, postsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        multiCommunityRes,
        postsRes,
      };
    }
  }

  fetchMultiCommunityToken?: symbol;
  async fetchMultiCommunity(props: RouteProps) {
    const token = (this.fetchMultiCommunityToken = Symbol());
    this.setState({ multiCommunityRes: LOADING_REQUEST });
    const id = Number(decodeURIComponent(props.match.params.id));
    const multiCommunityRes = await HttpService.client.getMultiCommunity({
      id,
    });
    if (token === this.fetchMultiCommunityToken) {
      this.setState({ multiCommunityRes });
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await Promise.all([
        this.fetchMultiCommunity(this.props),
        this.fetchData(this.props),
      ]);
    }
  }

  componentWillReceiveProps(
    nextProps: RouteProps & { children?: InfernoNode },
  ) {
    if (
      bareRoutePush(this.props, nextProps) ||
      this.props.match.params.id !== nextProps.match.params.id
    ) {
      this.fetchMultiCommunity(nextProps);
    }
    this.fetchData(nextProps);
  }

  static async fetchInitialData({
    headers,
    query: { cursor, sort, postTimeRange, showHidden },
    match: { params: props },
  }: InitialFetchRequest<PathProps, Props>): Promise<MultiCommunityData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const multiCommunityId = Number(decodeURIComponent(props.id));
    const multiCommunityForm: GetMultiCommunity = {
      id: multiCommunityId,
    };

    const getPostsForm: GetPosts = {
      multi_community_id: multiCommunityId,
      ...cursorComponents(cursor),
      sort: mixedToPostSortType(sort),
      time_range_seconds: postTimeRange,
      type_: "all",
      show_hidden: showHidden === "true",
      ...cursorComponents(cursor),
    };

    const postsFetch = client.getPosts(getPostsForm);

    const multiCommunityFetch = client.getMultiCommunity(multiCommunityForm);

    const [multiCommunityRes, postsRes] = await Promise.all([
      multiCommunityFetch,
      postsFetch,
    ]);

    return {
      multiCommunityRes,
      postsRes,
    };
  }

  get currentRes() {
    return this.state.postsRes;
  }

  get documentTitle(): string {
    const cRes = this.state.multiCommunityRes;
    return cRes.state === "success"
      ? `${cRes.data.multi_community_view.multi.title ?? cRes.data.multi_community_view.multi.name} - ${this.isoData.siteRes.site_view.site.name}`
      : "";
  }

  renderCommunity() {
    const res =
      this.state.multiCommunityRes.state === "success" &&
      this.state.multiCommunityRes.data;
    return (
      <>
        {res && (
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            canonicalPath={res.multi_community_view.multi.ap_id}
            description={res.multi_community_view.multi.description}
          />
        )}

        {this.multiCommunityInfo()}
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
      <div className="multi-community container-lg">
        <div className="row">
          <div className="col-12 col-md-8 col-lg-9" ref={this.mainContentRef}>
            {this.renderCommunity()}
            {this.selects()}
            {this.listings()}
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
          <aside className="d-none d-md-block col-md-4 col-lg-3">
            {this.sidebar()}
          </aside>
        </div>
      </div>
    );
  }

  get markPageAsReadButton(): InfernoNode {
    const { postsRes, markPageAsReadLoading } = this.state;

    if (markPageAsReadLoading) return <Spinner />;

    const haveUnread =
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

  async handleMarkPageAsRead(i: MultiCommunity) {
    const { postsRes } = i.state;

    const post_ids =
      postsRes.state === "success" &&
      postsRes.data.posts
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
    if (this.state.multiCommunityRes.state !== "success") {
      return undefined;
    }
    const res = this.state.multiCommunityRes.data;

    return (
      <MultiCommunitySidebar
        multiCommunityView={res.multi_community_view}
        editable
        myUserInfo={this.isoData.myUserInfo}
        onFollow={this.handleFollow}
        onEdit={this.handleEditMultiCommunity}
      />
    );
  }

  listings() {
    const siteRes = this.isoData.siteRes;

    switch (this.state.postsRes.state) {
      case "loading":
        return <PostsLoadingSkeleton />;
      case "success":
        return (
          <PostListings
            posts={this.state.postsRes.data.posts}
            showCrossPosts="small"
            showCommunity
            viewOnly={false}
            postListingMode={"list"}
            markable
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
            onScrollIntoCommentsClick={() => {}}
          />
        );
    }
  }

  multiCommunityInfo() {
    const res =
      (this.state.multiCommunityRes.state === "success" &&
        this.state.multiCommunityRes.data) ||
      undefined;
    const multi = res && res.multi_community_view.multi;

    return (
      <div className="mb-2">
        <div>
          <h1 className="h4 mb-0 overflow-wrap-anywhere d-inline">
            {multi ? multi.title || multi.name : <LoadingEllipses />}
          </h1>
        </div>
        {multi && (
          <MultiCommunityLink
            multiCommunity={multi}
            realLink
            useApubName
            muted
            myUserInfo={this.isoData.myUserInfo}
          />
        )}
      </div>
    );
  }

  selects() {
    const { sort, postTimeRange, showHidden } = this.props;

    const res =
      this.state.multiCommunityRes.state === "success" &&
      this.state.multiCommunityRes.data;
    const multiCommunityRss = res
      ? multiCommunityRSSUrl(res.multi_community_view.multi, sort)
      : undefined;

    return (
      <div className="row align-items-center mb-3 g-3">
        {this.isoData.myUserInfo && (
          <div className="col-auto">
            <PostHiddenSelect
              showHidden={showHidden}
              onShowHiddenChange={this.handleShowHiddenChange}
            />
          </div>
        )}
        <div className="col-auto">
          <PostListingModeSelect
            current={this.state.postListingMode}
            onChange={this.handlePostListingModeChange}
          />
        </div>
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
        {multiCommunityRss && (
          <>
            <a href={multiCommunityRss} title="RSS" rel={relTags}>
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link
              rel="alternate"
              type="application/atom+xml"
              href={multiCommunityRss}
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

  handleShowHiddenChange(show?: StringBoolean) {
    this.updateUrl({
      showHidden: show,
      cursor: undefined,
    });
  }

  handleShowSidebarMobile(i: MultiCommunity) {
    i.setState(({ showSidebarMobile }) => ({
      showSidebarMobile: !showSidebarMobile,
    }));
  }

  async updateUrl(props: Partial<Props>) {
    const {
      cursor,
      sort,
      showHidden,
      match: {
        params: { id },
      },
    } = {
      ...this.props,
      ...props,
    };

    const queryParams: QueryParams<Props> = {
      cursor,
      sort,
      showHidden: showHidden,
    };

    this.props.history.push(`/m/${id}${getQueryString(queryParams)}`);
  }

  fetchDataToken?: symbol;
  async fetchData(props: RouteProps) {
    const token = (this.fetchDataToken = Symbol());
    const { cursor, sort, postTimeRange, showHidden } = props;
    const id = Number(decodeURIComponent(props.match.params.id));

    this.setState({ postsRes: LOADING_REQUEST });
    const postsRes = await HttpService.client.getPosts({
      ...cursorComponents(cursor),
      sort: mixedToPostSortType(sort),
      time_range_seconds: postTimeRange,
      type_: "all",
      multi_community_id: id,
      show_hidden: showHidden === "true",
    });
    if (token === this.fetchDataToken) {
      this.setState({ postsRes });
    }
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    const addModRes = await HttpService.client.addModToCommunity(form);
    if (addModRes.state === "success") {
      toast(
        I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"),
      );
    }
  }

  async handleFollow(form: FollowMultiCommunity) {
    const res = await HttpService.client.followMultiCommunity(form);
    this.updateMultiCommunity(res);
  }

  async handlePurgePerson(form: PurgePerson) {
    const purgePersonRes = await HttpService.client.purgePerson(form);
    this.purgeItem(purgePersonRes);
  }

  async handlePurgePost(form: PurgePost) {
    const purgeRes = await HttpService.client.purgePost(form);
    this.purgeItem(purgeRes);
  }

  async handleBlockCommunity(form: BlockCommunity) {
    const blockCommunityRes = await HttpService.client.blockCommunity(form);
    if (blockCommunityRes.state === "success") {
      updateCommunityBlock(
        blockCommunityRes.data,
        form.block,
        this.isoData.myUserInfo,
      );
    }
  }

  async handleBlockPerson(form: BlockPerson) {
    const blockPersonRes = await HttpService.client.blockPerson(form);
    if (blockPersonRes.state === "success") {
      updatePersonBlock(
        blockPersonRes.data,
        form.block,
        this.isoData.myUserInfo,
      );
    }
  }

  async handleEditMultiCommunity(form: UpdateMultiCommunity) {
    const res = await HttpService.client.updateMultiCommunity(form);
    this.updateMultiCommunity(res);

    return res;
  }

  async handleDeletePost(form: DeletePost) {
    const deleteRes = await HttpService.client.deletePost(form);
    this.findAndUpdatePost(deleteRes);
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = await HttpService.client.removePost(form);
    this.findAndUpdatePost(removeRes);
  }

  async handleSavePost(form: SavePost) {
    const saveRes = await HttpService.client.savePost(form);
    this.findAndUpdatePost(saveRes);
  }

  async handleFeaturePost(form: FeaturePost) {
    const featureRes = await HttpService.client.featurePost(form);
    this.findAndUpdatePost(featureRes);
  }

  // TODO why is this one not like the others?
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

  // TODO same here, why is this not like the others?
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

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = await HttpService.client.addAdmin(form);

    if (addAdminRes.state === "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    const transferCommunityRes =
      await HttpService.client.transferCommunity(form);
    if (transferCommunityRes.state === "success") {
      toast(I18NextService.i18n.t("transfer_community"));
    }
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes, form.ban);
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
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<PersonResponse>, banned: boolean) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator_banned = banned));
        }
        return s;
      });
    }
  }

  updateMultiCommunity(res: RequestState<MultiCommunityResponse>) {
    this.setState(s => {
      if (s.multiCommunityRes.state === "success" && res.state === "success") {
        s.multiCommunityRes.data.multi_community_view =
          res.data.multi_community_view;
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
