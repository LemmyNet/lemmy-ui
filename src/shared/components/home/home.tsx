import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent, MouseEventHandler } from "inferno";
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
  getDataTypeString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  getRandomFromList,
  isBrowser,
  isPostBlocked,
  mdToHtml,
  myAuth,
  notifyPost,
  nsfwCheck,
  postToCommentSortType,
  QueryParams,
  relTags,
  restoreScrollPosition,
  routeDataTypeToEnum,
  routeListingTypeToEnum,
  routeSortTypeToEnum,
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

const getDataTypeFromQuery = (type?: string) =>
  routeDataTypeToEnum(type ?? "", DataType.Post);

function getListingTypeFromQuery(type?: string) {
  const mui = UserService.Instance.myUserInfo;

  return routeListingTypeToEnum(
    type ?? "",
    mui
      ? Object.values(ListingType)[
          mui.local_user_view.local_user.default_listing_type
        ]
      : ListingType.Local
  );
}

function getSortTypeFromQuery(type?: string) {
  const mui = UserService.Instance.myUserInfo;

  return routeSortTypeToEnum(
    type ?? "",
    mui
      ? Object.values(SortType)[
          mui.local_user_view.local_user.default_listing_type
        ]
      : SortType.Active
  );
}

const getHomeQueryParams = () =>
  getQueryParams<HomeProps>({
    sort: getSortTypeFromQuery,
    listingType: getListingTypeFromQuery,
    page: getPageFromString,
    dataType: getDataTypeFromQuery,
  });

function fetchTrendingCommunities() {
  const listCommunitiesForm: ListCommunities = {
    type_: ListingType.Local,
    sort: SortType.Hot,
    limit: trendingFetchLimit,
    auth: myAuth(false),
  };
  WebSocketService.Instance.send(wsClient.listCommunities(listCommunitiesForm));
}

