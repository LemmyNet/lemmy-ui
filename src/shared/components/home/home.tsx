import { None, Option, Some } from "@sniptt/monads";
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
  PurgeItemResponse,
  SiteResponse,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  canCreateCommunity,
  commentsToFlatNodes,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  getDataTypeFromProps,
  getListingTypeFromProps,
  getPageFromProps,
  getRandomFromList,
  getSortTypeFromProps,
  isBrowser,
  isPostBlocked,
  mdToHtml,
  notifyPost,
  nsfwCheck,
  postToCommentSortType,
  relTags,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  showLocal,
  toast,
  trendingFetchLimit,
  updatePersonBlock,
  wsClient,
  wsSubscribe,
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
  trendingCommunities: CommunityView[];
  siteRes: GetSiteResponse;
  posts: PostView[];
  comments: CommentView[];
  listingType: ListingType;
  dataType: DataType;
  sort: SortType;
  page: number;
  showSubscribedMobile: boolean;
  showTrendingMobile: boolean;
  showSidebarMobile: boolean;
  subscribedCollapsed: boolean;
  loading: boolean;
  tagline: Option<string>;
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
  private isoData = setIsoData(
    this.context,
    GetPostsResponse,
    GetCommentsResponse,
    ListCommunitiesResponse
  );
  private subscription: Subscription;
  private emptyState: HomeState = {
    trendingCommunities: [],
    siteRes: this.isoData.site_res,
    showSubscribedMobile: false,
    showTrendingMobile: false,
    showSidebarMobile: false,
    subscribedCollapsed: false,
    loading: true,
    posts: [],
    comments: [],
    listingType: getListingTypeFromProps(
      this.props,
      ListingType[
        this.isoData.site_res.site_view.local_site.default_post_listing_type
      ]
    ),
    dataType: getDataTypeFromProps(this.props),
    sort: getSortTypeFromProps(this.props),
    page: getPageFromProps(this.props),
    tagline: None
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let postsRes = Some(this.isoData.routeData[0] as GetPostsResponse);
      let commentsRes = Some(this.isoData.routeData[1] as GetCommentsResponse);
      let trendingRes = this.isoData.routeData[2] as ListCommunitiesResponse;

      if (postsRes.isSome()) {
        this.state = { ...this.state, posts: postsRes.unwrap().posts };
      }

      if (commentsRes.isSome()) {
        this.state = { ...this.state, comments: commentsRes.unwrap().comments };
      }

      if (isBrowser()) {
        WebSocketService.Instance.send(
          wsClient.communityJoin({ community_id: 0 })
        );
      }
      const taglines = this.state.siteRes.site_view.taglines;
      this.state = {
        ...this.state,
        trendingCommunities: trendingRes.communities,
        loading: false,
        tagline: taglines.map(tls => getRandomFromList(tls).content)
      };
    } else {
      this.fetchTrendingCommunities();
      this.fetchData();
    }
  }

  fetchTrendingCommunities() {
    let listCommunitiesForm = new ListCommunities({
      type_: Some(ListingType.Local),
      sort: Some(SortType.Hot),
      limit: Some(trendingFetchLimit),
      page: None,
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  componentDidMount() {
    // This means it hasn't been set up yet
    if (!this.state.siteRes.site_view.local_site.site_setup) {
      this.context.router.history.push("/setup");
    }
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
    this.subscription.unsubscribe();
  }

  static getDerivedStateFromProps(
    props: HomeProps,
    state: HomeState
  ): HomeProps {
    return {
      listingType: getListingTypeFromProps(props, state.listingType),
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
    let type_: Option<ListingType> = Some(
      pathSplit[5]
        ? ListingType[pathSplit[5]]
        : UserService.Instance.myUserInfo.match({
            some: mui =>
              Object.values(ListingType)[
                mui.local_user_view.local_user.default_listing_type
              ],
            none: ListingType.Local,
          })
    );
    let sort: Option<SortType> = Some(
      pathSplit[7]
        ? SortType[pathSplit[7]]
        : UserService.Instance.myUserInfo.match({
            some: mui =>
              Object.values(SortType)[
                mui.local_user_view.local_user.default_sort_type
              ],
            none: SortType.Active,
          })
    );

    let page = Some(pathSplit[9] ? Number(pathSplit[9]) : 1);

    let promises: Promise<any>[] = [];

    if (dataType == DataType.Post) {
      let getPostsForm = new GetPosts({
        community_id: None,
        community_name: None,
        type_,
        page,
        limit: Some(fetchLimit),
        sort,
        saved_only: Some(false),
        auth: req.auth,
      });

      promises.push(req.client.getPosts(getPostsForm));
      promises.push(Promise.resolve());
    } else {
      let getCommentsForm = new GetComments({
        community_id: None,
        community_name: None,
        page,
        limit: Some(fetchLimit),
        max_depth: None,
        sort: sort.map(postToCommentSortType),
        type_,
        saved_only: Some(false),
        post_id: None,
        parent_id: None,
        auth: req.auth,
      });
      promises.push(Promise.resolve());
      promises.push(req.client.getComments(getCommentsForm));
    }

    let trendingCommunitiesForm = new ListCommunities({
      type_: Some(ListingType.Local),
      sort: Some(SortType.Hot),
      limit: Some(trendingFetchLimit),
      page: None,
      auth: req.auth,
    });
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
    let siteView = this.state.siteRes.site_view;
    return this.state.siteRes.site_view.site.description.match({
      some: desc => `${siteView.site.name} - ${desc}`,
      none: siteView.site.name,
    });
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
        />
        {this.state.siteRes.site_view.local_site.site_setup && (
          <div className="row">
            <main role="main" className="col-12 col-md-8">
              {this.state.tagline.match({
                some: tagline => <div id="tagline" dangerouslySetInnerHTML={mdToHtml(tagline)}></div>,
                none: <></>,
              })}
              <div className="d-block d-md-none">{this.mobileView()}</div>
              {this.posts()}
            </main>
            <aside className="d-none d-md-block col-md-4">
              {this.mySidebar()}
            </aside>
          </div>
        )}
      </div>
    );
  }

  get hasFollows(): boolean {
    return UserService.Instance.myUserInfo.match({
      some: mui => mui.follows.length > 0,
      none: false,
    });
  }

  mobileView() {
    let siteRes = this.state.siteRes;
    let siteView = siteRes.site_view;
    return (
      <div className="row">
        <div className="col-12">
          {this.hasFollows && (
            <button
              className="btn btn-secondary d-inline-block mb-2 mr-3"
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
            className="btn btn-secondary d-inline-block mb-2 mr-3"
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
            className="btn btn-secondary d-inline-block mb-2 mr-3"
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
          {this.state.showSidebarMobile && (
            <SiteSidebar
              site={siteView.site}
              admins={Some(siteRes.admins)}
              counts={Some(siteView.counts)}
              online={Some(siteRes.online)}
              showLocal={showLocal(this.isoData)}
            />
          )}
          {this.state.showTrendingMobile && (
            <div className="col-12 card border-secondary mb-3">
              <div className="card-body">{this.trendingCommunities()}</div>
            </div>
          )}
          {this.state.showSubscribedMobile && (
            <div className="col-12 card border-secondary mb-3">
              <div className="card-body">{this.subscribedCommunities()}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  mySidebar() {
    let siteRes = this.state.siteRes;
    let siteView = siteRes.site_view;
    return (
      <div>
        {!this.state.loading && (
          <div>
            <div className="card border-secondary mb-3">
              <div className="card-body">
                {this.trendingCommunities()}
                {canCreateCommunity(this.state.siteRes) &&
                  this.createCommunityButton()}
                {this.exploreCommunitiesButton()}
              </div>
            </div>
            <SiteSidebar
              site={siteView.site}
              admins={Some(siteRes.admins)}
              counts={Some(siteView.counts)}
              online={Some(siteRes.online)}
              showLocal={showLocal(this.isoData)}
            />
            {this.hasFollows && (
              <div className="card border-secondary mb-3">
                <div className="card-body">{this.subscribedCommunities()}</div>
              </div>
            )}
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
        <ul className="list-inline mb-0">
          {this.state.trendingCommunities.map(cv => (
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

  subscribedCommunities() {
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
            {this.state.subscribedCollapsed ? (
              <Icon icon="plus-square" classes="icon-inline" />
            ) : (
              <Icon icon="minus-square" classes="icon-inline" />
            )}
          </button>
        </h5>
        {!this.state.subscribedCollapsed && (
          <ul className="list-inline mb-0">
            {UserService.Instance.myUserInfo
              .map(m => m.follows)
              .unwrapOr([])
              .map(cfv => (
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

  updateUrl(paramUpdates: UrlParams) {
    const listingTypeStr = paramUpdates.listingType || this.state.listingType;
    const dataTypeStr = paramUpdates.dataType || DataType[this.state.dataType];
    const sortStr = paramUpdates.sort || this.state.sort;
    const page = paramUpdates.page || this.state.page;
    this.props.history.push(
      `/home/data_type/${dataTypeStr}/listing_type/${listingTypeStr}/sort/${sortStr}/page/${page}`
    );
  }

  posts() {
    return (
      <div className="main-content-wrapper">
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
    return this.state.dataType == DataType.Post ? (
      <PostListings
        posts={this.state.posts}
        showCommunity
        removeDuplicates
        enableDownvotes={enableDownvotes(this.state.siteRes)}
        enableNsfw={enableNsfw(this.state.siteRes)}
        allLanguages={this.state.siteRes.all_languages}
      />
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.comments)}
        viewType={CommentViewType.Flat}
        moderators={None}
        admins={None}
        maxCommentsShown={None}
        noIndent
        showCommunity
        showContext
        enableDownvotes={enableDownvotes(this.state.siteRes)}
        allLanguages={this.state.siteRes.all_languages}
      />
    );
  }

  selects() {
    let allRss = `/feeds/all.xml?sort=${this.state.sort}`;
    let localRss = `/feeds/local.xml?sort=${this.state.sort}`;
    let frontRss = auth(false)
      .ok()
      .map(auth => `/feeds/front/${auth}.xml?sort=${this.state.sort}`);

    return (
      <div className="mb-3">
        <span className="mr-3">
          <DataTypeSelect
            type_={this.state.dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span className="mr-3">
          <ListingTypeSelect
            type_={this.state.listingType}
            showLocal={showLocal(this.isoData)}
            showSubscribed
            onChange={this.handleListingTypeChange}
          />
        </span>
        <span className="mr-2">
          <SortSelect sort={this.state.sort} onChange={this.handleSortChange} />
        </span>
        {this.state.listingType == ListingType.All && (
          <>
            <a href={allRss} rel={relTags} title="RSS">
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link rel="alternate" type="application/atom+xml" href={allRss} />
          </>
        )}
        {this.state.listingType == ListingType.Local && (
          <>
            <a href={localRss} rel={relTags} title="RSS">
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link rel="alternate" type="application/atom+xml" href={localRss} />
          </>
        )}
        {this.state.listingType == ListingType.Subscribed &&
          frontRss.match({
            some: rss => (
              <>
                <a href={rss} title="RSS" rel={relTags}>
                  <Icon icon="rss" classes="text-muted small" />
                </a>
                <link rel="alternate" type="application/atom+xml" href={rss} />
              </>
            ),
            none: <></>,
          })}
      </div>
    );
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
    this.updateUrl({ dataType: DataType[val], page: 1 });
    window.scrollTo(0, 0);
  }

  fetchData() {
    if (this.state.dataType == DataType.Post) {
      let getPostsForm = new GetPosts({
        community_id: None,
        community_name: None,
        page: Some(this.state.page),
        limit: Some(fetchLimit),
        sort: Some(this.state.sort),
        saved_only: Some(false),
        auth: auth(false).ok(),
        type_: Some(this.state.listingType),
      });

      WebSocketService.Instance.send(wsClient.getPosts(getPostsForm));
    } else {
      let getCommentsForm = new GetComments({
        community_id: None,
        community_name: None,
        page: Some(this.state.page),
        limit: Some(fetchLimit),
        max_depth: None,
        sort: Some(postToCommentSortType(this.state.sort)),
        saved_only: Some(false),
        post_id: None,
        parent_id: None,
        auth: auth(false).ok(),
        type_: Some(this.state.listingType),
      });
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
      let data = wsJsonToRes<ListCommunitiesResponse>(
        msg,
        ListCommunitiesResponse
      );
      this.setState({ trendingCommunities: data.communities });
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg, SiteResponse);
      this.setState(s => ((s.siteRes.site_view = data.site_view), s));
      toast(i18n.t("site_saved"));
    } else if (op == UserOperation.GetPosts) {
      let data = wsJsonToRes<GetPostsResponse>(msg, GetPostsResponse);
      this.setState({ posts: data.posts, loading: false });
      WebSocketService.Instance.send(
        wsClient.communityJoin({ community_id: 0 })
      );
      restoreScrollPosition(this.context);
      setupTippy();
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);

      let showPostNotifs = UserService.Instance.myUserInfo
        .map(m => m.local_user_view.local_user.show_new_post_notifs)
        .unwrapOr(false);

      // Only push these if you're on the first page, you pass the nsfw check, and it isn't blocked
      if (
        this.state.page == 1 &&
        nsfwCheck(data.post_view) &&
        !isPostBlocked(data.post_view)
      ) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            UserService.Instance.myUserInfo
              .map(m => m.follows)
              .unwrapOr([])
              .map(c => c.community.id)
              .includes(data.post_view.community.id)
          ) {
            this.state.posts.unshift(data.post_view);
            if (showPostNotifs) {
              notifyPost(data.post_view, this.context.router);
            }
          }
        } else if (this.state.listingType == ListingType.Local) {
          // If you're on the local view, only push it if its local
          if (data.post_view.post.local) {
            this.state.posts.unshift(data.post_view);
            if (showPostNotifs) {
              notifyPost(data.post_view, this.context.router);
            }
          }
        } else {
          this.state.posts.unshift(data.post_view);
          if (showPostNotifs) {
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
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      editPostFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      createPostLikeFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg, AddAdminResponse);
      this.setState(s => ((s.siteRes.admins = data.admins), s));
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg, BanPersonResponse);
      this.state.posts
        .filter(p => p.creator.id == data.person_view.person.id)
        .forEach(p => (p.creator.banned = data.banned));

      this.setState(this.state);
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg, GetCommentsResponse);
      this.setState({ comments: data.comments, loading: false });
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      editCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);

      // Necessary since it might be a user reply
      if (data.form_id) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            UserService.Instance.myUserInfo
              .map(m => m.follows)
              .unwrapOr([])
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
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      saveCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      createCommentLikeRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg, BlockPersonResponse);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg, PostReportResponse);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg, CommentReportResponse);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (
      op == UserOperation.PurgePerson ||
      op == UserOperation.PurgePost ||
      op == UserOperation.PurgeComment ||
      op == UserOperation.PurgeCommunity
    ) {
      let data = wsJsonToRes<PurgeItemResponse>(msg, PurgeItemResponse);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    }
  }
}
