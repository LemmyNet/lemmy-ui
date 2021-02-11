import { Component, linkEvent } from 'inferno';
import { Subscription } from 'rxjs';
import { DataType, InitialFetchRequest } from '../interfaces';
import {
  UserOperation,
  GetCommunityResponse,
  CommunityResponse,
  SortType,
  PostView,
  GetPosts,
  GetCommunity,
  ListingType,
  GetPostsResponse,
  PostResponse,
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  CommentView,
  GetComments,
  GetCommentsResponse,
  CommentResponse,
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
import { Icon, Spinner } from './icon';
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
  communityRSSUrl,
  wsUserOp,
  wsClient,
  authField,
  setOptionalAuth,
  saveScrollPosition,
  restoreScrollPosition,
} from '../utils';
import { i18n } from '../i18next';

interface State {
  communityRes: GetCommunityResponse;
  siteRes: GetSiteResponse;
  communityId: number;
  communityName: string;
  communityLoading: boolean;
  postsLoading: boolean;
  commentsLoading: boolean;
  posts: PostView[];
  comments: CommentView[];
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
    communityLoading: true,
    postsLoading: true,
    commentsLoading: true,
    posts: [],
    comments: [],
    dataType: getDataTypeFromProps(this.props),
    sort: getSortTypeFromProps(this.props),
    page: getPageFromProps(this.props),
    siteRes: this.isoData.site_res,
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
      this.state.communityLoading = false;
      this.state.postsLoading = false;
      this.state.commentsLoading = false;
    } else {
      this.fetchCommunity();
      this.fetchData();
      WebSocketService.Instance.send(wsClient.listCategories());
    }
    setupTippy();
  }

  fetchCommunity() {
    let form: GetCommunity = {
      id: this.state.communityId ? this.state.communityId : null,
      name: this.state.communityName ? this.state.communityName : null,
      auth: authField(false),
    };
    WebSocketService.Instance.send(wsClient.getCommunity(form));
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
    this.subscription.unsubscribe();
    window.isoData.path = undefined;
  }

  static getDerivedStateFromProps(props: any): CommunityProps {
    return {
      dataType: getDataTypeFromProps(props),
      sort: getSortTypeFromProps(props),
      page: getPageFromProps(props),
    };
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split('/');
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

    let communityForm: GetCommunity = id ? { id } : { name: name_ };
    setOptionalAuth(communityForm, req.auth);
    promises.push(req.client.getCommunity(communityForm));

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
      let getPostsForm: GetPosts = {
        page,
        limit: fetchLimit,
        sort,
        type_: ListingType.Community,
      };
      setOptionalAuth(getPostsForm, req.auth);
      this.setIdOrName(getPostsForm, id, name_);
      promises.push(req.client.getPosts(getPostsForm));
    } else {
      let getCommentsForm: GetComments = {
        page,
        limit: fetchLimit,
        sort,
        type_: ListingType.Community,
      };
      setOptionalAuth(getCommentsForm, req.auth);
      this.setIdOrName(getCommentsForm, id, name_);
      promises.push(req.client.getComments(getCommentsForm));
    }

    promises.push(req.client.listCategories());

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
      this.setState({ postsLoading: true, commentsLoading: true });
      this.fetchData();
    }
  }

  get documentTitle(): string {
    return `${this.state.communityRes.community_view.community.title} - ${this.state.siteRes.site_view.site.name}`;
  }

  render() {
    let cv = this.state.communityRes?.community_view;
    return (
      <div class="container">
        {this.state.communityLoading ? (
          <h5>
            <Spinner />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-md-8">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                description={cv.community.description}
                image={cv.community.icon}
              />
              {this.communityInfo()}
              {this.selects()}
              {this.listings()}
              {this.paginator()}
            </div>
            <div class="col-12 col-md-4">
              <Sidebar
                community_view={cv}
                moderators={this.state.communityRes.moderators}
                admins={this.state.siteRes.admins}
                online={this.state.communityRes.online}
                enableNsfw={this.state.siteRes.site_view.site.enable_nsfw}
                categories={this.state.categories}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  listings() {
    let site = this.state.siteRes.site_view.site;
    return this.state.dataType == DataType.Post ? (
      this.state.postsLoading ? (
        <h5>
          <Spinner />
        </h5>
      ) : (
        <PostListings
          posts={this.state.posts}
          removeDuplicates
          enableDownvotes={site.enable_downvotes}
          enableNsfw={site.enable_nsfw}
        />
      )
    ) : this.state.commentsLoading ? (
      <h5>
        <Spinner />
      </h5>
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.comments)}
        noIndent
        showContext
        enableDownvotes={site.enable_downvotes}
      />
    );
  }

  communityInfo() {
    let community = this.state.communityRes.community_view.community;
    return (
      <div>
        <BannerIconHeader banner={community.banner} icon={community.icon} />
        <h5 class="mb-0">{community.title}</h5>
        <CommunityLink
          community={community}
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
          href={communityRSSUrl(
            this.state.communityRes.community_view.community.actor_id,
            this.state.sort
          )}
          title="RSS"
          rel="noopener"
        >
          <Icon icon="rss" classes="text-muted small" />
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

    let typeView = this.state.communityName
      ? `/c/${this.state.communityName}`
      : `/community/${this.state.communityId}`;

    this.props.history.push(
      `${typeView}/data_type/${dataTypeStr}/sort/${sortStr}/page/${page}`
    );
  }

  fetchData() {
    if (this.state.dataType == DataType.Post) {
      let form: GetPosts = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: ListingType.Community,
        community_id: this.state.communityId,
        community_name: this.state.communityName,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.getPosts(form));
    } else {
      let form: GetComments = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: ListingType.Community,
        community_id: this.state.communityId,
        community_name: this.state.communityName,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.getComments(form));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.context.router.history.push('/');
      return;
    } else if (msg.reconnect) {
      WebSocketService.Instance.send(
        wsClient.communityJoin({
          community_id: this.state.communityRes.community_view.community.id,
        })
      );
      this.fetchData();
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg).data;
      this.state.communityRes = data;
      this.state.communityLoading = false;
      this.setState(this.state);
      // TODO why is there no auth in this form?
      WebSocketService.Instance.send(
        wsClient.communityJoin({
          community_id: data.community_view.community.id,
        })
      );
    } else if (
      op == UserOperation.EditCommunity ||
      op == UserOperation.DeleteCommunity ||
      op == UserOperation.RemoveCommunity
    ) {
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      this.state.communityRes.community_view = data.community_view;
      this.setState(this.state);
    } else if (op == UserOperation.FollowCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      this.state.communityRes.community_view.subscribed =
        data.community_view.subscribed;
      this.state.communityRes.community_view.counts.subscribers =
        data.community_view.counts.subscribers;
      this.setState(this.state);
    } else if (op == UserOperation.GetPosts) {
      let data = wsJsonToRes<GetPostsResponse>(msg).data;
      this.state.posts = data.posts;
      this.state.postsLoading = false;
      this.setState(this.state);
      restoreScrollPosition(this.context);
      setupTippy();
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
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      this.state.posts.unshift(data.post_view);
      notifyPost(data.post_view, this.context.router);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(msg).data;
      this.state.communityRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(msg).data;

      // TODO this might be incorrect
      this.state.posts
        .filter(p => p.creator.id == data.user_view.user.id)
        .forEach(p => (p.creator_banned_from_community = data.banned));

      this.setState(this.state);
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg).data;
      this.state.comments = data.comments;
      this.state.commentsLoading = false;
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
        this.state.comments.unshift(data.comment_view);
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
    } else if (op == UserOperation.ListCategories) {
      let data = wsJsonToRes<ListCategoriesResponse>(msg).data;
      this.state.categories = data.categories;
      this.setState(this.state);
    }
  }
}
