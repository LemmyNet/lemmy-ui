import { Component, linkEvent } from 'inferno';
import { HtmlTags } from './html-tags';
import { Subscription } from 'rxjs';
import {
  UserOperation,
  Post as PostI,
  GetPostResponse,
  PostResponse,
  MarkCommentAsReadForm,
  CommentResponse,
  CommunityResponse,
  CommentNode as CommentNodeI,
  BanFromCommunityResponse,
  BanUserResponse,
  AddModToCommunityResponse,
  AddAdminResponse,
  SearchType,
  SortType,
  SearchForm,
  GetPostForm,
  SearchResponse,
  GetSiteResponse,
  GetCommunityResponse,
  WebSocketJsonResponse,
  ListCategoriesResponse,
  Category,
} from 'lemmy-js-client';
import {
  CommentSortType,
  CommentViewType,
  InitialFetchRequest,
} from '../interfaces';
import { WebSocketService, UserService } from '../services';
import {
  wsJsonToRes,
  toast,
  editCommentRes,
  saveCommentRes,
  createCommentLikeRes,
  createPostLikeRes,
  commentsToFlatNodes,
  setupTippy,
  setIsoData,
  getIdFromProps,
  getCommentIdFromProps,
  wsSubscribe,
  setAuth,
  isBrowser,
  previewLines,
  isImage,
} from '../utils';
import { PostListing } from './post-listing';
import { Sidebar } from './sidebar';
import { CommentForm } from './comment-form';
import { CommentNodes } from './comment-nodes';
import autosize from 'autosize';
import { i18n } from '../i18next';

interface PostState {
  postRes: GetPostResponse;
  postId: number;
  commentId?: number;
  commentSort: CommentSortType;
  commentViewType: CommentViewType;
  scrolled?: boolean;
  loading: boolean;
  crossPosts: PostI[];
  siteRes: GetSiteResponse;
  categories: Category[];
}

