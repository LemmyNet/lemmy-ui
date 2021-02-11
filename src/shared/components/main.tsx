import { Component, linkEvent } from 'inferno';
import { Link } from 'inferno-router';
import { Subscription } from 'rxjs';
import {
  UserOperation,
  CommunityFollowerView,
  GetFollowedCommunitiesResponse,
  ListCommunities,
  ListCommunitiesResponse,
  CommunityView,
  SortType,
  GetSiteResponse,
  ListingType,
  SiteResponse,
  GetPostsResponse,
  PostResponse,
  PostView,
  GetPosts,
  CommentView,
  GetComments,
  GetCommentsResponse,
  CommentResponse,
  AddAdminResponse,
  BanUserResponse,
} from 'lemmy-js-client';
import { DataType, InitialFetchRequest } from '../interfaces';
import { WebSocketService, UserService } from '../services';
import { PostListings } from './post-listings';
import { CommentNodes } from './comment-nodes';
import { SortSelect } from './sort-select';
import { ListingTypeSelect } from './listing-type-select';
import { DataTypeSelect } from './data-type-select';
import { SiteForm } from './site-form';
import { UserListing } from './user-listing';
import { CommunityLink } from './community-link';
import { BannerIconHeader } from './banner-icon-header';
import { Icon, Spinner } from './icon';
import {
  wsJsonToRes,
  mdToHtml,
  fetchLimit,
  toast,
  getListingTypeFromProps,
  getPageFromProps,
  getSortTypeFromProps,
  getDataTypeFromProps,
  editCommentRes,
  saveCommentRes,
  createCommentLikeRes,
  createPostLikeFindRes,
  editPostFindRes,
  commentsToFlatNodes,
  setupTippy,
  notifyPost,
  setIsoData,
  wsSubscribe,
  wsUserOp,
  setOptionalAuth,
  wsClient,
  authField,
  saveScrollPosition,
  restoreScrollPosition,
} from '../utils';
import { i18n } from '../i18next';
import { T } from 'inferno-i18next';
import { HtmlTags } from './html-tags';

interface MainState {
  subscribedCommunities: CommunityFollowerView[];
  trendingCommunities: CommunityView[];
  siteRes: GetSiteResponse;
  showEditSite: boolean;
  loading: boolean;
  posts: PostView[];
  comments: CommentView[];
  listingType: ListingType;
  dataType: DataType;
  sort: SortType;
  page: number;
}

interface MainProps {
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

export class Main extends Component<any, MainState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: MainState = {
    subscribedCommunities: [],
    trendingCommunities: [],
    siteRes: this.isoData.site_res,
    showEditSite: false,
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
      if (UserService.Instance.user) {
        this.state.subscribedCommunities = this.isoData.routeData[2].communities;
      }
      this.state.loading = false;
    } else {
      this.fetchTrendingCommunities();
      this.fetchData();
      if (UserService.Instance.user) {
        WebSocketService.Instance.send(
          wsClient.getFollowedCommunities({
            auth: authField(),
          })
        );
      }
    }

