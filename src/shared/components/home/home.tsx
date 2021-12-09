import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddAdminResponse,
  BanPersonResponse,
  BlockPersonResponse,
  CommentReportResponse,
  CommentResponse,
  CommentView,
  CommunityView,
  GetComments,
  GetCommentsResponse,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  PostReportResponse,
  PostResponse,
  PostView,
  SiteResponse,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { DataType, InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  commentsToFlatNodes,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  fetchLimit,
  getDataTypeFromProps,
  getListingTypeFromProps,
  getPageFromProps,
  getSortTypeFromProps,
  mdToHtml,
  notifyPost,
  numToSI,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setOptionalAuth,
  setupTippy,
  showLocal,
  toast,
  updatePersonBlock,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { BannerIconHeader } from "../common/banner-icon-header";
import { DataTypeSelect } from "../common/data-type-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { PostListings } from "../post/post-listings";
import { SiteForm } from "./site-form";

interface HomeState {
  trendingCommunities: CommunityView[];
  siteRes: GetSiteResponse;
  showEditSite: boolean;
  showSubscribedMobile: boolean;
  showTrendingMobile: boolean;
  showSidebarMobile: boolean;
  loading: boolean;
  posts: PostView[];
  comments: CommentView[];
  listingType: ListingType;
  dataType: DataType;
  sort: SortType;
  page: number;
}

interface HomeProps {
  listingType: ListingType;
  dataType: DataType;
  sort: SortType;
  page: number;
}

interface UrlParams {
  listingType?: ListingType;
  dataType?: string;
  sort?: SortType;
  page?: number;
}

export class Home extends Component<any, HomeState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: HomeState = {
    trendingCommunities: [],
    siteRes: this.isoData.site_res,
    showEditSite: false,
    showSubscribedMobile: false,
    showTrendingMobile: false,
    showSidebarMobile: false,
    loading: true,
    posts: [],
    comments: [],
    listingType: getListingTypeFromProps(this.props),
    dataType: getDataTypeFromProps(this.props),
    sort: getSortTypeFromProps(this.props),
    page: getPageFromProps(this.props),
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleEditCancel = this.handleEditCancel.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      if (this.state.dataType == DataType.Post) {
        this.state.posts = this.isoData.routeData[0].posts;
      } else {
        this.state.comments = this.isoData.routeData[0].comments;
      }
      this.state.trendingCommunities = this.isoData.routeData[1].communities;
      this.state.loading = false;
    } else {
      this.fetchTrendingCommunities();
      this.fetchData();
    }
  }

  fetchTrendingCommunities() {
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.Local,
      sort: SortType.Hot,
      limit: 6,
      auth: authField(false),
    };
    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  componentDidMount() {
    // This means it hasn't been set up yet
    if (!this.state.siteRes.site_view) {
      this.context.router.history.push("/setup");
    }

    WebSocketService.Instance.send(wsClient.communityJoin({ community_id: 0 }));
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
    this.subscription.unsubscribe();
    window.isoData.path = undefined;
  }

  static getDerivedStateFromProps(props: any): HomeProps {
    return {
      listingType: getListingTypeFromProps(props),
      dataType: getDataTypeFromProps(props),
      sort: getSortTypeFromProps(props),
      page: getPageFromProps(props),
    };
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let dataType: DataType = pathSplit[3]
      ? DataType[pathSplit[3]]
      : DataType.Post;

    // TODO figure out auth default_listingType, default_sort_type
    let type_: ListingType = pathSplit[5]
      ? ListingType[pathSplit[5]]
      : UserService.Instance.myUserInfo
      ? Object.values(ListingType)[
          UserService.Instance.myUserInfo.local_user_view.local_user
            .default_listing_type
        ]
      : ListingType.Local;
    let sort: SortType = pathSplit[7]
      ? SortType[pathSplit[7]]
      : UserService.Instance.myUserInfo
      ? Object.values(SortType)[
          UserService.Instance.myUserInfo.local_user_view.local_user
            .default_sort_type
        ]
      : SortType.Active;

    let page = pathSplit[9] ? Number(pathSplit[9]) : 1;

    let promises: Promise<any>[] = [];

    if (dataType == DataType.Post) {
      let getPostsForm: GetPosts = {
        page,
        limit: fetchLimit,
        sort,
        type_,
        saved_only: false,
      };
      setOptionalAuth(getPostsForm, req.auth);
      promises.push(req.client.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetComments = {
        page,
        limit: fetchLimit,
        sort,
        type_,
        saved_only: false,
      };
      setOptionalAuth(getCommentsForm, req.auth);
      promises.push(req.client.getComments(getCommentsForm));
    }

    let trendingCommunitiesForm: ListCommunities = {
      type_: ListingType.Local,
      sort: SortType.Hot,
      limit: 6,
    };
    setOptionalAuth(trendingCommunitiesForm, req.auth);
    promises.push(req.client.listCommunities(trendingCommunitiesForm));

    return promises;
  }

  componentDidUpdate(_: any, lastState: HomeState) {
    if (
      lastState.listingType !== this.state.listingType ||
      lastState.dataType !== this.state.dataType ||
      lastState.sort !== this.state.sort ||
      lastState.page !== this.state.page
    ) {
      this.setState({ loading: true });
      this.fetchData();
    }
  }

  get documentTitle(): string {
    return `${
      this.state.siteRes.site_view
        ? this.state.siteRes.site_view.site.description
          ? `${this.state.siteRes.site_view.site.name} - ${this.state.siteRes.site_view.site.description}`
          : this.state.siteRes.site_view.site.name
        : "Lemmy"
    }`;
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.siteRes.site_view?.site && (
          <div class="row">
            <main role="main" class="col-12 col-md-8">
              <div class="d-block d-md-none">{this.mobileView()}</div>
              {this.posts()}
            </main>
            <aside class="d-none d-md-block col-md-4">{this.mySidebar()}</aside>
          </div>
        )}
      </div>
    );
  }

  mobileView() {
    return (
      <div class="row">
        <div class="col-12">
          {UserService.Instance.myUserInfo &&
            UserService.Instance.myUserInfo.follows.length > 0 && (
              <button
                class="btn btn-secondary d-inline-block mb-2 mr-3"
                onClick={linkEvent(this, this.handleShowSubscribedMobile)}
              >
                {i18n.t("subscribed")}{" "}
                <Icon
                  icon={
                    this.state.showSubscribedMobile
                      ? `minus-square`
                      : `plus-square`
                  }
                  classes="icon-inline"
                />
              </button>
            )}
          <button
            class="btn btn-secondary d-inline-block mb-2 mr-3"
            onClick={linkEvent(this, this.handleShowTrendingMobile)}
          >
            {i18n.t("trending")}{" "}
            <Icon
              icon={
                this.state.showTrendingMobile ? `minus-square` : `plus-square`
              }
              classes="icon-inline"
            />
          </button>
          <button
            class="btn btn-secondary d-inline-block mb-2 mr-3"
            onClick={linkEvent(this, this.handleShowSidebarMobile)}
          >
            {i18n.t("sidebar")}{" "}
            <Icon
              icon={
                this.state.showSidebarMobile ? `minus-square` : `plus-square`
              }
              classes="icon-inline"
            />
          </button>
          {this.state.showSubscribedMobile && (
            <div class="col-12 card border-secondary mb-3">
              <div class="card-body">{this.subscribedCommunities()}</div>
            </div>
          )}
          {this.state.showTrendingMobile && (
            <div class="col-12 card border-secondary mb-3">
              <div class="card-body">{this.trendingCommunities()}</div>
            </div>
          )}
          {this.state.showSidebarMobile && (
            <div class="col-12 card border-secondary mb-3">
              <div class="card-body">{this.sidebar()}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  mySidebar() {
    return (
      <div>
        {!this.state.loading && (
          <div>
            <div class="card border-secondary mb-3">
              <div class="card-body">
                {this.trendingCommunities()}
                {this.createCommunityButton()}
                {this.exploreCommunitiesButton()}
              </div>
            </div>

            {UserService.Instance.myUserInfo &&
              UserService.Instance.myUserInfo.follows.length > 0 && (
                <div class="card border-secondary mb-3">
                  <div class="card-body">{this.subscribedCommunities()}</div>
                </div>
              )}

            <div class="card border-secondary mb-3">
              <div class="card-body">{this.sidebar()}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  createCommunityButton() {
    return (
      <Link className="mt-2 btn btn-secondary btn-block" to="/create_community">
        {i18n.t("create_a_community")}
      </Link>
    );
  }

  exploreCommunitiesButton() {
    return (
      <Link className="btn btn-secondary btn-block" to="/communities">
        {i18n.t("explore_communities")}
      </Link>
    );
  }

  trendingCommunities() {
    return (
      <div>
        <h5>
          <T i18nKey="trending_communities">
            #
            <Link className="text-body" to="/communities">
              #
            </Link>
          </T>
        </h5>
        <ul class="list-inline mb-0">
          {this.state.trendingCommunities.map(cv => (
            <li class="list-inline-item d-inline-block">
              <CommunityLink community={cv.community} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  subscribedCommunities() {
    return (
      <div>
        <h5>
          <T i18nKey="subscribed_to_communities">
            #
            <Link className="text-body" to="/communities">
              #
            </Link>
          </T>
        </h5>
        <ul class="list-inline mb-0">
          {UserService.Instance.myUserInfo.follows.map(cfv => (
            <li class="list-inline-item d-inline-block">
              <CommunityLink community={cfv.community} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  sidebar() {
    let site = this.state.siteRes.site_view.site;
    return (
      <div>
        {!this.state.showEditSite ? (
          <div>
            <div class="mb-2">
              {this.siteName()}
              {this.adminButtons()}
            </div>
            <BannerIconHeader banner={site.banner} />
            {this.siteInfo()}
          </div>
        ) : (
          <SiteForm site={site} onCancel={this.handleEditCancel} />
        )}
      </div>
    );
  }

  updateUrl(paramUpdates: UrlParams) {
    const listingTypeStr = paramUpdates.listingType || this.state.listingType;
    const dataTypeStr = paramUpdates.dataType || DataType[this.state.dataType];
    const sortStr = paramUpdates.sort || this.state.sort;
    const page = paramUpdates.page || this.state.page;
    this.props.history.push(
      `/home/data_type/${dataTypeStr}/listing_type/${listingTypeStr}/sort/${sortStr}/page/${page}`
    );
  }

  siteInfo() {
    let site = this.state.siteRes.site_view.site;
    return (
      <div>
        {site.description && <h6>{site.description}</h6>}
        {site.sidebar && this.siteSidebar()}
        {this.badges()}
        {this.admins()}
      </div>
    );
  }

  siteName() {
    let site = this.state.siteRes.site_view.site;
    return site.name && <h5 class="mb-0">{site.name}</h5>;
  }

  admins() {
    return (
      <ul class="mt-1 list-inline small mb-0">
        <li class="list-inline-item">{i18n.t("admins")}:</li>
        {this.state.siteRes.admins.map(av => (
          <li class="list-inline-item">
            <PersonListing person={av.person} />
          </li>
        ))}
      </ul>
    );
  }

  badges() {
    let counts = this.state.siteRes.site_view.counts;
    return (
      <ul class="my-2 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_online", {
            count: this.state.siteRes.online,
            formattedCount: numToSI(this.state.siteRes.online),
          })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_day", {
            count: counts.users_active_day,
            formattedCount: numToSI(counts.users_active_day),
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_day,
            formattedCount: numToSI(counts.users_active_day),
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_week", {
            count: counts.users_active_week,
            formattedCount: counts.users_active_week,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_week,
            formattedCount: numToSI(counts.users_active_week),
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_month", {
            count: counts.users_active_month,
            formattedCount: counts.users_active_month,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_month,
            formattedCount: numToSI(counts.users_active_month),
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_six_months", {
            count: counts.users_active_half_year,
            formattedCount: counts.users_active_half_year,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_half_year,
            formattedCount: numToSI(counts.users_active_half_year),
          })}{" "}
          / {i18n.t("number_of_months", { count: 6, formattedCount: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_users", {
            count: counts.users,
            formattedCount: numToSI(counts.users),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_communities", {
            count: counts.communities,
            formattedCount: numToSI(counts.communities),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: counts.posts,
            formattedCount: numToSI(counts.posts),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: counts.comments,
            formattedCount: numToSI(counts.comments),
          })}
        </li>
        <li className="list-inline-item">
          <Link className="badge badge-secondary" to="/modlog">
            {i18n.t("modlog")}
          </Link>
        </li>
      </ul>
    );
  }

  adminButtons() {
    return (
      this.canAdmin && (
        <ul class="list-inline mb-1 text-muted font-weight-bold">
          <li className="list-inline-item-action">
            <button
              class="btn btn-link d-inline-block text-muted"
              onClick={linkEvent(this, this.handleEditClick)}
              aria-label={i18n.t("edit")}
              data-tippy-content={i18n.t("edit")}
            >
              <Icon icon="edit" classes="icon-inline" />
            </button>
          </li>
        </ul>
      )
    );
  }

  siteSidebar() {
    return (
      <div
        className="md-div"
        dangerouslySetInnerHTML={mdToHtml(
          this.state.siteRes.site_view.site.sidebar
        )}
      />
    );
  }

  posts() {
    return (
      <div class="main-content-wrapper">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div>
            {this.selects()}
            {this.listings()}
            <Paginator
              page={this.state.page}
              onChange={this.handlePageChange}
            />
          </div>
        )}
      </div>
    );
  }

  listings() {
    let site = this.state.siteRes.site_view.site;
    return this.state.dataType == DataType.Post ? (
      <PostListings
        posts={this.state.posts}
        showCommunity
        removeDuplicates
        enableDownvotes={site.enable_downvotes}
        enableNsfw={site.enable_nsfw}
      />
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.comments)}
        noIndent
        showCommunity
        showContext
        enableDownvotes={site.enable_downvotes}
      />
    );
  }

  selects() {
    return (
      <div className="mb-3">
        <span class="mr-3">
          <DataTypeSelect
            type_={this.state.dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span class="mr-3">
          <ListingTypeSelect
            type_={this.state.listingType}
            showLocal={showLocal(this.isoData)}
            onChange={this.handleListingTypeChange}
          />
        </span>
        <span class="mr-2">
          <SortSelect sort={this.state.sort} onChange={this.handleSortChange} />
        </span>
        {this.state.listingType == ListingType.All && (
          <a
            href={`/feeds/all.xml?sort=${this.state.sort}`}
            rel="noopener"
            title="RSS"
          >
            <Icon icon="rss" classes="text-muted small" />
          </a>
        )}
        {this.state.listingType == ListingType.Local && (
          <a
            href={`/feeds/local.xml?sort=${this.state.sort}`}
            rel="noopener"
            title="RSS"
          >
            <Icon icon="rss" classes="text-muted small" />
          </a>
        )}
        {UserService.Instance.myUserInfo &&
          this.state.listingType == ListingType.Subscribed && (
            <a
              href={`/feeds/front/${UserService.Instance.auth}.xml?sort=${this.state.sort}`}
              title="RSS"
              rel="noopener"
            >
              <Icon icon="rss" classes="text-muted small" />
            </a>
          )}
      </div>
    );
  }

  get canAdmin(): boolean {
    return (
      UserService.Instance.myUserInfo &&
      this.state.siteRes.admins
        .map(a => a.person.id)
        .includes(UserService.Instance.myUserInfo.local_user_view.person.id)
    );
  }

  handleEditClick(i: Home) {
    i.state.showEditSite = true;
    i.setState(i.state);
  }

  handleEditCancel() {
    this.state.showEditSite = false;
    this.setState(this.state);
  }

  handleShowSubscribedMobile(i: Home) {
    i.state.showSubscribedMobile = !i.state.showSubscribedMobile;
    i.setState(i.state);
  }

  handleShowTrendingMobile(i: Home) {
    i.state.showTrendingMobile = !i.state.showTrendingMobile;
    i.setState(i.state);
  }

  handleShowSidebarMobile(i: Home) {
    i.state.showSidebarMobile = !i.state.showSidebarMobile;
    i.setState(i.state);
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
    this.updateUrl({ dataType: DataType[val], page: 1 });
    window.scrollTo(0, 0);
  }

  fetchData() {
    if (this.state.dataType == DataType.Post) {
      let getPostsForm: GetPosts = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: this.state.listingType,
        saved_only: false,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetComments = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: this.state.listingType,
        saved_only: false,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.getComments(getCommentsForm));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      WebSocketService.Instance.send(
        wsClient.communityJoin({ community_id: 0 })
      );
      this.fetchData();
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg).data;
      this.state.trendingCommunities = data.communities;
      this.setState(this.state);
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg).data;
      this.state.siteRes.site_view = data.site_view;
      this.state.showEditSite = false;
      this.setState(this.state);
      toast(i18n.t("site_saved"));
    } else if (op == UserOperation.GetPosts) {
      let data = wsJsonToRes<GetPostsResponse>(msg).data;
      this.state.posts = data.posts;
      this.state.loading = false;
      this.setState(this.state);
      restoreScrollPosition(this.context);
      setupTippy();
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg).data;

      // NSFW check
      let nsfw = data.post_view.post.nsfw || data.post_view.community.nsfw;
      let nsfwCheck =
        !nsfw ||
        (nsfw &&
          UserService.Instance.myUserInfo &&
          UserService.Instance.myUserInfo.local_user_view.local_user.show_nsfw);

      // Only push these if you're on the first page, and you pass the nsfw check
      if (this.state.page == 1 && nsfwCheck) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            UserService.Instance.myUserInfo.follows
              .map(c => c.community.id)
              .includes(data.post_view.community.id)
          ) {
            this.state.posts.unshift(data.post_view);
            if (
              UserService.Instance.myUserInfo?.local_user_view.local_user
                .show_new_post_notifs
            ) {
              notifyPost(data.post_view, this.context.router);
            }
          }
        } else if (this.state.listingType == ListingType.Local) {
          // If you're on the local view, only push it if its local
          if (data.post_view.post.local) {
            this.state.posts.unshift(data.post_view);
            if (
              UserService.Instance.myUserInfo?.local_user_view.local_user
                .show_new_post_notifs
            ) {
              notifyPost(data.post_view, this.context.router);
            }
          }
        } else {
          this.state.posts.unshift(data.post_view);
          if (
            UserService.Instance.myUserInfo?.local_user_view.local_user
              .show_new_post_notifs
          ) {
            notifyPost(data.post_view, this.context.router);
          }
        }
        this.setState(this.state);
      }
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.StickyPost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      editPostFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg).data;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg).data;
      let found = this.state.siteRes.banned.find(
        p => (p.person.id = data.person_view.person.id)
      );

      // Remove the banned if its found in the list, and the action is an unban
      if (found && !data.banned) {
        this.state.siteRes.banned = this.state.siteRes.banned.filter(
          i => i.person.id !== data.person_view.person.id
        );
      } else {
        this.state.siteRes.banned.push(data.person_view);
      }

      this.state.posts
        .filter(p => p.creator.id == data.person_view.person.id)
        .forEach(p => (p.creator.banned = data.banned));

      this.setState(this.state);
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg).data;
      this.state.comments = data.comments;
      this.state.loading = false;
      this.setState(this.state);
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      // Necessary since it might be a user reply
      if (data.form_id) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            UserService.Instance.myUserInfo.follows
              .map(c => c.community.id)
              .includes(data.comment_view.community.id)
          ) {
            this.state.comments.unshift(data.comment_view);
          }
        } else {
          this.state.comments.unshift(data.comment_view);
        }
        this.setState(this.state);
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg).data;
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg).data;
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg).data;
      if (data) {
        toast(i18n.t("report_created"));
      }
    }
  }
}