export class Post extends Component<any, PostState> {
  private subscription: Subscription;
  private isoData = setIsoData(this.context);
  private emptyState: PostState = {
    postRes: null,
    postId: getIdFromProps(this.props),
    commentId: getCommentIdFromProps(this.props),
    commentSort: CommentSortType.Hot,
    commentViewType: CommentViewType.Tree,
    scrolled: false,
    loading: true,
    crossPosts: [],
    siteRes: this.isoData.site,
    categories: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.postRes = this.isoData.routeData[0];
      this.state.categories = this.isoData.routeData[1].categories;
      this.state.loading = false;

      if (isBrowser() && this.state.commentId) {
        this.scrollCommentIntoView();
      }
    } else {
      this.fetchPost();
      WebSocketService.Instance.listCategories();
    }
  }

  fetchPost() {
    let form: GetPostForm = {
      id: this.state.postId,
    };
    WebSocketService.Instance.getPost(form);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split('/');
    let promises: Promise<any>[] = [];

    let id = Number(pathSplit[2]);

    let postForm: GetPostForm = {
      id,
    };
    setAuth(postForm, req.auth);

    promises.push(req.client.getPost(postForm));
    promises.push(req.client.listCategories());

    return promises;
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    window.isoData.path = undefined;
  }

  componentDidMount() {
    WebSocketService.Instance.postJoin({ post_id: this.state.postId });
    autosize(document.querySelectorAll('textarea'));
  }

  componentDidUpdate(_lastProps: any, lastState: PostState, _snapshot: any) {
    if (
      this.state.commentId &&
      !this.state.scrolled &&
      lastState.postRes &&
      lastState.postRes.comments.length > 0
    ) {
      this.scrollCommentIntoView();
    }

    // Necessary if you are on a post and you click another post (same route)
    if (_lastProps.location.pathname !== _lastProps.history.location.pathname) {
      // TODO Couldnt get a refresh working. This does for now.
      location.reload();

      // let currentId = this.props.match.params.id;
      // WebSocketService.Instance.getPost(currentId);
      // this.context.refresh();
      // this.context.router.history.push(_lastProps.location.pathname);
    }
  }

  scrollCommentIntoView() {
    var elmnt = document.getElementById(`comment-${this.state.commentId}`);
    elmnt.scrollIntoView();
    elmnt.classList.add('mark');
    this.state.scrolled = true;
    this.markScrolledAsRead(this.state.commentId);
  }

  markScrolledAsRead(commentId: number) {
    let found = this.state.postRes.comments.find(c => c.id == commentId);
    let parent = this.state.postRes.comments.find(c => found.parent_id == c.id);
    let parent_user_id = parent
      ? parent.creator_id
      : this.state.postRes.post.creator_id;

    if (
      UserService.Instance.user &&
      UserService.Instance.user.id == parent_user_id
    ) {
      let form: MarkCommentAsReadForm = {
        edit_id: found.id,
        read: true,
        auth: null,
      };
      WebSocketService.Instance.markCommentAsRead(form);
      UserService.Instance.unreadCountSub.next(
        UserService.Instance.unreadCountSub.value - 1
      );
    }
  }

  get documentTitle(): string {
    return `${this.state.postRes.post.name} - ${this.state.siteRes.site.name}`;
  }

  get imageTag(): string {
    return (
      this.state.postRes.post.thumbnail_url ||
      (this.state.postRes.post.url
        ? isImage(this.state.postRes.post.url)
          ? this.state.postRes.post.url
          : undefined
        : undefined)
    );
  }

  get descriptionTag(): string {
    return this.state.postRes.post.body
      ? previewLines(this.state.postRes.post.body)
      : undefined;
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
            <div class="col-12 col-md-8 mb-3">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                image={this.imageTag}
                description={this.descriptionTag}
              />
              <PostListing
                post={this.state.postRes.post}
                showBody
                showCommunity
                moderators={this.state.postRes.moderators}
                admins={this.state.siteRes.admins}
                enableDownvotes={this.state.siteRes.site.enable_downvotes}
                enableNsfw={this.state.siteRes.site.enable_nsfw}
              />
              <div className="mb-2" />
              <CommentForm
                postId={this.state.postId}
                disabled={this.state.postRes.post.locked}
              />
              {this.state.postRes.comments.length > 0 && this.sortRadios()}
              {this.state.commentViewType == CommentViewType.Tree &&
                this.commentsTree()}
              {this.state.commentViewType == CommentViewType.Chat &&
                this.commentsFlat()}
            </div>
            <div class="col-12 col-sm-12 col-md-4">{this.sidebar()}</div>
          </div>
        )}
      </div>
    );
  }

  sortRadios() {
    return (
      <>
        <div class="btn-group btn-group-toggle flex-wrap mr-3 mb-2">
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.Hot && 'active'
            }`}
          >
            {i18n.t('hot')}
            <input
              type="radio"
              value={CommentSortType.Hot}
              checked={this.state.commentSort === CommentSortType.Hot}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.Top && 'active'
            }`}
          >
            {i18n.t('top')}
            <input
              type="radio"
              value={CommentSortType.Top}
              checked={this.state.commentSort === CommentSortType.Top}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.New && 'active'
            }`}
          >
            {i18n.t('new')}
            <input
              type="radio"
              value={CommentSortType.New}
              checked={this.state.commentSort === CommentSortType.New}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.Old && 'active'
            }`}
          >
            {i18n.t('old')}
            <input
              type="radio"
              value={CommentSortType.Old}
              checked={this.state.commentSort === CommentSortType.Old}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
        </div>
        <div class="btn-group btn-group-toggle flex-wrap mb-2">
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentViewType === CommentViewType.Chat && 'active'
            }`}
          >
            {i18n.t('chat')}
            <input
              type="radio"
              value={CommentViewType.Chat}
              checked={this.state.commentViewType === CommentViewType.Chat}
              onChange={linkEvent(this, this.handleCommentViewTypeChange)}
            />
          </label>
        </div>
      </>
    );
  }

  commentsFlat() {
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.state.postRes.comments)}
          noIndent
          locked={this.state.postRes.post.locked}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          postCreatorId={this.state.postRes.post.creator_id}
          showContext
          enableDownvotes={this.state.siteRes.site.enable_downvotes}
          sort={this.state.commentSort}
        />
      </div>
    );
  }

  sidebar() {
    return (
      <div class="mb-3">
        <Sidebar
          community={this.state.postRes.community}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          online={this.state.postRes.online}
          enableNsfw={this.state.siteRes.site.enable_nsfw}
          showIcon
          categories={this.state.categories}
        />
      </div>
    );
  }

  handleCommentSortChange(i: Post, event: any) {
    i.state.commentSort = Number(event.target.value);
    i.state.commentViewType = CommentViewType.Tree;
    i.setState(i.state);
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    i.state.commentViewType = Number(event.target.value);
    i.state.commentSort = CommentSortType.New;
    i.setState(i.state);
  }

  buildCommentsTree(): CommentNodeI[] {
    let map = new Map<number, CommentNodeI>();
    for (let comment of this.state.postRes.comments) {
      let node: CommentNodeI = {
        comment: comment,
        children: [],
      };
      map.set(comment.id, { ...node });
    }
    let tree: CommentNodeI[] = [];
    for (let comment of this.state.postRes.comments) {
      let child = map.get(comment.id);
      if (comment.parent_id) {
        let parent_ = map.get(comment.parent_id);
        parent_.children.push(child);
      } else {
        tree.push(child);
      }

      this.setDepth(child);
    }

    return tree;
  }

  setDepth(node: CommentNodeI, i: number = 0): void {
    for (let child of node.children) {
      child.comment.depth = i;
      this.setDepth(child, i + 1);
    }
  }

  commentsTree() {
    let nodes = this.buildCommentsTree();
    return (
      <div>
        <CommentNodes
          nodes={nodes}
          locked={this.state.postRes.post.locked}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          postCreatorId={this.state.postRes.post.creator_id}
          sort={this.state.commentSort}
          enableDownvotes={this.state.siteRes.site.enable_downvotes}
        />
      </div>
    );
  }

  parseMessage(msg: WebSocketJsonResponse) {
    console.log(msg);
    let res = wsJsonToRes(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      return;
    } else if (msg.reconnect) {
      let postId = Number(this.props.match.params.id);
      WebSocketService.Instance.postJoin({ post_id: postId });
      WebSocketService.Instance.getPost({
        id: postId,
      });
    } else if (res.op == UserOperation.GetPost) {
      let data = res.data as GetPostResponse;
      this.state.postRes = data;
      this.state.loading = false;

      // Get cross-posts
      if (this.state.postRes.post.url) {
        let form: SearchForm = {
          q: this.state.postRes.post.url,
          type_: SearchType.Url,
          sort: SortType.TopAll,
          page: 1,
          limit: 6,
        };
        WebSocketService.Instance.search(form);
      }

      this.setState(this.state);
      setupTippy();
    } else if (res.op == UserOperation.CreateComment) {
      let data = res.data as CommentResponse;

      // Necessary since it might be a user reply
      if (data.recipient_ids.length == 0) {
        this.state.postRes.comments.unshift(data.comment);
        this.setState(this.state);
      }
    } else if (
      res.op == UserOperation.EditComment ||
      res.op == UserOperation.DeleteComment ||
      res.op == UserOperation.RemoveComment
    ) {
      let data = res.data as CommentResponse;
      editCommentRes(data, this.state.postRes.comments);
      this.setState(this.state);
    } else if (res.op == UserOperation.SaveComment) {
      let data = res.data as CommentResponse;
      saveCommentRes(data, this.state.postRes.comments);
      this.setState(this.state);
      setupTippy();
    } else if (res.op == UserOperation.CreateCommentLike) {
      let data = res.data as CommentResponse;
      createCommentLikeRes(data, this.state.postRes.comments);
      this.setState(this.state);
    } else if (res.op == UserOperation.CreatePostLike) {
      let data = res.data as PostResponse;
      createPostLikeRes(data, this.state.postRes.post);
      this.setState(this.state);
    } else if (
      res.op == UserOperation.EditPost ||
      res.op == UserOperation.DeletePost ||
      res.op == UserOperation.RemovePost ||
      res.op == UserOperation.LockPost ||
      res.op == UserOperation.StickyPost
    ) {
      let data = res.data as PostResponse;
      this.state.postRes.post = data.post;
      this.setState(this.state);
      setupTippy();
    } else if (res.op == UserOperation.SavePost) {
      let data = res.data as PostResponse;
      this.state.postRes.post = data.post;
      this.setState(this.state);
      setupTippy();
    } else if (
      res.op == UserOperation.EditCommunity ||
      res.op == UserOperation.DeleteCommunity ||
      res.op == UserOperation.RemoveCommunity
    ) {
      let data = res.data as CommunityResponse;
      this.state.postRes.community = data.community;
      this.state.postRes.post.community_id = data.community.id;
      this.state.postRes.post.community_name = data.community.name;
      this.setState(this.state);
    } else if (res.op == UserOperation.FollowCommunity) {
      let data = res.data as CommunityResponse;
      this.state.postRes.community.subscribed = data.community.subscribed;
      this.state.postRes.community.number_of_subscribers =
        data.community.number_of_subscribers;
      this.setState(this.state);
    } else if (res.op == UserOperation.BanFromCommunity) {
      let data = res.data as BanFromCommunityResponse;
      this.state.postRes.comments
        .filter(c => c.creator_id == data.user.id)
        .forEach(c => (c.banned_from_community = data.banned));
      if (this.state.postRes.post.creator_id == data.user.id) {
        this.state.postRes.post.banned_from_community = data.banned;
      }
      this.setState(this.state);
    } else if (res.op == UserOperation.AddModToCommunity) {
      let data = res.data as AddModToCommunityResponse;
      this.state.postRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (res.op == UserOperation.BanUser) {
      let data = res.data as BanUserResponse;
      this.state.postRes.comments
        .filter(c => c.creator_id == data.user.id)
        .forEach(c => (c.banned = data.banned));
      if (this.state.postRes.post.creator_id == data.user.id) {
        this.state.postRes.post.banned = data.banned;
      }
      this.setState(this.state);
    } else if (res.op == UserOperation.AddAdmin) {
      let data = res.data as AddAdminResponse;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (res.op == UserOperation.Search) {
      let data = res.data as SearchResponse;
      this.state.crossPosts = data.posts.filter(
        p => p.id != Number(this.props.match.params.id)
      );
      if (this.state.crossPosts.length) {
        this.state.postRes.post.duplicates = this.state.crossPosts;
      }
      this.setState(this.state);
    } else if (res.op == UserOperation.TransferSite) {
      let data = res.data as GetSiteResponse;
      this.state.siteRes = data;
      this.setState(this.state);
    } else if (res.op == UserOperation.TransferCommunity) {
      let data = res.data as GetCommunityResponse;
      this.state.postRes.community = data.community;
      this.state.postRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (res.op == UserOperation.ListCategories) {
      let data = res.data as ListCategoriesResponse;
      this.state.categories = data.categories;
      this.setState(this.state);
    }
  }
}
