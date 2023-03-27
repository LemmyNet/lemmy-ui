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
  myAuth,
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
  tagline?: string;
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
  private subscription?: Subscription;
  state: HomeState = {
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
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let postsRes = this.isoData.routeData[0] as GetPostsResponse | undefined;
      let commentsRes = this.isoData.routeData[1] as
        | GetCommentsResponse
        | undefined;
      let trendingRes = this.isoData.routeData[2] as
        | ListCommunitiesResponse
        | undefined;

      if (postsRes) {
        this.state = { ...this.state, posts: postsRes.posts };
      }

      if (commentsRes) {
        this.state = { ...this.state, comments: commentsRes.comments };
      }

      if (isBrowser()) {
        WebSocketService.Instance.send(
          wsClient.communityJoin({ community_id: 0 })
        );
      }
      const taglines = this.state?.siteRes?.taglines ?? [];
      this.state = {
        ...this.state,
        trendingCommunities: trendingRes?.communities ?? [],
        loading: false,
        tagline: getRandomFromList(taglines)?.content,
      };
    } else {
      this.fetchTrendingCommunities();
      this.fetchData();
    }
  }

  fetchTrendingCommunities() {
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.Local,
      sort: SortType.Hot,
      limit: trendingFetchLimit,
      auth: myAuth(false),
    };
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
    this.subscription?.unsubscribe();
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
    let mui = UserService.Instance.myUserInfo;
    let auth = req.auth;

    // TODO figure out auth default_listingType, default_sort_type
    let type_: ListingType = pathSplit[5]
      ? ListingType[pathSplit[5]]
      : mui
      ? Object.values(ListingType)[
          mui.local_user_view.local_user.default_listing_type
        ]
      : ListingType.Local;
    let sort: SortType = pathSplit[7]
      ? SortType[pathSplit[7]]
      : mui
      ? (Object.values(SortType)[
          mui.local_user_view.local_user.default_sort_type
        ] as SortType)
      : SortType.Active;

    let page = pathSplit[9] ? Number(pathSplit[9]) : 1;

    let promises: Promise<any>[] = [];

    if (dataType == DataType.Post) {
      let getPostsForm: GetPosts = {
        type_,
        page,
        limit: fetchLimit,
        sort,
        saved_only: false,
        auth,
      };

      promises.push(req.client.getPosts(getPostsForm));
      promises.push(Promise.resolve());
    } else {
      let getCommentsForm: GetComments = {
        page,
        limit: fetchLimit,
        sort: postToCommentSortType(sort),
        type_,
        saved_only: false,
        auth,
      };
      promises.push(Promise.resolve());
      promises.push(req.client.getComments(getCommentsForm));
    }

    let trendingCommunitiesForm: ListCommunities = {
      type_: ListingType.Local,
      sort: SortType.Hot,
      limit: trendingFetchLimit,
      auth,
    };
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
    let desc = this.state.siteRes.site_view.site.description;
    return desc ? `${siteView.site.name} - ${desc}` : siteView.site.name;
  }

  render() {
    let tagline = this.state.tagline;

    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.siteRes.site_view.local_site.site_setup && (
          <div className="row">
            <main role="main" className="col-12 col-md-8">
              {tagline && (
                <div
                  id="tagline"
                  dangerouslySetInnerHTML={mdToHtml(tagline)}
                ></div>
              )}
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
    let mui = UserService.Instance.myUserInfo;
    return !!mui && mui.follows.length > 0;
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
              admins={siteRes.admins}
              counts={siteView.counts}
              online={siteRes.online}
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
              admins={siteRes.admins}
              counts={siteView.counts}
              online={siteRes.online}
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
        siteLanguages={this.state.siteRes.discussion_languages}
      />
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.comments)}
        viewType={CommentViewType.Flat}
        noIndent
        showCommunity
        showContext
        enableDownvotes={enableDownvotes(this.state.siteRes)}
        allLanguages={this.state.siteRes.all_languages}
        siteLanguages={this.state.siteRes.discussion_languages}
      />
    );
  }

  selects() {
    let allRss = `/feeds/all.xml?sort=${this.state.sort}`;
    let localRss = `/feeds/local.xml?sort=${this.state.sort}`;
    let auth = myAuth(false);
    let frontRss = auth
      ? `/feeds/front/${auth}.xml?sort=${this.state.sort}`
      : undefined;

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
        {this.state.listingType == ListingType.Subscribed && frontRss && (
          <>
            <a href={frontRss} title="RSS" rel={relTags}>
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link rel="alternate" type="application/atom+xml" href={frontRss} />
          </>
        )}
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
    let auth = myAuth(false);
    if (this.state.dataType == DataType.Post) {
      let getPostsForm: GetPosts = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        saved_only: false,
        type_: this.state.listingType,
        auth,
      };

      WebSocketService.Instance.send(wsClient.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetComments = {
        page: this.state.page,
        limit: fetchLimit,
        sort: postToCommentSortType(this.state.sort),
        saved_only: false,
        type_: this.state.listingType,
        auth,
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
      let data = wsJsonToRes<ListCommunitiesResponse>(msg);
      this.setState({ trendingCommunities: data.communities });
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg);
      this.setState(s => ((s.siteRes.site_view = data.site_view), s));
      toast(i18n.t("site_saved"));
    } else if (op == UserOperation.GetPosts) {
      let data = wsJsonToRes<GetPostsResponse>(msg);
      this.setState({ posts: data.posts, loading: false });
      WebSocketService.Instance.send(
        wsClient.communityJoin({ community_id: 0 })
      );
      restoreScrollPosition(this.context);
      setupTippy();
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg);
      let mui = UserService.Instance.myUserInfo;

      let showPostNotifs = mui?.local_user_view.local_user.show_new_post_notifs;

      // Only push these if you're on the first page, you pass the nsfw check, and it isn't blocked
      if (
        this.state.page == 1 &&
        nsfwCheck(data.post_view) &&
        !isPostBlocked(data.post_view)
      ) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            mui?.follows
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
      op == UserOperation.FeaturePost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg);
      editPostFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg);
      createPostLikeFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg);
      this.setState(s => ((s.siteRes.admins = data.admins), s));
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg);
      this.state.posts
        .filter(p => p.creator.id == data.person_view.person.id)
        .forEach(p => (p.creator.banned = data.banned));

      this.setState(this.state);
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg);
      this.setState({ comments: data.comments, loading: false });
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg);
      editCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg);

      // Necessary since it might be a user reply
      if (data.form_id) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            UserService.Instance.myUserInfo?.follows
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
      let data = wsJsonToRes<CommentResponse>(msg);
      saveCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (
      op == UserOperation.PurgePerson ||
      op == UserOperation.PurgePost ||
      op == UserOperation.PurgeComment ||
      op == UserOperation.PurgeCommunity
    ) {
      let data = wsJsonToRes<PurgeItemResponse>(msg);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    }
  }
}
