import {
  commentsToFlatNodes,
  editComment,
  editPost,
  editWith,
  enableDownvotes,
  enableNsfw,
  getCommentParentId,
  getDataTypeString,
  myAuth,
  postToCommentSortType,
  setIsoData,
  showLocal,
  updatePersonBlock,
} from "@utils/app";
import {
  getPageFromString,
  getQueryParams,
  getQueryString,
  getRandomFromList,
} from "@utils/helpers";
import { canCreateCommunity } from "@utils/roles";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { NoOptionI18nKeys } from "i18next";
import { Component, MouseEventHandler, linkEvent } from "inferno";
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
  CommentId,
  CommentReplyResponse,
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
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
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
import { fetchLimit, relTags, trendingFetchLimit } from "../../config";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { mdToHtml } from "../../markdown";
import { FirstLoadService, I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { setupTippy } from "../../tippy";
import { toast } from "../../toast";
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
  showSubscribedMobile: boolean;
  showTrendingMobile: boolean;
  showSidebarMobile: boolean;
  subscribedCollapsed: boolean;
  tagline?: string;
  siteRes: GetSiteResponse;
  finished: Map<CommentId, boolean | undefined>;
  isIsomorphic: boolean;
}

interface HomeProps {
  listingType: ListingType;
  dataType: DataType;
  sort: SortType;
  page: number;
}

type HomeData = RouteDataResponse<{
  postsRes: GetPostsResponse;
  commentsRes: GetCommentsResponse;
  trendingCommunitiesRes: ListCommunitiesResponse;
}>;