function fetchData() {
  const auth = myAuth(false);
  const { dataType, page, listingType, sort } = getHomeQueryParams();
  let req: string;

  if (dataType === DataType.Post) {
    const getPostsForm: GetPosts = {
      page,
      limit: fetchLimit,
      sort,
      saved_only: false,
      type_: listingType,
      auth,
    };

    req = wsClient.getPosts(getPostsForm);
  } else {
    const getCommentsForm: GetComments = {
      page,
      limit: fetchLimit,
      sort: postToCommentSortType(sort),
      saved_only: false,
      type_: listingType,
      auth,
    };

    req = wsClient.getComments(getCommentsForm);
  }

  WebSocketService.Instance.send(req);
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

function getRss(listingType: ListingType) {
  const { sort } = getHomeQueryParams();
  const auth = myAuth(false);

  let rss: string | undefined = undefined;

  switch (listingType) {
    case ListingType.All: {
      rss = `/feeds/all.xml?sort=${sort}`;
      break;
    }
    case ListingType.Local: {
      rss = `/feeds/local.xml?sort=${sort}`;
      break;
    }
    case ListingType.Subscribed: {
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
    if (this.isoData.path === this.context.router.route.match.url) {
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
      fetchTrendingCommunities();
      fetchData();
    }
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
      type_: ListingType.Local,
      sort: SortType.Hot,
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
      loading,
    } = this.state;

    return (
      <div>
        {!loading && (
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
        )}
      </div>
    );
  }

  trendingCommunities(isMobile = false) {
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

  updateUrl({ dataType, listingType, page, sort }: Partial<HomeProps>) {
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

    this.setState({
      loading: true,
      posts: [],
      comments: [],
    });

    fetchData();
  }

  posts() {
    const { page } = getHomeQueryParams();

    return (
      <div className="main-content-wrapper">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div>
            {this.selects()}
            {this.listings}
            <Paginator page={page} onChange={this.handlePageChange} />
          </div>
        )}
      </div>
    );
  }

  get listings() {
    const { dataType } = getHomeQueryParams();
    const { siteRes, posts, comments } = this.state;

    return dataType === DataType.Post ? (
      <PostListings
        posts={posts}
        showCommunity
        removeDuplicates
        enableDownvotes={enableDownvotes(siteRes)}
        enableNsfw={enableNsfw(siteRes)}
        allLanguages={siteRes.all_languages}
        siteLanguages={siteRes.discussion_languages}
      />
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(comments)}
        viewType={CommentViewType.Flat}
        noIndent
        showCommunity
        showContext
        enableDownvotes={enableDownvotes(siteRes)}
        allLanguages={siteRes.all_languages}
        siteLanguages={siteRes.discussion_languages}
      />
    );
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
        {getRss(listingType)}
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
    this.updateUrl({ dataType: val, page: 1 });
    window.scrollTo(0, 0);
  }

  parseMessage(msg: any) {
    const op = wsUserOp(msg);
    console.log(msg);

    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
    } else if (msg.reconnect) {
      WebSocketService.Instance.send(
        wsClient.communityJoin({ community_id: 0 })
      );
      fetchData();
    } else {
      switch (op) {
        case UserOperation.ListCommunities: {
          const { communities } = wsJsonToRes<ListCommunitiesResponse>(msg);
          this.setState({ trendingCommunities: communities });

          break;
        }

        case UserOperation.EditSite: {
          const { site_view } = wsJsonToRes<SiteResponse>(msg);
          this.setState(s => ((s.siteRes.site_view = site_view), s));
          toast(i18n.t("site_saved"));

          break;
        }

        case UserOperation.GetPosts: {
          const { posts } = wsJsonToRes<GetPostsResponse>(msg);
          this.setState({ posts, loading: false });
          WebSocketService.Instance.send(
            wsClient.communityJoin({ community_id: 0 })
          );
          restoreScrollPosition(this.context);
          setupTippy();

          break;
        }

        case UserOperation.CreatePost: {
          const { page, listingType } = getHomeQueryParams();
          const { post_view } = wsJsonToRes<PostResponse>(msg);

          // Only push these if you're on the first page, you pass the nsfw check, and it isn't blocked
          if (page === 1 && nsfwCheck(post_view) && !isPostBlocked(post_view)) {
            const mui = UserService.Instance.myUserInfo;
            const showPostNotifs =
              mui?.local_user_view.local_user.show_new_post_notifs;
            let shouldAddPost: boolean;

            switch (listingType) {
              case ListingType.Subscribed: {
                // If you're on subscribed, only push it if you're subscribed.
                shouldAddPost = !!mui?.follows.some(
                  ({ community: { id } }) => id === post_view.community.id
                );
                break;
              }
              case ListingType.Local: {
                // If you're on the local view, only push it if its local
                shouldAddPost = post_view.post.local;
                break;
              }
              default: {
                shouldAddPost = true;
                break;
              }
            }

            if (shouldAddPost) {
              this.setState(({ posts }) => ({
                posts: [post_view].concat(posts),
              }));
              if (showPostNotifs) {
                notifyPost(post_view, this.context.router);
              }
            }
          }

          break;
        }

        case UserOperation.EditPost:
        case UserOperation.DeletePost:
        case UserOperation.RemovePost:
        case UserOperation.LockPost:
        case UserOperation.FeaturePost:
        case UserOperation.SavePost: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);
          editPostFindRes(post_view, this.state.posts);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreatePostLike: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);
          createPostLikeFindRes(post_view, this.state.posts);
          this.setState(this.state);

          break;
        }

        case UserOperation.AddAdmin: {
          const { admins } = wsJsonToRes<AddAdminResponse>(msg);
          this.setState(s => ((s.siteRes.admins = admins), s));

          break;
        }

        case UserOperation.BanPerson: {
          const {
            banned,
            person_view: {
              person: { id },
            },
          } = wsJsonToRes<BanPersonResponse>(msg);

          this.state.posts
            .filter(p => p.creator.id == id)
            .forEach(p => (p.creator.banned = banned));
          this.setState(this.state);

          break;
        }

        case UserOperation.GetComments: {
          const { comments } = wsJsonToRes<GetCommentsResponse>(msg);
          this.setState({ comments, loading: false });

          break;
        }

        case UserOperation.EditComment:
        case UserOperation.DeleteComment:
        case UserOperation.RemoveComment: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          editCommentRes(comment_view, this.state.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreateComment: {
          const { form_id, comment_view } = wsJsonToRes<CommentResponse>(msg);

          // Necessary since it might be a user reply
          if (form_id) {
            const { listingType } = getHomeQueryParams();

            // If you're on subscribed, only push it if you're subscribed.
            const shouldAddComment =
              listingType === ListingType.Subscribed
                ? UserService.Instance.myUserInfo?.follows.some(
                    ({ community: { id } }) => id === comment_view.community.id
                  )
                : true;

            if (shouldAddComment) {
              this.setState(({ comments }) => ({
                comments: [comment_view].concat(comments),
              }));
            }
          }

          break;
        }

        case UserOperation.SaveComment: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          saveCommentRes(comment_view, this.state.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreateCommentLike: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          createCommentLikeRes(comment_view, this.state.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.BlockPerson: {
          const data = wsJsonToRes<BlockPersonResponse>(msg);
          updatePersonBlock(data);

          break;
        }

        case UserOperation.CreatePostReport: {
          const data = wsJsonToRes<PostReportResponse>(msg);
          if (data) {
            toast(i18n.t("report_created"));
          }

          break;
        }

        case UserOperation.CreateCommentReport: {
          const data = wsJsonToRes<CommentReportResponse>(msg);
          if (data) {
            toast(i18n.t("report_created"));
          }

          break;
        }

        case UserOperation.PurgePerson:
        case UserOperation.PurgePost:
        case UserOperation.PurgeComment:
        case UserOperation.PurgeCommunity: {
          const data = wsJsonToRes<PurgeItemResponse>(msg);
          if (data.success) {
            toast(i18n.t("purge_success"));
            this.context.router.history.push(`/`);
          }

          break;
        }
      }
    }
  }
}
