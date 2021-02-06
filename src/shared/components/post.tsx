import { Component, linkEvent } from 'inferno';
import { HtmlTags } from './html-tags';
import { Subscription } from 'rxjs';
import {
  UserOperation,
  PostView,
  GetPostResponse,
  PostResponse,
  MarkCommentAsRead,
  CommentResponse,
  CommunityResponse,
  BanFromCommunityResponse,
  BanUserResponse,
  AddModToCommunityResponse,
  AddAdminResponse,
  SearchType,
  SortType,
  Search,
  GetPost,
  SearchResponse,
  GetSiteResponse,
  GetCommunityResponse,
  ListCategoriesResponse,
  Category,
} from 'lemmy-js-client';
import {
  CommentSortType,
  CommentViewType,
  InitialFetchRequest,
  CommentNode as CommentNodeI,
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
  isBrowser,
  previewLines,
  isImage,
  wsUserOp,
  wsClient,
  authField,
  setOptionalAuth,
  saveScrollPosition,
  restoreScrollPosition,
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
  crossPosts: PostView[];
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
    siteRes: this.isoData.site_res,
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

      if (isBrowser()) {
        this.fetchCrossPosts();
        if (this.state.commentId) {
          this.scrollCommentIntoView();
        }
      }
    } else {
      this.fetchPost();
      WebSocketService.Instance.send(wsClient.listCategories());
    }
  }

  fetchPost() {
    let form: GetPost = {
      id: this.state.postId,
      auth: authField(false),
    };
    WebSocketService.Instance.send(wsClient.getPost(form));
  }

  fetchCrossPosts() {
    if (this.state.postRes.post_view.post.url) {
      let form: Search = {
        q: this.state.postRes.post_view.post.url,
        type_: SearchType.Url,
        sort: SortType.TopAll,
        page: 1,
        limit: 6,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.search(form));
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split('/');
    let promises: Promise<any>[] = [];

    let id = Number(pathSplit[2]);

    let postForm: GetPost = {
      id,
    };
    setOptionalAuth(postForm, req.auth);

    promises.push(req.client.getPost(postForm));
    promises.push(req.client.listCategories());

    return promises;
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    window.isoData.path = undefined;
    saveScrollPosition(this.context);
  }

  componentDidMount() {
    WebSocketService.Instance.send(
      wsClient.postJoin({ post_id: this.state.postId })
    );
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

  // TODO this needs some re-work
  markScrolledAsRead(commentId: number) {
    let found = this.state.postRes.comments.find(
      c => c.comment.id == commentId
    );
    let parent = this.state.postRes.comments.find(
      c => found.comment.parent_id == c.comment.id
    );
    let parent_user_id = parent
      ? parent.creator.id
      : this.state.postRes.post_view.creator.id;

    if (
      UserService.Instance.user &&
      UserService.Instance.user.id == parent_user_id
    ) {
      let form: MarkCommentAsRead = {
        comment_id: found.comment.id,
        read: true,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.markCommentAsRead(form));
      UserService.Instance.unreadCountSub.next(
        UserService.Instance.unreadCountSub.value - 1
      );
    }
  }

  get documentTitle(): string {
    return `${this.state.postRes.post_view.post.name} - ${this.state.siteRes.site_view.site.name}`;
  }

  get imageTag(): string {
    let post = this.state.postRes.post_view.post;
    return (
      post.thumbnail_url ||
      (post.url ? (isImage(post.url) ? post.url : undefined) : undefined)
    );
  }

  get descriptionTag(): string {
    let body = this.state.postRes.post_view.post.body;
    return body ? previewLines(body) : undefined;
  }

  render() {
    let pv = this.state.postRes?.post_view;
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
                post_view={pv}
                duplicates={this.state.crossPosts}
                showBody
                showCommunity
                moderators={this.state.postRes.moderators}
                admins={this.state.siteRes.admins}
                enableDownvotes={
                  this.state.siteRes.site_view.site.enable_downvotes
                }
                enableNsfw={this.state.siteRes.site_view.site.enable_nsfw}
              />
              <div className="mb-2" />
              <CommentForm
                postId={this.state.postId}
                disabled={pv.post.locked}
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
          locked={this.state.postRes.post_view.post.locked}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          postCreatorId={this.state.postRes.post_view.creator.id}
          showContext
          enableDownvotes={this.state.siteRes.site_view.site.enable_downvotes}
          sort={this.state.commentSort}
        />
      </div>
    );
  }

  sidebar() {
    return (
      <div class="mb-3">
        <Sidebar
          community_view={this.state.postRes.community_view}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          online={this.state.postRes.online}
          enableNsfw={this.state.siteRes.site_view.site.enable_nsfw}
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
    for (let comment_view of this.state.postRes.comments) {
      let node: CommentNodeI = {
        comment_view: comment_view,
        children: [],
      };
      map.set(comment_view.comment.id, { ...node });
    }
    let tree: CommentNodeI[] = [];
    for (let comment_view of this.state.postRes.comments) {
      let child = map.get(comment_view.comment.id);
      if (comment_view.comment.parent_id) {
        let parent_ = map.get(comment_view.comment.parent_id);
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
      child.depth = i;
      this.setDepth(child, i + 1);
    }
  }

  commentsTree() {
    let nodes = this.buildCommentsTree();
    return (
      <div>
        <CommentNodes
          nodes={nodes}
          locked={this.state.postRes.post_view.post.locked}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          postCreatorId={this.state.postRes.post_view.creator.id}
          sort={this.state.commentSort}
          enableDownvotes={this.state.siteRes.site_view.site.enable_downvotes}
        />
      </div>
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      return;
    } else if (msg.reconnect) {
      let postId = Number(this.props.match.params.id);
      WebSocketService.Instance.send(wsClient.postJoin({ post_id: postId }));
      WebSocketService.Instance.send(
        wsClient.getPost({
          id: postId,
          auth: authField(false),
        })
      );
    } else if (op == UserOperation.GetPost) {
      let data = wsJsonToRes<GetPostResponse>(msg).data;
      this.state.postRes = data;
      this.state.loading = false;

      // Get cross-posts
      this.fetchCrossPosts();
      this.setState(this.state);
      setupTippy();
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      // Necessary since it might be a user reply, which has the recipients, to avoid double
      if (data.recipient_ids.length == 0) {
        this.state.postRes.comments.unshift(data.comment_view);
        this.state.postRes.post_view.counts.comments++;
        this.setState(this.state);
        setupTippy();
      }
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(data.comment_view, this.state.postRes.comments);
      this.setState(this.state);
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(data.comment_view, this.state.postRes.comments);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(data.comment_view, this.state.postRes.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeRes(data.post_view, this.state.postRes.post_view);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.StickyPost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      this.state.postRes.post_view = data.post_view;
      this.setState(this.state);
      setupTippy();
    } else if (
      op == UserOperation.EditCommunity ||
      op == UserOperation.DeleteCommunity ||
      op == UserOperation.RemoveCommunity ||
      op == UserOperation.FollowCommunity
    ) {
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      this.state.postRes.community_view = data.community_view;
      this.state.postRes.post_view.community = data.community_view.community;
      this.setState(this.state);
      this.setState(this.state);
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(msg).data;
      this.state.postRes.comments
        .filter(c => c.creator.id == data.user_view.user.id)
        .forEach(c => (c.creator_banned_from_community = data.banned));
      if (this.state.postRes.post_view.creator.id == data.user_view.user.id) {
        this.state.postRes.post_view.creator_banned_from_community =
          data.banned;
      }
      this.setState(this.state);
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(msg).data;
      this.state.postRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (op == UserOperation.BanUser) {
      let data = wsJsonToRes<BanUserResponse>(msg).data;
      this.state.postRes.comments
        .filter(c => c.creator.id == data.user_view.user.id)
        .forEach(c => (c.creator.banned = data.banned));
      if (this.state.postRes.post_view.creator.id == data.user_view.user.id) {
        this.state.postRes.post_view.creator.banned = data.banned;
      }
      this.setState(this.state);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg).data;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg).data;
      this.state.crossPosts = data.posts.filter(
        p => p.post.id != Number(this.props.match.params.id)
      );
      this.setState(this.state);
    } else if (op == UserOperation.TransferSite) {
      let data = wsJsonToRes<GetSiteResponse>(msg).data;
      this.state.siteRes = data;
      this.setState(this.state);
    } else if (op == UserOperation.TransferCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg).data;
      this.state.postRes.community_view = data.community_view;
      this.state.postRes.post_view.community = data.community_view.community;
      this.state.postRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (op == UserOperation.ListCategories) {
      let data = wsJsonToRes<ListCategoriesResponse>(msg).data;
      this.state.categories = data.categories;
      this.setState(this.state);
    }
  }
}
