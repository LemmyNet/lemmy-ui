import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent, MouseEventHandler } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddAdminResponse,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentReplyResponse,
  CommentReportResponse,
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
  FeaturePost,
  GetComments,
  GetCommentsResponse,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  PersonMentionResponse,
  PostReportResponse,
  PostResponse,
  PurgeComment,
  PurgeItemResponse,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  SortType,
  TransferCommunity,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService } from "../../services";
import {
  apiWrapper,
  apiWrapperIso,
  HttpService,
  RequestState,
} from "../../services/HttpService";
import {
  canCreateCommunity,
  commentsToFlatNodes,
  editComments,
  editCommentWithCommentReplies,
  editPosts,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  getDataTypeString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  getRandomFromList,
  isInitialRoute,
  mdToHtml,
  myAuth,
  postToCommentSortType,
  QueryParams,
  relTags,
  restoreScrollPosition,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  showLocal,
  toast,
  trendingFetchLimit,
  updatePersonBlock,
} from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { DataTypeSelect } from "../common/data-type-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PostListings } from "../post/post-listings";
import { SiteSidebar } from "./site-sidebar";

interface HomeState {
  postsRes: RequestState<GetPostsResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  trendingCommunitiesRes: RequestState<ListCommunitiesResponse>;

  // Other responses, used for loading indicators.
  addModRes: RequestState<AddModToCommunityResponse>;

  votePostRes: RequestState<PostResponse>;
  reportPostRes: RequestState<PostReportResponse>;
  blockPostRes: RequestState<PostResponse>;
  lockPostRes: RequestState<PostResponse>;
  deletePostRes: RequestState<PostResponse>;
  removePostRes: RequestState<PostResponse>;
  savePostRes: RequestState<PostResponse>;
  featurePostCommunityRes: RequestState<PostResponse>;
  featurePostLocalRes: RequestState<PostResponse>;
  banPersonRes: RequestState<BanPersonResponse>;
  banFromCommunityRes: RequestState<BanPersonResponse>;
  addAdminRes: RequestState<AddAdminResponse>;
  transferCommunityRes: RequestState<CommunityResponse>;
  purgePostRes: RequestState<PurgeItemResponse>;
  purgePersonRes: RequestState<PurgeItemResponse>;

  createCommentRes: RequestState<CommentResponse>;
  editCommentRes: RequestState<CommentResponse>;
  voteCommentRes: RequestState<CommentResponse>;
  saveCommentRes: RequestState<CommentResponse>;
  readCommentReplyRes: RequestState<CommentReplyResponse>;
  readPersonMentionRes: RequestState<PersonMentionResponse>;
  blockPersonRes: RequestState<BlockPersonResponse>;
  deleteCommentRes: RequestState<CommentResponse>;
  removeCommentRes: RequestState<CommentResponse>;
  distinguishCommentRes: RequestState<CommentResponse>;
  fetchChildrenRes: RequestState<GetCommentsResponse>;
  reportCommentRes: RequestState<CommentReportResponse>;
  purgeCommentRes: RequestState<PurgeItemResponse>;

  showSubscribedMobile: boolean;
  showTrendingMobile: boolean;
  showSidebarMobile: boolean;
  subscribedCollapsed: boolean;
  tagline?: string;
  siteRes: GetSiteResponse;
}

interface HomeProps {
  listingType: ListingType;
  dataType: DataType;
  sort: SortType;
  page: number;
}

function getDataTypeFromQuery(type?: string): DataType {
  return type ? DataType[type] : DataType.Post;
}

function getListingTypeFromQuery(type?: string): ListingType {
  const myListingType =
    UserService.Instance.myUserInfo?.local_user_view?.local_user
      ?.default_listing_type;

  return type ? (type as ListingType) : myListingType ?? "Local";
}

function getSortTypeFromQuery(type?: string): SortType {
  const mySortType =
    UserService.Instance.myUserInfo?.local_user_view?.local_user
      ?.default_sort_type;

  return type ? (type as SortType) : mySortType ?? "Active";
}

