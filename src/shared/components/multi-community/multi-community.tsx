import {
  defaultPostListingMode,
  editPersonNotes,
  editPost,
  enableNsfw,
  mixedToPostSortType,
  multiCommunityRSSUrl,
  reportToast,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
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
  BanFromCommunity,
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
  PagedResponse,
  PostView,
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
  PostListingMode,
  MultiCommunityResponse,
  PaginationCursor,
  PostId,
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
import { PostSortDropdown } from "../common/sort-dropdown";
import { PostListings } from "../post/post-listings";
import { PaginatorCursor } from "../common/paginator-cursor";
import { getHttpBaseInternal } from "../../utils/env";
import { PostsLoadingSkeleton } from "../common/loading-skeleton";
import { MultiCommunitySidebar } from "./multi-community-sidebar";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { nowBoolean } from "@utils/date";
import { TimeIntervalFilter } from "@components/common/time-interval-filter";
import { LoadingEllipses } from "@components/common/loading-ellipses";
import { MultiCommunityLink } from "./multi-community-link";
import { PostListingModeDropdown } from "@components/common/post-listing-mode-dropdown";
import { MultiCommunityEntryList } from "./multi-community-entry-form";
import { FilterChipCheckbox } from "@components/common/filter-chip-checkbox";

type MultiCommunityData = RouteDataResponse<{
  multiCommunityRes: GetMultiCommunityResponse;
  postsRes: PagedResponse<PostView>;
}>;

type State = {
  multiCommunityRes: RequestState<GetMultiCommunityResponse>;
  postsRes: RequestState<PagedResponse<PostView>>;
  followRes: RequestState<MultiCommunityResponse>;
  votePostRes: ItemIdAndRes<PostId, PostResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  isIsomorphic: boolean;
  markPageAsReadLoading: boolean;
  postListingMode: PostListingMode;
};

interface Props {
  sort: PostSortType;
  postTimeRange: number;
  cursor?: PaginationCursor;
  showHidden?: boolean;
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

function getShowHiddenFromQuery(hidden: string | undefined): boolean {
  return hidden === "true";
}

type PathProps = { name: string };
type RouteProps = RouteComponentProps<PathProps> & Props;
export type MultiCommunityFetchConfig = IRoutePropsWithFetch<
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
    followRes: EMPTY_REQUEST,
    votePostRes: { id: 0, res: EMPTY_REQUEST },
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
    const name = decodeURIComponent(props.match.params.name);
    const multiCommunityRes = await HttpService.client.getMultiCommunity({
      name,
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
      this.props.match.params.name !== nextProps.match.params.name
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

    const name = decodeURIComponent(props.name);
    const multiCommunityForm: GetMultiCommunity = {
      name,
    };

    const getPostsForm: GetPosts = {
      multi_community_name: name,
      sort: mixedToPostSortType(sort),
      time_range_seconds: postTimeRange,
      type_: "all",
      show_hidden: showHidden,
      page_cursor: cursor,
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
            description={res.multi_community_view.multi.summary}
          />
        )}

        {this.multiCommunityInfo()}
        <div className="d-block d-md-none">
          <button
            className="btn btn-light border-light-subtle d-inline-block mb-2 me-3"
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
          {this.state.showSidebarMobile && this.communities()}
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
                  onPageChange={cursor => handlePageChange(this, cursor)}
                />
              </div>
              <div className="col-auto">{this.markPageAsReadButton}</div>
            </div>
          </div>
          <aside className="d-none d-md-block col-md-4 col-lg-3">
            {this.sidebar()}
            {this.communities()}
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
      postsRes.data.items.some(p => !p.post_actions?.read_at);

    if (!haveUnread || !this.isoData.myUserInfo) return undefined;
    return (
      <div className="my-2">
        <button
          className="btn btn-light border-light-subtle"
          onClick={() => handleMarkPageAsRead(this, this.isoData.myUserInfo)}
        >
          {I18NextService.i18n.t("mark_page_as_read")}
        </button>
      </div>
    );
  }

  sidebar() {
    if (this.state.multiCommunityRes.state !== "success") {
      return undefined;
    }
    const res = this.state.multiCommunityRes.data;

    return (
      <MultiCommunitySidebar
        multiCommunityView={res.multi_community_view}
        myUserInfo={this.isoData.myUserInfo}
        onFollow={form => handleFollow(this, form)}
        followLoading={this.state.followRes.state === "loading"}
      />
    );
  }

  communities() {
    const res =
      this.state.multiCommunityRes.state === "success" &&
      this.state.multiCommunityRes.data;

    const isCreator =
      res &&
      this.isoData.myUserInfo?.local_user_view.person.id ===
        res.multi_community_view.owner.id;

    return (
      res && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">
              {I18NextService.i18n.t("communities")}
            </h5>
            <MultiCommunityEntryList
              communities={res.communities}
              isCreator={isCreator}
              myUserInfo={this.isoData.myUserInfo}
            />
          </div>
        </div>
      )
    );
  }

  listings() {
    const { siteRes, myUserInfo } = this.isoData;

    switch (this.state.postsRes.state) {
      case "loading":
        return <PostsLoadingSkeleton />;
      case "success":
        return (
          <PostListings
            posts={this.state.postsRes.data.items}
            showCrossPosts="small"
            showCommunity
            viewOnly={false}
            postListingMode={this.state.postListingMode}
            showMarkRead="dropdown"
            enableNsfw={enableNsfw(siteRes)}
            showAdultConsentModal={this.isoData.showAdultConsentModal}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={myUserInfo}
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
            onMarkPostAsRead={form =>
              handleMarkPostAsRead(this, form, myUserInfo)
            }
            onHidePost={form => handleHidePost(this, form, myUserInfo)}
            onPersonNote={form => handlePersonNote(this, form)}
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

    const myUserInfo = this.isoData.myUserInfo;
    const res =
      this.state.multiCommunityRes.state === "success" &&
      this.state.multiCommunityRes.data;
    const multiCommunityRss = res
      ? multiCommunityRSSUrl(res.multi_community_view.multi, sort)
      : undefined;

    return (
      <div className="row row-cols-auto align-items-center g-3 mb-3">
        {this.isoData.myUserInfo && (
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
            showLabel
          />
        </div>
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
        {multiCommunityRss && (
          <div className="col">
            <a href={multiCommunityRss} title="RSS" rel={relTags}>
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link
              rel="alternate"
              type="application/atom+xml"
              href={multiCommunityRss}
            />
          </div>
        )}
      </div>
    );
  }

  updateUrl(props: Partial<Props>) {
    const {
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

    const queryParams: QueryParams<Props> = {
      cursor,
      sort,
      showHidden: showHidden?.toString(),
    };

    this.props.history.push(`/m/${name}${getQueryString(queryParams)}`);
  }

  fetchDataToken?: symbol;
  async fetchData(props: RouteProps) {
    const token = (this.fetchDataToken = Symbol());
    const { cursor, sort, postTimeRange, showHidden } = props;
    const multi_community_name = decodeURIComponent(props.match.params.name);

    this.setState({ postsRes: LOADING_REQUEST });
    const postsRes = await HttpService.client.getPosts({
      page_cursor: cursor,
      sort: mixedToPostSortType(sort),
      time_range_seconds: postTimeRange,
      type_: "all",
      multi_community_name,
      show_hidden: showHidden,
    });
    if (token === this.fetchDataToken) {
      this.setState({ postsRes });
    }
  }
}

async function handleAddModToCommunity(form: AddModToCommunity) {
  const addModRes = await HttpService.client.addModToCommunity(form);
  if (addModRes.state === "success") {
    toast(I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"));
  }
}

async function handleFollow(i: MultiCommunity, form: FollowMultiCommunity) {
  i.setState({ followRes: LOADING_REQUEST });
  const followRes = await HttpService.client.followMultiCommunity(form);
  i.setState({ followRes });
  updateMultiCommunity(i, followRes);
}

async function handlePurgePerson(i: MultiCommunity, form: PurgePerson) {
  const purgePersonRes = await HttpService.client.purgePerson(form);
  purgeItem(i, purgePersonRes);
}

async function handlePurgePost(i: MultiCommunity, form: PurgePost) {
  const purgeRes = await HttpService.client.purgePost(form);
  purgeItem(i, purgeRes);
}

async function handleBlockCommunity(
  form: BlockCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockCommunityRes = await HttpService.client.blockCommunity(form);
  if (blockCommunityRes.state === "success") {
    updateCommunityBlock(blockCommunityRes.data, form.block, myUserInfo);
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

async function handleDeletePost(i: MultiCommunity, form: DeletePost) {
  const deleteRes = await HttpService.client.deletePost(form);
  findAndUpdatePost(i, deleteRes);
}

async function handleRemovePost(i: MultiCommunity, form: RemovePost) {
  const removeRes = await HttpService.client.removePost(form);
  findAndUpdatePost(i, removeRes);
}

async function handleSavePost(i: MultiCommunity, form: SavePost) {
  const saveRes = await HttpService.client.savePost(form);
  findAndUpdatePost(i, saveRes);
}

async function handleFeaturePost(i: MultiCommunity, form: FeaturePost) {
  const featureRes = await HttpService.client.featurePost(form);
  findAndUpdatePost(i, featureRes);
}

async function handleMarkPostAsRead(
  i: MultiCommunity,
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

async function handlePostEdit(i: MultiCommunity, form: EditPost) {
  const res = await HttpService.client.editPost(form);
  findAndUpdatePost(i, res);
  return res;
}

async function handlePostVote(i: MultiCommunity, form: CreatePostLike) {
  i.setState({ votePostRes: { id: form.post_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.likePost(form);
  i.setState({ votePostRes: { id: form.post_id, res } });
  findAndUpdatePost(i, res);

  return res;
}

async function handlePostReport(form: CreatePostReport) {
  const reportRes = await HttpService.client.createPostReport(form);
  reportToast(reportRes);
}

async function handleLockPost(i: MultiCommunity, form: LockPost) {
  const lockRes = await HttpService.client.lockPost(form);
  findAndUpdatePost(i, lockRes);
}

async function handleHidePost(
  i: MultiCommunity,
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

async function handlePersonNote(i: MultiCommunity, form: NotePerson) {
  const res = await HttpService.client.notePerson(form);

  if (res.state === "success") {
    i.setState(s => {
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

async function handleAddAdmin(i: MultiCommunity, form: AddAdmin) {
  const addAdminRes = await HttpService.client.addAdmin(form);

  if (addAdminRes.state === "success") {
    i.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
  }
}

async function handleTransferCommunity(form: TransferCommunity) {
  const transferCommunityRes = await HttpService.client.transferCommunity(form);
  if (transferCommunityRes.state === "success") {
    toast(I18NextService.i18n.t("transfer_community"));
  }
}

async function handleBanFromCommunity(
  i: MultiCommunity,
  form: BanFromCommunity,
) {
  const banRes = await HttpService.client.banFromCommunity(form);
  updateBanFromCommunity(i, banRes, form.ban);
}

async function handleBanPerson(i: MultiCommunity, form: BanPerson) {
  const banRes = await HttpService.client.banPerson(form);
  updateBan(i, banRes, form.ban);
}

async function handlePostListingModeChange(
  i: MultiCommunity,
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

function updateBanFromCommunity(
  i: MultiCommunity,
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
      return s;
    });
  }
}

function updateBan(
  i: MultiCommunity,
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
      return s;
    });
  }
}

function updateMultiCommunity(
  i: MultiCommunity,
  res: RequestState<MultiCommunityResponse>,
) {
  i.setState(s => {
    if (s.multiCommunityRes.state === "success" && res.state === "success") {
      s.multiCommunityRes.data.multi_community_view =
        res.data.multi_community_view;
    }
    return s;
  });
}

function purgeItem(i: MultiCommunity, purgeRes: RequestState<SuccessResponse>) {
  if (purgeRes.state === "success") {
    toast(I18NextService.i18n.t("purge_success"));
    i.context.router.history.push(`/`);
  }
}

function findAndUpdatePost(i: MultiCommunity, res: RequestState<PostResponse>) {
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

function handlePageChange(i: MultiCommunity, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleSortChange(i: MultiCommunity, sort: PostSortType) {
  i.updateUrl({ sort, cursor: undefined });
}

function handlePostTimeRangeChange(i: MultiCommunity, val: number) {
  i.updateUrl({ postTimeRange: val, cursor: undefined });
}

function handleShowHiddenChange(i: MultiCommunity, showHidden: boolean) {
  i.updateUrl({
    showHidden,
    cursor: undefined,
  });
}

function handleShowSidebarMobile(i: MultiCommunity) {
  i.setState(({ showSidebarMobile }) => ({
    showSidebarMobile: !showSidebarMobile,
  }));
}

async function handleMarkPageAsRead(
  i: MultiCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  const { postsRes } = i.state;

  const post_ids =
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