function getRss(listingType: ListingType) {
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

function getDataTypeFromQuery(type?: string): DataType {
  return type ? DataType[type] : DataType.Post;
}

function getListingTypeFromQuery(type?: string): ListingType {
  const myListingType =
    UserService.Instance.myUserInfo?.local_user_view?.local_user
      ?.default_listing_type;

  return (type ? (type as ListingType) : myListingType) ?? "Local";
}

function getSortTypeFromQuery(type?: string): SortType {
  const mySortType =
    UserService.Instance.myUserInfo?.local_user_view?.local_user
      ?.default_sort_type;

  return (type ? (type as SortType) : mySortType) ?? "Active";
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
    className="btn btn-secondary d-inline-block mb-2 me-3"
    onClick={onClick}
  >
    {I18NextService.i18n.t(textKey)}{" "}
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
  <Link className="btn btn-secondary d-block" to={path}>
    {I18NextService.i18n.t(translationKey)}
  </Link>
);

export class Home extends Component<any, HomeState> {
  private isoData = setIsoData<HomeData>(this.context);
  state: HomeState = {
    postsRes: { state: "empty" },
    commentsRes: { state: "empty" },
    trendingCommunitiesRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    showSubscribedMobile: false,
    showTrendingMobile: false,
    showSidebarMobile: false,
    subscribedCollapsed: false,
    finished: new Map(),
    isIsomorphic: false,
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
    this.handlePostEdit = this.handlePostEdit.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePost = this.handleFeaturePost.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { trendingCommunitiesRes, commentsRes, postsRes } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        trendingCommunitiesRes,
        commentsRes,
        postsRes,
        tagline: getRandomFromList(this.state?.siteRes?.taglines ?? [])
          ?.content,
        isIsomorphic: true,
      };
    }
  }

  async componentDidMount() {
    if (
      !this.state.isIsomorphic ||
      !Object.values(this.isoData.routeData).some(
        res => res.state === "success" || res.state === "failed"
      )
    ) {
      await Promise.all([this.fetchTrendingCommunities(), this.fetchData()]);
    }

    setupTippy();
  }

  static async fetchInitialData({
    client,
    auth,
    query: { dataType: urlDataType, listingType, page: urlPage, sort: urlSort },
  }: InitialFetchRequest<QueryParams<HomeProps>>): Promise<HomeData> {
    const dataType = getDataTypeFromQuery(urlDataType);

    // TODO figure out auth default_listingType, default_sort_type
    const type_ = getListingTypeFromQuery(listingType);
    const sort = getSortTypeFromQuery(urlSort);

    const page = urlPage ? Number(urlPage) : 1;

    let postsRes: RequestState<GetPostsResponse> = { state: "empty" };
    let commentsRes: RequestState<GetCommentsResponse> = {
      state: "empty",
    };

    if (dataType === DataType.Post) {
      const getPostsForm: GetPosts = {
        type_,
        page,
        limit: fetchLimit,
        sort,
        saved_only: false,
        auth,
      };

      postsRes = await client.getPosts(getPostsForm);
    } else {
      const getCommentsForm: GetComments = {
        page,
        limit: fetchLimit,
        sort: postToCommentSortType(sort),
        type_,
        saved_only: false,
        auth,
      };

      commentsRes = await client.getComments(getCommentsForm);
    }

    const trendingCommunitiesForm: ListCommunities = {
      type_: "Local",
      sort: "Hot",
      limit: trendingFetchLimit,
      auth,
    };

    return {
      trendingCommunitiesRes: await client.listCommunities(
        trendingCommunitiesForm
      ),
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
            <main role="main" className="col-12 col-md-8">
              {tagline && (
                <div
                  id="tagline"
                  dangerouslySetInnerHTML={mdToHtml(tagline)}
                ></div>
              )}
              <div className="d-block d-md-none">{this.mobileView}</div>
              {this.posts}
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
              showLocal={showLocal(this.isoData)}
              isMobile={true}
            />
          )}
          {showTrendingMobile && (
            <div className="card border-secondary mb-3">
              {this.trendingCommunities()}
            </div>
          )}
          {showSubscribedMobile && (
            <div className="card border-secondary mb-3">
              {this.subscribedCommunities(true)}
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
      },
    } = this.state;

    return (
      <div id="sidebarContainer">
        <section id="sidebarMain" className="card border-secondary mb-3">
          {this.trendingCommunities()}
        </section>
        <SiteSidebar
          site={site}
          admins={admins}
          counts={counts}
          showLocal={showLocal(this.isoData)}
        />
        {this.hasFollows && (
          <div className="accordion">
            <section
              id="sidebarSubscribed"
              className="card border-secondary mb-3"
            >
              {this.subscribedCommunities(false)}
            </section>
          </div>
        )}
      </div>
    );
  }

  trendingCommunities() {
    switch (this.state.trendingCommunitiesRes?.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const trending = this.state.trendingCommunitiesRes.data.communities;
        return (
          <>
            <header className="card-header d-flex align-items-center">
              <h5 className="mb-0">
                <T i18nKey="trending_communities">
                  #
                  <Link className="text-body" to="/communities">
                    #
                  </Link>
                </T>
              </h5>
            </header>
            <div className="card-body">
              {trending.length > 0 && (
                <ul className="list-inline">
                  {trending.map(cv => (
                    <li key={cv.community.id} className="list-inline-item">
                      <CommunityLink community={cv.community} />
                    </li>
                  ))}
                </ul>
              )}
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
          </>
        );
      }
    }
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
            <T class="d-inline" i18nKey="subscribed_to_communities">
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
                {UserService.Instance.myUserInfo?.follows.map(cfv => (
                  <li
                    key={cfv.community.id}
                    className="list-inline-item d-inline-block"
                  >
                    <CommunityLink community={cfv.community} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
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

  get posts() {
    const { page } = getHomeQueryParams();

    return (
      <div className="main-content-wrapper">
        <div>
          {this.selects}
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
              finished={this.state.finished}
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
            />
          );
        }
      }
    }
  }

  get selects() {
    const { listingType, dataType, sort } = getHomeQueryParams();

    return (
      <div className="row align-items-center mb-3 g-3">
        <div className="col-auto">
          <DataTypeSelect
            type_={dataType}
            onChange={this.handleDataTypeChange}
          />
        </div>
        <div className="col-auto">
          <ListingTypeSelect
            type_={listingType}
            showLocal={showLocal(this.isoData)}
            showSubscribed
            onChange={this.handleListingTypeChange}
          />
        </div>
        <div className="col-auto">
          <SortSelect sort={sort} onChange={this.handleSortChange} />
        </div>
        <div className="col-auto ps-0">{getRss(listingType)}</div>
      </div>
    );
  }

  async fetchTrendingCommunities() {
    this.setState({ trendingCommunitiesRes: { state: "loading" } });
    this.setState({
      trendingCommunitiesRes: await HttpService.client.listCommunities({
        type_: "Local",
        sort: "Hot",
        limit: trendingFetchLimit,
        auth: myAuth(),
      }),
    });
  }

  async fetchData() {
    const auth = myAuth();
    const { dataType, page, listingType, sort } = getHomeQueryParams();

    if (dataType === DataType.Post) {
      this.setState({ postsRes: { state: "loading" } });
      this.setState({
        postsRes: await HttpService.client.getPosts({
          page,
          limit: fetchLimit,
          sort,
          saved_only: false,
          type_: listingType,
          auth,
        }),
      });
    } else {
      this.setState({ commentsRes: { state: "loading" } });
      this.setState({
        commentsRes: await HttpService.client.getComments({
          page,
          limit: fetchLimit,
          sort: postToCommentSortType(sort),
          saved_only: false,
          type_: listingType,
          auth,
        }),
      });
    }

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
    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleCreateComment(form: CreateComment) {
    const createCommentRes = await HttpService.client.createComment(form);
    this.createAndUpdateComments(createCommentRes);

    return createCommentRes;
  }

  async handleEditComment(form: EditComment) {
    const editCommentRes = await HttpService.client.editComment(form);
    this.findAndUpdateComment(editCommentRes);

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

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(voteRes);
  }

  async handlePostEdit(form: EditPost) {
    const res = await HttpService.client.editPost(form);
    this.findAndUpdatePost(res);
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = await HttpService.client.likePost(form);
    this.findAndUpdatePost(voteRes);
  }

  async handleCommentReport(form: CreateCommentReport) {
    const reportRes = await HttpService.client.createCommentReport(form);
    if (reportRes.state == "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    const reportRes = await HttpService.client.createPostReport(form);
    if (reportRes.state == "success") {
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

    if (addAdminRes.state == "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    await HttpService.client.transferCommunity(form);
    toast(I18NextService.i18n.t("transfer_community"));
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    const readRes = await HttpService.client.markCommentReplyAsRead(form);
    this.findAndUpdateCommentReply(readRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    await HttpService.client.markPersonMentionAsRead(form);
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
      toast(I18NextService.i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments = editComment(
          res.data.comment_view,
          s.commentsRes.data.comments
        );
        s.finished.set(res.data.comment_view.comment.id, true);
      }
      return s;
    });
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments.unshift(res.data.comment_view);

        // Set finished for the parent
        s.finished.set(
          getCommentParentId(res.data.comment_view.comment) ?? 0,
          true
        );
      }
      return s;
    });
  }

  findAndUpdateCommentReply(res: RequestState<CommentReplyResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments = editWith(
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
        s.postsRes.data.posts = editPost(
          res.data.post_view,
          s.postsRes.data.posts
        );
      }
      return s;
    });
  }
}
