import { Component, linkEvent } from 'inferno';
import { Subscription } from 'rxjs';
import { DataType } from '../interfaces';
import {
  UserOperation,
  GetCommunityResponse,
  CommunityResponse,
  SortType,
  Post,
  GetPostsForm,
  GetCommunityForm,
  ListingType,
  GetPostsResponse,
  PostResponse,
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  Comment,
  GetCommentsForm,
  GetCommentsResponse,
  CommentResponse,
  WebSocketJsonResponse,
  GetSiteResponse,
  Category,
  ListCategoriesResponse,
} from 'lemmy-js-client';
import { UserService, WebSocketService } from '../services';
import { PostListings } from './post-listings';
import { CommentNodes } from './comment-nodes';
import { HtmlTags } from './html-tags';
import { SortSelect } from './sort-select';
import { DataTypeSelect } from './data-type-select';
import { Sidebar } from './sidebar';
import { CommunityLink } from './community-link';
import { BannerIconHeader } from './banner-icon-header';
import {
  wsJsonToRes,
  fetchLimit,
  toast,
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
  isBrowser,
  lemmyHttp,
  setAuth,
} from '../utils';
import { i18n } from '../i18next';

interface State {
  communityRes: GetCommunityResponse;
  siteRes: GetSiteResponse;
  communityId: number;
  communityName: string;
  loading: boolean;
  posts: Post[];
  comments: Comment[];
  dataType: DataType;
  sort: SortType;
  page: number;
  categories: Category[];
}

interface CommunityProps {
  dataType: DataType;
  sort: SortType;
  page: number;
}

interface UrlParams {
  dataType?: string;
  sort?: SortType;
  page?: number;
}