    setupTippy();
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
      this.context.router.history.push('/setup');
    }

    WebSocketService.Instance.send(wsClient.communityJoin({ community_id: 0 }));
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
    this.subscription.unsubscribe();
    window.isoData.path = undefined;
  }

  static getDerivedStateFromProps(props: any): MainProps {
    return {
      listingType: getListingTypeFromProps(props),
      dataType: getDataTypeFromProps(props),
      sort: getSortTypeFromProps(props),
      page: getPageFromProps(props),
    };
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split('/');
    let dataType: DataType = pathSplit[3]
      ? DataType[pathSplit[3]]
      : DataType.Post;

    // TODO figure out auth default_listingType, default_sort_type
    let type_: ListingType = pathSplit[5]
      ? ListingType[pathSplit[5]]
      : UserService.Instance.user
      ? Object.values(ListingType)[
          UserService.Instance.user.default_listing_type
        ]
      : ListingType.Local;
    let sort: SortType = pathSplit[7]
      ? SortType[pathSplit[7]]
      : UserService.Instance.user
      ? Object.values(SortType)[UserService.Instance.user.default_sort_type]
      : SortType.Active;

    let page = pathSplit[9] ? Number(pathSplit[9]) : 1;

    let promises: Promise<any>[] = [];

    if (dataType == DataType.Post) {
      let getPostsForm: GetPosts = {
        page,
        limit: fetchLimit,
        sort,
        type_,
      };
      setOptionalAuth(getPostsForm, req.auth);
      promises.push(req.client.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetComments = {
        page,
        limit: fetchLimit,
        sort,
        type_,
      };
      setOptionalAuth(getCommentsForm, req.auth);
      promises.push(req.client.getComments(getCommentsForm));
    }

    let trendingCommunitiesForm: ListCommunities = {
      type_: ListingType.Local,
      sort: SortType.Hot,
      limit: 6,
    };
    promises.push(req.client.listCommunities(trendingCommunitiesForm));

    if (req.auth) {
      promises.push(req.client.getFollowedCommunities({ auth: req.auth }));
    }

    return promises;
  }

  componentDidUpdate(_: any, lastState: MainState) {
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
        ? this.state.siteRes.site_view.site.name
        : 'Lemmy'
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
              {this.posts()}
            </main>
            <aside class="col-12 col-md-4">{this.mySidebar()}</aside>
          </div>
        )}
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
              </div>
            </div>

            {UserService.Instance.user &&
              this.state.subscribedCommunities.length > 0 && (
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
      <Link className="btn btn-secondary btn-block" to="/create_community">
        {i18n.t('create_a_community')}
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
        <ul class="list-inline">
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
          {this.state.subscribedCommunities.map(cfv => (
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
    return (
      <div>
        {this.state.siteRes.site_view.site.description &&
          this.siteDescription()}
        {this.badges()}
        {this.admins()}
      </div>
    );
  }

  siteName() {
    return <h5 class="mb-0">{`${this.documentTitle}`}</h5>;
  }

  admins() {
    return (
      <ul class="mt-1 list-inline small mb-0">
        <li class="list-inline-item">{i18n.t('admins')}:</li>
        {this.state.siteRes.admins.map(av => (
          <li class="list-inline-item">
            <UserListing user={av.user} />
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
          {i18n.t('number_online', { count: this.state.siteRes.online })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t('number_of_users', {
            count: counts.users_active_day,
          })} ${i18n.t('active_in_the_last')} ${i18n.t('day')}`}
        >
          {i18n.t('number_of_users', {
            count: counts.users_active_day,
          })}{' '}
          / {i18n.t('day')}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t('number_of_users', {
            count: counts.users_active_week,
          })} ${i18n.t('active_in_the_last')} ${i18n.t('week')}`}
        >
          {i18n.t('number_of_users', {
            count: counts.users_active_week,
          })}{' '}
          / {i18n.t('week')}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t('number_of_users', {
            count: counts.users_active_month,
          })} ${i18n.t('active_in_the_last')} ${i18n.t('month')}`}
        >
          {i18n.t('number_of_users', {
            count: counts.users_active_month,
          })}{' '}
          / {i18n.t('month')}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t('number_of_users', {
            count: counts.users_active_half_year,
          })} ${i18n.t('active_in_the_last')} ${i18n.t('number_of_months', {
            count: 6,
          })}`}
        >
          {i18n.t('number_of_users', {
            count: counts.users_active_half_year,
          })}{' '}
          / {i18n.t('number_of_months', { count: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_subscribers', {
            count: counts.users,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_communities', {
            count: counts.communities,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_posts', {
            count: counts.posts,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_comments', {
            count: counts.comments,
          })}
        </li>
        <li className="list-inline-item">
          <Link className="badge badge-secondary" to="/modlog">
            {i18n.t('modlog')}
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
            <span
              class="pointer"
              role="button"
              onClick={linkEvent(this, this.handleEditClick)}
              aria-label={i18n.t('edit')}
              data-tippy-content={i18n.t('edit')}
            >
              <Icon icon="edit" classes="icon-inline" />
            </span>
          </li>
        </ul>
      )
    );
  }

  siteDescription() {
    return (
      <div
        className="md-div"
        dangerouslySetInnerHTML={mdToHtml(
          this.state.siteRes.site_view.site.description
        )}
      />
    );
  }

  posts() {
    return (
      <div class="main-content-wrapper">
        {this.state.loading ? (
          <h5>
            <Spinner />
          </h5>
        ) : (
          <div>
            {this.selects()}
            {this.listings()}
            {this.paginator()}
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
            showLocal={this.showLocal}
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
        {UserService.Instance.user &&
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

  paginator() {
    return (
      <div class="my-2">
        {this.state.page > 1 && (
          <button
            class="btn btn-secondary mr-1"
            onClick={linkEvent(this, this.prevPage)}
          >
            {i18n.t('prev')}
          </button>
        )}
        {this.state.posts.length > 0 && (
          <button
            class="btn btn-secondary"
            onClick={linkEvent(this, this.nextPage)}
          >
            {i18n.t('next')}
          </button>
        )}
      </div>
    );
  }

  get showLocal(): boolean {
    return this.isoData.site_res.federated_instances?.linked.length > 0;
  }

  get canAdmin(): boolean {
    return (
      UserService.Instance.user &&
      this.state.siteRes.admins
        .map(a => a.user.id)
        .includes(UserService.Instance.user.id)
    );
  }

  handleEditClick(i: Main) {
    i.state.showEditSite = true;
    i.setState(i.state);
  }

  handleEditCancel() {
    this.state.showEditSite = false;
    this.setState(this.state);
  }

  nextPage(i: Main) {
    i.updateUrl({ page: i.state.page + 1 });
    window.scrollTo(0, 0);
  }

  prevPage(i: Main) {
    i.updateUrl({ page: i.state.page - 1 });
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
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetComments = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: this.state.listingType,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.getComments(getCommentsForm));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      return;
    } else if (msg.reconnect) {
      WebSocketService.Instance.send(
        wsClient.communityJoin({ community_id: 0 })
      );
      this.fetchData();
    } else if (op == UserOperation.GetFollowedCommunities) {
      let data = wsJsonToRes<GetFollowedCommunitiesResponse>(msg).data;
      this.state.subscribedCommunities = data.communities;
      this.setState(this.state);
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg).data;
      this.state.trendingCommunities = data.communities;
      this.setState(this.state);
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg).data;
      this.state.siteRes.site_view = data.site_view;
      this.state.showEditSite = false;
      this.setState(this.state);
      toast(i18n.t('site_saved'));
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
          UserService.Instance.user &&
          UserService.Instance.user.show_nsfw);

      // Only push these if you're on the first page, and you pass the nsfw check
      if (this.state.page == 1 && nsfwCheck) {
        // If you're on subscribed, only push it if you're subscribed.
        if (this.state.listingType == ListingType.Subscribed) {
          if (
            this.state.subscribedCommunities
              .map(c => c.community.id)
              .includes(data.post_view.community.id)
          ) {
            this.state.posts.unshift(data.post_view);
            notifyPost(data.post_view, this.context.router);
          }
        } else if (this.state.listingType == ListingType.Local) {
          // If you're on the local view, only push it if its local
          if (data.post_view.post.local) {
            this.state.posts.unshift(data.post_view);
            notifyPost(data.post_view, this.context.router);
          }
        } else {
          this.state.posts.unshift(data.post_view);
          notifyPost(data.post_view, this.context.router);
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
    } else if (op == UserOperation.BanUser) {
      let data = wsJsonToRes<BanUserResponse>(msg).data;
      let found = this.state.siteRes.banned.find(
        u => (u.user.id = data.user_view.user.id)
      );

      // Remove the banned if its found in the list, and the action is an unban
      if (found && !data.banned) {
        this.state.siteRes.banned = this.state.siteRes.banned.filter(
          i => i.user.id !== data.user_view.user.id
        );
      } else {
        this.state.siteRes.banned.push(data.user_view);
      }

      this.state.posts
        .filter(p => p.creator.id == data.user_view.user.id)
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
            this.state.subscribedCommunities
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
    }
  }
}