const getHomeQueryParams = () =>
  getQueryParams<HomeProps>({
    sort: getSortTypeFromQuery,
    listingType: getListingTypeFromQuery,
    page: getPageFromString,
    dataType: getDataTypeFromQuery,
  });

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
    className="btn btn-secondary d-inline-block mb-2 mr-3"
    onClick={onClick}
  >
    {i18n.t(textKey)}{" "}
    <Icon icon={show ? `minus-square` : `plus-square`} classes="icon-inline" />
  </button>
);

const LinkButton = ({
  path,
  translationKey,
}: {
  path: string;
  translationKey: NoOptionI18nKeys;
}) => (
  <Link className="btn btn-secondary btn-block" to={path}>
    {i18n.t(translationKey)}
  </Link>
);

export class Home extends Component<any, HomeState> {
  private isoData = setIsoData(this.context);
  state: HomeState = {
    postsRes: { state: "empty" },
    commentsRes: { state: "empty" },
    trendingCommunitiesRes: { state: "empty" },
    addModRes: { state: "empty" },
    votePostRes: { state: "empty" },
    reportPostRes: { state: "empty" },
    blockPostRes: { state: "empty" },
    lockPostRes: { state: "empty" },
    deletePostRes: { state: "empty" },
    removePostRes: { state: "empty" },
    savePostRes: { state: "empty" },
    featurePostCommunityRes: { state: "empty" },
    featurePostLocalRes: { state: "empty" },
    banPersonRes: { state: "empty" },
    banFromCommunityRes: { state: "empty" },
    addAdminRes: { state: "empty" },
    transferCommunityRes: { state: "empty" },
    purgePostRes: { state: "empty" },
    purgePersonRes: { state: "empty" },
    createCommentRes: { state: "empty" },
    editCommentRes: { state: "empty" },
    voteCommentRes: { state: "empty" },
    saveCommentRes: { state: "empty" },
    readCommentReplyRes: { state: "empty" },
    readPersonMentionRes: { state: "empty" },
    blockPersonRes: { state: "empty" },
    deleteCommentRes: { state: "empty" },
    removeCommentRes: { state: "empty" },
    distinguishCommentRes: { state: "empty" },
    fetchChildrenRes: { state: "empty" },
    reportCommentRes: { state: "empty" },
    purgeCommentRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    showSubscribedMobile: false,
    showTrendingMobile: false,
    showSidebarMobile: false,
    subscribedCollapsed: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleCommentVote = this.handleCommentVote.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleCommentReport = this.handleCommentReport.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleCommentReplyRead = this.handleCommentReplyRead.bind(this);
    this.handlePersonMentionRead = this.handlePersonMentionRead.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePostLocal = this.handleFeaturePostLocal.bind(this);
    this.handleFeaturePostCommunity =
      this.handleFeaturePostCommunity.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      const postsRes = this.isoData.routeData[0] as
        | GetPostsResponse
        | undefined;
      const commentsRes = this.isoData.routeData[1] as
        | GetCommentsResponse
        | undefined;
      const trendingRes = this.isoData.routeData[2] as
        | ListCommunitiesResponse
        | undefined;

      if (postsRes) {
        this.state = { ...this.state, postsRes: apiWrapperIso(postsRes) };
      }

      if (commentsRes) {
        this.state = {
          ...this.state,
          commentsRes: apiWrapperIso(commentsRes),
        };
      }

      if (trendingRes) {
        this.state = {
          ...this.state,
          trendingCommunitiesRes: apiWrapperIso(trendingRes),
        };
      }

      const taglines = this.state?.siteRes?.taglines ?? [];
      this.state = {
        ...this.state,
        tagline: getRandomFromList(taglines)?.content,
      };
    }
  }

  async componentDidMount() {
    // This means it hasn't been set up yet
    if (!this.state.siteRes.site_view.local_site.site_setup) {
      this.context.router.history.push("/setup");
    }

    if (!isInitialRoute(this.isoData, this.context)) {
      await this.fetchTrendingCommunities();
      await this.fetchData();
    }
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
  }

  static fetchInitialData({
    client,
    auth,
    query: { dataType: urlDataType, listingType, page: urlPage, sort: urlSort },
  }: InitialFetchRequest<QueryParams<HomeProps>>): Promise<any>[] {
    const dataType = getDataTypeFromQuery(urlDataType);

    // TODO figure out auth default_listingType, default_sort_type
    const type_ = getListingTypeFromQuery(listingType);
    const sort = getSortTypeFromQuery(urlSort);

    const page = urlPage ? Number(urlPage) : 1;

    const promises: Promise<any>[] = [];

    if (dataType === DataType.Post) {
      const getPostsForm: GetPosts = {
        type_,
        page,
        limit: fetchLimit,
        sort,
        saved_only: false,
        auth,
      };

      promises.push(client.getPosts(getPostsForm));
      promises.push(Promise.resolve());
    } else {
      const getCommentsForm: GetComments = {
        page,
        limit: fetchLimit,
        sort: postToCommentSortType(sort),
        type_,
        saved_only: false,
        auth,
      };
      promises.push(Promise.resolve());
      promises.push(client.getComments(getCommentsForm));
    }

    const trendingCommunitiesForm: ListCommunities = {
      type_: "Local",
      sort: "Hot",
      limit: trendingFetchLimit,
      auth,
    };
    promises.push(client.listCommunities(trendingCommunitiesForm));

    return promises;
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
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {site_setup && (
          <div className="row">
            <main role="main" className="col-12 col-md-8">
              {tagline && (
                <div
                  id="tagline"
                  dangerouslySetInnerHTML={mdToHtml(tagline)}
                ></div>
              )}
              <div className="d-block d-md-none">{this.mobileView}</div>
              {this.posts()}
            </main>
            <aside className="d-none d-md-block col-md-4">
              {this.mySidebar}
            </aside>
          </div>
        )}
      </div>
    );
  }

  get hasFollows(): boolean {
    const mui = UserService.Instance.myUserInfo;
    return !!mui && mui.follows.length > 0;
  }

  get mobileView() {
    const {
      siteRes: {
        site_view: { counts, site },
        admins,
        online,
      },
      showSubscribedMobile,
      showTrendingMobile,
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
            textKey="trending"
            show={showTrendingMobile}
            onClick={linkEvent(this, this.handleShowTrendingMobile)}
          />
          <MobileButton
            textKey="sidebar"
            show={showSidebarMobile}
            onClick={linkEvent(this, this.handleShowSidebarMobile)}
          />
          {showSidebarMobile && (
            <SiteSidebar
              site={site}
              admins={admins}
              counts={counts}
              online={online}
              showLocal={showLocal(this.isoData)}
            />
          )}
          {showTrendingMobile && (
            <div className="col-12 card border-secondary mb-3">
              <div className="card-body">{this.trendingCommunities(true)}</div>
            </div>
          )}
          {showSubscribedMobile && (
            <div className="col-12 card border-secondary mb-3">
              <div className="card-body">{this.subscribedCommunities}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  get mySidebar() {
    const {
      siteRes: {
        site_view: { counts, site },
        admins,
        online,
      },
    } = this.state;

    return (
      <div>
        <div>
          <div className="card border-secondary mb-3">
            <div className="card-body">
              {this.trendingCommunities()}
              {canCreateCommunity(this.state.siteRes) && (
                <LinkButton
                  path="/create_community"
                  translationKey="create_a_community"
                />
              )}
              <LinkButton
                path="/communities"
                translationKey="explore_communities"
              />
            </div>
          </div>
          <SiteSidebar
            site={site}
            admins={admins}
            counts={counts}
            online={online}
            showLocal={showLocal(this.isoData)}
          />
          {this.hasFollows && (
            <div className="card border-secondary mb-3">
              <div className="card-body">{this.subscribedCommunities}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  trendingCommunities(isMobile = false) {
    switch (this.state.trendingCommunitiesRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const trending = this.state.trendingCommunitiesRes.data.communities;
        return (
          <div className={!isMobile ? "mb-2" : ""}>
            <h5>
              <T i18nKey="trending_communities">
                #
                <Link className="text-body" to="/communities">
                  #
                </Link>
              </T>
            </h5>
            <ul className="list-inline mb-0">
              {trending.map(cv => (
                <li
                  key={cv.community.id}
                  className="list-inline-item d-inline-block"
                >
                  <CommunityLink community={cv.community} />
                </li>
              ))}
            </ul>
          </div>
        );
      }
    }
  }

  get subscribedCommunities() {
    const { subscribedCollapsed } = this.state;

    return (
      <div>
        <h5>
          <T class="d-inline" i18nKey="subscribed_to_communities">
            #
            <Link className="text-body" to="/communities">
              #
            </Link>
          </T>
          <button
            className="btn btn-sm text-muted"
            onClick={linkEvent(this, this.handleCollapseSubscribe)}
            aria-label={i18n.t("collapse")}
            data-tippy-content={i18n.t("collapse")}
          >
            <Icon
              icon={`${subscribedCollapsed ? "plus" : "minus"}-square`}
              classes="icon-inline"
            />
          </button>
        </h5>
        {!subscribedCollapsed && (
          <ul className="list-inline mb-0">
            {UserService.Instance.myUserInfo?.follows.map(cfv => (
              <li
                key={cfv.community.id}
                className="list-inline-item d-inline-block"
              >
                <CommunityLink community={cfv.community} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  async updateUrl({ dataType, listingType, page, sort }: Partial<HomeProps>) {
    const {
      dataType: urlDataType,
      listingType: urlListingType,
      page: urlPage,
      sort: urlSort,
    } = getHomeQueryParams();

    const queryParams: QueryParams<HomeProps> = {
      dataType: getDataTypeString(dataType ?? urlDataType),
      listingType: listingType ?? urlListingType,
      page: (page ?? urlPage).toString(),
      sort: sort ?? urlSort,
    };

    this.props.history.push({
      pathname: "/",
      search: getQueryString(queryParams),
    });

    await this.fetchData();
  }

  posts() {
    const { page } = getHomeQueryParams();

    return (
      <div className="main-content-wrapper">
        <div>
          {this.selects()}
          {this.listings}
          <Paginator page={page} onChange={this.handlePageChange} />
        </div>
      </div>
    );
  }

  get listings() {
    const { dataType } = getHomeQueryParams();
    const siteRes = this.state.siteRes;

    if (dataType === DataType.Post) {
      switch (this.state.postsRes.state) {
        case "loading":
          return (
            <h5>
              <Spinner large />
            </h5>
          );
        case "success": {
          const posts = this.state.postsRes.data.posts;
          return (
            <PostListings
              posts={posts}
              showCommunity
              removeDuplicates
              enableDownvotes={enableDownvotes(siteRes)}
              enableNsfw={enableNsfw(siteRes)}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              onBlockPerson={this.handleBlockPerson}
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
              onFeaturePostLocal={this.handleFeaturePostLocal}
              onFeaturePostCommunity={this.handleFeaturePostCommunity}
              upvoteLoading={this.state.votePostRes.state == "loading"}
              downvoteLoading={this.state.votePostRes.state == "loading"}
              reportLoading={this.state.reportPostRes.state == "loading"}
              blockLoading={this.state.blockPostRes.state == "loading"}
              lockLoading={this.state.lockPostRes.state == "loading"}
              deleteLoading={this.state.deletePostRes.state == "loading"}
              removeLoading={this.state.removePostRes.state == "loading"}
              saveLoading={this.state.savePostRes.state == "loading"}
              featureCommunityLoading={
                this.state.featurePostCommunityRes.state == "loading"
              }
              featureLocalLoading={
                this.state.featurePostLocalRes.state == "loading"
              }
              banLoading={this.state.banPersonRes.state == "loading"}
              addModLoading={this.state.addModRes.state == "loading"}
              addAdminLoading={this.state.addAdminRes.state == "loading"}
              transferLoading={
                this.state.transferCommunityRes.state == "loading"
              }
              purgeLoading={
                this.state.purgePersonRes.state == "loading" ||
                this.state.purgePostRes.state == "loading"
              }
            />
          );
        }
      }
    } else {
      switch (this.state.commentsRes.state) {
        case "loading":
          return (
            <h5>
              <Spinner large />
            </h5>
          );
        case "success": {
          const comments = this.state.commentsRes.data.comments;
          return (
            <CommentNodes
              nodes={commentsToFlatNodes(comments)}
              viewType={CommentViewType.Flat}
              noIndent
              showCommunity
              showContext
              enableDownvotes={enableDownvotes(siteRes)}
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
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
              onCommentReplyRead={this.handleCommentReplyRead}
              onPersonMentionRead={this.handlePersonMentionRead}
              onBanPersonFromCommunity={this.handleBanFromCommunity}
              onBanPerson={this.handleBanPerson}
              onCreateComment={this.handleCreateComment}
              onEditComment={this.handleEditComment}
              createOrEditCommentLoading={
                this.state.createCommentRes.state == "loading" ||
                this.state.editCommentRes.state == "loading"
              }
              upvoteLoading={this.state.voteCommentRes.state == "loading"}
              downvoteLoading={this.state.voteCommentRes.state == "loading"}
              saveLoading={this.state.saveCommentRes.state == "loading"}
              readLoading={
                this.state.readCommentReplyRes.state == "loading" ||
                this.state.readPersonMentionRes.state == "loading"
              }
              blockPersonLoading={this.state.blockPersonRes.state == "loading"}
              deleteLoading={this.state.deleteCommentRes.state == "loading"}
              removeLoading={this.state.removeCommentRes.state == "loading"}
              distinguishLoading={
                this.state.distinguishCommentRes.state == "loading"
              }
              banLoading={this.state.banPersonRes.state == "loading"}
              addModLoading={this.state.addModRes.state == "loading"}
              addAdminLoading={this.state.addAdminRes.state == "loading"}
              transferCommunityLoading={
                this.state.transferCommunityRes.state == "loading"
              }
              fetchChildrenLoading={
                this.state.fetchChildrenRes.state == "loading"
              }
              reportLoading={this.state.reportCommentRes.state == "loading"}
              purgeLoading={this.state.purgeCommentRes.state == "loading"}
            />
          );
        }
      }
    }
  }

  selects() {
    const { listingType, dataType, sort } = getHomeQueryParams();

    return (
      <div className="mb-3">
        <span className="mr-3">
          <DataTypeSelect
            type_={dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span className="mr-3">
          <ListingTypeSelect
            type_={listingType}
            showLocal={showLocal(this.isoData)}
            showSubscribed
            onChange={this.handleListingTypeChange}
          />
        </span>
        <span className="mr-2">
          <SortSelect sort={sort} onChange={this.handleSortChange} />
        </span>
        {this.getRss(listingType)}
      </div>
    );
  }

  getRss(listingType: ListingType) {
    const { sort } = getHomeQueryParams();
    const auth = myAuth();

    let rss: string | undefined = undefined;

    switch (listingType) {
      case "All": {
        rss = `/feeds/all.xml?sort=${sort}`;
        break;
      }
      case "Local": {
        rss = `/feeds/local.xml?sort=${sort}`;
        break;
      }
      case "Subscribed": {
        rss = auth ? `/feeds/front/${auth}.xml?sort=${sort}` : undefined;
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

  async fetchTrendingCommunities() {
    this.setState({ trendingCommunitiesRes: { state: "loading" } });
    this.setState({
      trendingCommunitiesRes: await apiWrapper(
        HttpService.client.listCommunities({
          type_: "Local",
          sort: "Hot",
          limit: trendingFetchLimit,
          auth: myAuth(),
        })
      ),
    });
  }

  async fetchData() {
    const auth = myAuth();
    const { dataType, page, listingType, sort } = getHomeQueryParams();

    if (dataType === DataType.Post) {
      this.setState({ postsRes: { state: "loading" } });
      this.setState({
        postsRes: await apiWrapper(
          HttpService.client.getPosts({
            page,
            limit: fetchLimit,
            sort,
            saved_only: false,
            type_: listingType,
            auth,
          })
        ),
      });
    } else {
      this.setState({ commentsRes: { state: "loading" } });
      this.setState({
        commentsRes: await apiWrapper(
          HttpService.client.getComments({
            page,
            limit: fetchLimit,
            sort: postToCommentSortType(sort),
            saved_only: false,
            type_: listingType,
            auth,
          })
        ),
      });
    }

    restoreScrollPosition(this.context);
    setupTippy();
  }

  handleShowSubscribedMobile(i: Home) {
    i.setState({ showSubscribedMobile: !i.state.showSubscribedMobile });
  }

  handleShowTrendingMobile(i: Home) {
    i.setState({ showTrendingMobile: !i.state.showTrendingMobile });
  }

  handleShowSidebarMobile(i: Home) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleCollapseSubscribe(i: Home) {
    i.setState({ subscribedCollapsed: !i.state.subscribedCollapsed });
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
    window.scrollTo(0, 0);
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
    window.scrollTo(0, 0);
  }

  handleListingTypeChange(val: ListingType) {
    this.updateUrl({ listingType: val, page: 1 });
    window.scrollTo(0, 0);
  }

  handleDataTypeChange(val: DataType) {
    this.updateUrl({ dataType: val, page: 1 });
    window.scrollTo(0, 0);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    // TODO not sure what to do here
    this.setState({ addModRes: { state: "loading" } });
    this.setState({
      addModRes: await apiWrapper(HttpService.client.addModToCommunity(form)),
    });
  }

  async handlePurgePerson(form: PurgePerson) {
    this.setState({ purgePersonRes: { state: "loading" } });
    this.setState({
      purgePersonRes: await apiWrapper(HttpService.client.purgePerson(form)),
    });
    this.purgeItem(this.state.purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    this.setState({ purgeCommentRes: { state: "loading" } });
    this.setState({
      purgeCommentRes: await apiWrapper(HttpService.client.purgeComment(form)),
    });
    this.purgeItem(this.state.purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    this.setState({ purgePostRes: { state: "loading" } });
    this.setState({
      purgePostRes: await apiWrapper(HttpService.client.purgePost(form)),
    });
    this.purgeItem(this.state.purgePostRes);
  }

  async handleBlockPerson(form: BlockPerson) {
    this.setState({ blockPersonRes: { state: "loading" } });
    const blockPersonRes = await apiWrapper(
      HttpService.client.blockPerson(form)
    );
    this.setState({ blockPersonRes });

    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleCreateComment(form: CreateComment) {
    this.setState({ createCommentRes: { state: "loading" } });

    const createCommentRes = await apiWrapper(
      HttpService.client.createComment(form)
    );
    this.setState({ createCommentRes });

    this.setState(s => {
      if (
        s.commentsRes.state == "success" &&
        createCommentRes.state == "success"
      ) {
        s.commentsRes.data.comments.unshift(createCommentRes.data.comment_view);
      }
      return s;
    });
  }
  async handleEditComment(form: EditComment) {
    this.setState({ editCommentRes: { state: "loading" } });
    const editCommentRes = await apiWrapper(
      HttpService.client.editComment(form)
    );
    this.setState({ editCommentRes });

    this.findAndUpdateComment(editCommentRes);
  }

  async handleDeleteComment(form: DeleteComment) {
    this.setState({ deleteCommentRes: { state: "loading" } });
    const deleteCommentRes = await apiWrapper(
      HttpService.client.deleteComment(form)
    );
    this.setState({ deleteCommentRes });

    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    this.setState({ deletePostRes: { state: "loading" } });
    const deletePostRes = await apiWrapper(HttpService.client.deletePost(form));
    this.setState({ deletePostRes });
    this.findAndUpdatePost(deletePostRes);
  }

  async handleRemovePost(form: RemovePost) {
    this.setState({ removePostRes: { state: "loading" } });
    const removePostRes = await apiWrapper(HttpService.client.removePost(form));
    this.setState({ removePostRes });
    this.findAndUpdatePost(removePostRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    this.setState({ removeCommentRes: { state: "loading" } });
    const removeCommentRes = await apiWrapper(
      HttpService.client.removeComment(form)
    );
    this.setState({ removeCommentRes });

    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    this.setState({ saveCommentRes: { state: "loading" } });
    const saveCommentRes = await apiWrapper(
      HttpService.client.saveComment(form)
    );
    this.setState({ saveCommentRes });
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    this.setState({ savePostRes: { state: "loading" } });
    const savePostRes = await apiWrapper(HttpService.client.savePost(form));
    this.setState({ savePostRes });
    this.findAndUpdatePost(savePostRes);
  }

  async handleFeaturePostLocal(form: FeaturePost) {
    this.setState({ featurePostLocalRes: { state: "loading" } });
    const featurePostLocalRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostLocalRes });
    this.findAndUpdatePost(featurePostLocalRes);
  }

  async handleFeaturePostCommunity(form: FeaturePost) {
    this.setState({ featurePostCommunityRes: { state: "loading" } });
    const featurePostCommunityRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostCommunityRes });
    this.findAndUpdatePost(featurePostCommunityRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    this.setState({ voteCommentRes: { state: "loading" } });
    const voteCommentRes = await apiWrapper(
      HttpService.client.likeComment(form)
    );
    this.setState({ voteCommentRes });
    this.findAndUpdateComment(voteCommentRes);
  }

  async handlePostVote(form: CreatePostLike) {
    this.setState({ votePostRes: { state: "loading" } });
    const votePostRes = await apiWrapper(HttpService.client.likePost(form));
    this.setState({ votePostRes });
    this.findAndUpdatePost(votePostRes);
  }

  async handleCommentReport(form: CreateCommentReport) {
    this.setState({ reportCommentRes: { state: "loading" } });
    const reportCommentRes = await apiWrapper(
      HttpService.client.createCommentReport(form)
    );
    this.setState({ reportCommentRes });
    if (reportCommentRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    this.setState({ reportPostRes: { state: "loading" } });
    const reportPostRes = await apiWrapper(
      HttpService.client.createPostReport(form)
    );
    this.setState({ reportPostRes });
    if (reportPostRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    this.setState({ lockPostRes: { state: "loading" } });
    const lockPostRes = await apiWrapper(HttpService.client.lockPost(form));
    this.setState({ lockPostRes });

    this.findAndUpdatePost(lockPostRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    this.setState({ distinguishCommentRes: { state: "loading" } });
    const distinguishCommentRes = await apiWrapper(
      HttpService.client.distinguishComment(form)
    );
    this.setState({ distinguishCommentRes });
    this.findAndUpdateComment(distinguishCommentRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    this.setState({ addAdminRes: { state: "loading" } });
    const addAdminRes = await apiWrapper(HttpService.client.addAdmin(form));
    this.setState({ addAdminRes });

    if (addAdminRes.state == "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    this.setState({ transferCommunityRes: { state: "loading" } });
    const transferCommunityRes = await apiWrapper(
      HttpService.client.transferCommunity(form)
    );
    this.setState({ transferCommunityRes });
    toast(i18n.t("transfer_community"));
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    this.setState({ readCommentReplyRes: { state: "loading" } });
    const readCommentReplyRes = await apiWrapper(
      HttpService.client.markCommentReplyAsRead(form)
    );
    this.setState({ readCommentReplyRes });
    this.findAndUpdateCommentReply(readCommentReplyRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    this.setState({ readPersonMentionRes: { state: "loading" } });
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    const readPersonMentionRes = await apiWrapper(
      HttpService.client.markPersonMentionAsRead(form)
    );
    this.setState({ readPersonMentionRes });
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    this.setState({ banFromCommunityRes: { state: "loading" } });
    const banFromCommunityRes = await apiWrapper(
      HttpService.client.banFromCommunity(form)
    );
    this.setState({ banFromCommunityRes });
    this.updateBanFromCommunity(banFromCommunityRes);
  }

  async handleBanPerson(form: BanPerson) {
    this.setState({ banPersonRes: { state: "loading" } });
    const banPersonRes = await apiWrapper(HttpService.client.banPerson(form));
    this.setState({ banPersonRes });
    this.updateBan(banPersonRes);
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.postsRes.state == "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
        }
        if (s.commentsRes.state == "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.postsRes.state == "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        if (s.commentsRes.state == "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        return s;
      });
    }
  }

  purgeItem(purgeRes: RequestState<PurgeItemResponse>) {
    if (purgeRes.state == "success") {
      toast(i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments = editComments(
          res.data.comment_view,
          s.commentsRes.data.comments
        );
      }
      return s;
    });
  }

  findAndUpdateCommentReply(res: RequestState<CommentReplyResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments = editCommentWithCommentReplies(
          res.data.comment_reply_view,
          s.commentsRes.data.comments
        );
      }
      return s;
    });
  }

  findAndUpdatePost(res: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postsRes.state == "success" && res.state == "success") {
        s.postsRes.data.posts = editPosts(
          res.data.post_view,
          s.postsRes.data.posts
        );
      }
      return s;
    });
  }
}