export class Community extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: State = {
    communityRes: undefined,
    communityId: Number(this.props.match.params.id),
    communityName: this.props.match.params.name,
    loading: true,
    posts: [],
    comments: [],
    dataType: getDataTypeFromProps(this.props),
    sort: getSortTypeFromProps(this.props),
    page: getPageFromProps(this.props),
    siteRes: this.isoData.site,
    categories: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.communityRes = this.isoData.routeData[0];
      if (this.state.dataType == DataType.Post) {
        this.state.posts = this.isoData.routeData[1].posts;
      } else {
        this.state.comments = this.isoData.routeData[1].comments;
      }
      this.state.categories = this.isoData.routeData[2].categories;
      this.state.loading = false;
    } else {
      this.fetchCommunity();
      this.fetchData();
      WebSocketService.Instance.listCategories();
    }
    setupTippy();
  }

  fetchCommunity() {
    let form: GetCommunityForm = {
      id: this.state.communityId ? this.state.communityId : null,
      name: this.state.communityName ? this.state.communityName : null,
    };
    WebSocketService.Instance.getCommunity(form);
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  static getDerivedStateFromProps(props: any): CommunityProps {
    return {
      dataType: getDataTypeFromProps(props),
      sort: getSortTypeFromProps(props),
      page: getPageFromProps(props),
    };
  }

  static fetchInitialData(auth: string, path: string): Promise<any>[] {
    let pathSplit = path.split('/');
    let promises: Promise<any>[] = [];

    // It can be /c/main, or /c/1
    let idOrName = pathSplit[2];
    let id: number;
    let name_: string;
    if (isNaN(Number(idOrName))) {
      name_ = idOrName;
    } else {
      id = Number(idOrName);
    }

    let communityForm: GetCommunityForm = id ? { id } : { name: name_ };
    setAuth(communityForm, auth);
    promises.push(lemmyHttp.getCommunity(communityForm));

    let dataType: DataType = pathSplit[4]
      ? DataType[pathSplit[4]]
      : DataType.Post;

    let sort: SortType = pathSplit[6]
      ? SortType[pathSplit[6]]
      : UserService.Instance.user
      ? Object.values(SortType)[UserService.Instance.user.default_sort_type]
      : SortType.Active;

    let page = pathSplit[8] ? Number(pathSplit[8]) : 1;

    if (dataType == DataType.Post) {
      let getPostsForm: GetPostsForm = {
        page,
        limit: fetchLimit,
        sort,
        type_: ListingType.Community,
      };
      this.setIdOrName(getPostsForm, id, name_);
      setAuth(getPostsForm, auth);
      promises.push(lemmyHttp.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetCommentsForm = {
        page,
        limit: fetchLimit,
        sort,
        type_: ListingType.Community,
      };
      this.setIdOrName(getCommentsForm, id, name_);
      setAuth(getCommentsForm, auth);
      promises.push(lemmyHttp.getComments(getCommentsForm));
    }

    promises.push(lemmyHttp.listCategories());

    return promises;
  }

  static setIdOrName(obj: any, id: number, name_: string) {
    if (id) {
      obj.community_id = id;
    } else {
      obj.community_name = name_;
    }
  }

  componentDidUpdate(_: any, lastState: State) {
    if (
      lastState.dataType !== this.state.dataType ||
      lastState.sort !== this.state.sort ||
      lastState.page !== this.state.page
    ) {
      this.setState({ loading: true });
      this.fetchData();
    }
  }

  get documentTitle(): string {
    return `${this.state.communityRes.community.title} - ${this.state.siteRes.site.name}`;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <svg class="icon icon-spinner spin">
              <use xlinkHref="#icon-spinner"></use>
            </svg>
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-md-8">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                description={this.state.communityRes.community.description}
                image={this.state.communityRes.community.icon}
              />
              {this.communityInfo()}
              {this.selects()}
              {this.listings()}
              {this.paginator()}
            </div>
            <div class="col-12 col-md-4">
              <Sidebar
                community={this.state.communityRes.community}
                moderators={this.state.communityRes.moderators}
                admins={this.state.siteRes.admins}
                online={this.state.communityRes.online}
                enableNsfw={this.state.siteRes.site.enable_nsfw}
                categories={this.state.categories}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  listings() {
    return this.state.dataType == DataType.Post ? (
      <PostListings
        posts={this.state.posts}
        removeDuplicates
        sort={this.state.sort}
        enableDownvotes={this.state.siteRes.site.enable_downvotes}
        enableNsfw={this.state.siteRes.site.enable_nsfw}
      />
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.comments)}
        noIndent
        sortType={this.state.sort}
        showContext
        enableDownvotes={this.state.siteRes.site.enable_downvotes}
      />
    );
  }

  communityInfo() {
    return (
      <div>
        <BannerIconHeader
          banner={this.state.communityRes.community.banner}
          icon={this.state.communityRes.community.icon}
        />
        <h5 class="mb-0">{this.state.communityRes.community.title}</h5>
        <CommunityLink
          community={this.state.communityRes.community}
          realLink
          useApubName
          muted
          hideAvatar
        />
        <hr />
      </div>
    );
  }

  selects() {
    return (
      <div class="mb-3">
        <span class="mr-3">
          <DataTypeSelect
            type_={this.state.dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span class="mr-2">
          <SortSelect sort={this.state.sort} onChange={this.handleSortChange} />
        </span>
        <a
          href={`/feeds/c/${this.state.communityName}.xml?sort=${this.state.sort}`}
          target="_blank"
          title="RSS"
          rel="noopener"
        >
          <svg class="icon text-muted small">
            <use xlinkHref="#icon-rss">#</use>
          </svg>
        </a>
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

  nextPage(i: Community) {
    i.updateUrl({ page: i.state.page + 1 });
    window.scrollTo(0, 0);
  }

  prevPage(i: Community) {
    i.updateUrl({ page: i.state.page - 1 });
    window.scrollTo(0, 0);
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
    window.scrollTo(0, 0);
  }

  handleDataTypeChange(val: DataType) {
    this.updateUrl({ dataType: DataType[val], page: 1 });
    window.scrollTo(0, 0);
  }

  updateUrl(paramUpdates: UrlParams) {
    const dataTypeStr = paramUpdates.dataType || DataType[this.state.dataType];
    const sortStr = paramUpdates.sort || this.state.sort;
    const page = paramUpdates.page || this.state.page;
    this.props.history.push(
      `/c/${this.state.communityRes.community.name}/data_type/${dataTypeStr}/sort/${sortStr}/page/${page}`
    );
  }

  fetchData() {
    if (this.state.dataType == DataType.Post) {
      let getPostsForm: GetPostsForm = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: ListingType.Community,
        community_id: this.state.communityId,
        community_name: this.state.communityName,
      };
      WebSocketService.Instance.getPosts(getPostsForm);
    } else {
      let getCommentsForm: GetCommentsForm = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: ListingType.Community,
        community_id: this.state.communityId,
        community_name: this.state.communityName,
      };
      WebSocketService.Instance.getComments(getCommentsForm);
    }
  }

  parseMessage(msg: WebSocketJsonResponse) {
    console.log(msg);
    let res = wsJsonToRes(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.context.router.history.push('/');
      return;
    } else if (msg.reconnect) {
      this.fetchData();
    } else if (res.op == UserOperation.GetCommunity) {
      let data = res.data as GetCommunityResponse;
      this.state.communityRes = data;
      if (this.state.posts.length || this.state.comments.length) {
        this.state.loading = false;
      }
      this.setState(this.state);
      WebSocketService.Instance.communityJoin({
        community_id: data.community.id,
      });
    } else if (
      res.op == UserOperation.EditCommunity ||
      res.op == UserOperation.DeleteCommunity ||
      res.op == UserOperation.RemoveCommunity
    ) {
      let data = res.data as CommunityResponse;
      this.state.communityRes.community = data.community;
      this.setState(this.state);
    } else if (res.op == UserOperation.FollowCommunity) {
      let data = res.data as CommunityResponse;
      this.state.communityRes.community.subscribed = data.community.subscribed;
      this.state.communityRes.community.number_of_subscribers =
        data.community.number_of_subscribers;
      this.setState(this.state);
    } else if (res.op == UserOperation.GetPosts) {
      let data = res.data as GetPostsResponse;
      this.state.posts = data.posts;

      if (this.state.communityRes) {
        this.state.loading = false;
      }
      this.setState(this.state);
      setupTippy();
    } else if (
      res.op == UserOperation.EditPost ||
      res.op == UserOperation.DeletePost ||
      res.op == UserOperation.RemovePost ||
      res.op == UserOperation.LockPost ||
      res.op == UserOperation.StickyPost
    ) {
      let data = res.data as PostResponse;
      editPostFindRes(data, this.state.posts);
      this.setState(this.state);
    } else if (res.op == UserOperation.CreatePost) {
      let data = res.data as PostResponse;
      this.state.posts.unshift(data.post);
      notifyPost(data.post, this.context.router);
      this.setState(this.state);
    } else if (res.op == UserOperation.CreatePostLike) {
      let data = res.data as PostResponse;
      createPostLikeFindRes(data, this.state.posts);
      this.setState(this.state);
    } else if (res.op == UserOperation.AddModToCommunity) {
      let data = res.data as AddModToCommunityResponse;
      this.state.communityRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (res.op == UserOperation.BanFromCommunity) {
      let data = res.data as BanFromCommunityResponse;

      this.state.posts
        .filter(p => p.creator_id == data.user.id)
        .forEach(p => (p.banned = data.banned));

      this.setState(this.state);
    } else if (res.op == UserOperation.GetComments) {
      let data = res.data as GetCommentsResponse;
      this.state.comments = data.comments;
      if (this.state.communityRes) {
        this.state.loading = false;
      }
      this.setState(this.state);
    } else if (
      res.op == UserOperation.EditComment ||
      res.op == UserOperation.DeleteComment ||
      res.op == UserOperation.RemoveComment
    ) {
      let data = res.data as CommentResponse;
      editCommentRes(data, this.state.comments);
      this.setState(this.state);
    } else if (res.op == UserOperation.CreateComment) {
      let data = res.data as CommentResponse;

      // Necessary since it might be a user reply
      if (data.recipient_ids.length == 0) {
        this.state.comments.unshift(data.comment);
        this.setState(this.state);
      }
    } else if (res.op == UserOperation.SaveComment) {
      let data = res.data as CommentResponse;
      saveCommentRes(data, this.state.comments);
      this.setState(this.state);
    } else if (res.op == UserOperation.CreateCommentLike) {
      let data = res.data as CommentResponse;
      createCommentLikeRes(data, this.state.comments);
      this.setState(this.state);
    } else if (res.op == UserOperation.ListCategories) {
      let data = res.data as ListCategoriesResponse;
      this.state.categories = data.categories;
      this.setState(this.state);
    }
  }
}
