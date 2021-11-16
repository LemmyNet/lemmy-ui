import autosize from "autosize";
import { Component, createRef, linkEvent, RefObject } from "inferno";
import {
  AddAdminResponse,
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  BanPersonResponse,
  BlockPersonResponse,
  CommentReportResponse,
  CommentResponse,
  CommunityResponse,
  GetCommunityResponse,
  GetPost,
  GetPostResponse,
  GetSiteResponse,
  ListingType,
  MarkCommentAsRead,
  PostReportResponse,
  PostResponse,
  PostView,
  Search,
  SearchResponse,
  SearchType,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import {
  CommentNode as CommentNodeI,
  CommentSortType,
  CommentViewType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  buildCommentsTree,
  commentsToFlatNodes,
  createCommentLikeRes,
  createPostLikeRes,
  debounce,
  editCommentRes,
  getCommentIdFromProps,
  getIdFromProps,
  insertCommentIntoTree,
  isBrowser,
  isImage,
  previewLines,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setOptionalAuth,
  setupTippy,
  toast,
  updatePersonBlock,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { CommentForm } from "../comment/comment-form";
import { CommentNodes } from "../comment/comment-nodes";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Sidebar } from "../community/sidebar";
import { PostListing } from "./post-listing";

const commentsShownInterval = 15;

interface PostState {
  postRes: GetPostResponse;
  postId: number;
  commentTree: CommentNodeI[];
  commentId?: number;
  commentSort: CommentSortType;
  commentViewType: CommentViewType;
  scrolled?: boolean;
  loading: boolean;
  crossPosts: PostView[];
  siteRes: GetSiteResponse;
  commentSectionRef?: RefObject<HTMLDivElement>;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
}

export class Post extends Component<any, PostState> {
  private subscription: Subscription;
  private isoData = setIsoData(this.context);
  private emptyState: PostState = {
    postRes: null,
    postId: getIdFromProps(this.props),
    commentTree: [],
    commentId: getCommentIdFromProps(this.props),
    commentSort: CommentSortType.Hot,
    commentViewType: CommentViewType.Tree,
    scrolled: false,
    loading: true,
    crossPosts: [],
    siteRes: this.isoData.site_res,
    commentSectionRef: null,
    showSidebarMobile: false,
    maxCommentsShown: commentsShownInterval,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.state.commentSectionRef = createRef();

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.postRes = this.isoData.routeData[0];
      this.state.commentTree = buildCommentsTree(
        this.state.postRes.comments,
        this.state.commentSort
      );
      this.state.loading = false;

      if (isBrowser()) {
        this.fetchCrossPosts();
        if (this.state.commentId) {
          this.scrollCommentIntoView();
        }

        if (this.checkScrollIntoCommentsParam) {
          this.scrollIntoCommentSection();
        }
      }
    } else {
      this.fetchPost();
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
        listing_type: ListingType.All,
        page: 1,
        limit: 6,
        auth: authField(false),
      };
      WebSocketService.Instance.send(wsClient.search(form));
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let id = Number(pathSplit[2]);

    let postForm: GetPost = {
      id,
    };
    setOptionalAuth(postForm, req.auth);

    promises.push(req.client.getPost(postForm));

    return promises;
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    document.removeEventListener("scroll", this.trackCommentsBoxScrolling);
    window.isoData.path = undefined;
    saveScrollPosition(this.context);
  }

  componentDidMount() {
    WebSocketService.Instance.send(
      wsClient.postJoin({ post_id: this.state.postId })
    );
    autosize(document.querySelectorAll("textarea"));

    document.addEventListener(
      "scroll",
      debounce(this.trackCommentsBoxScrolling, 100)
    );
  }

  componentDidUpdate(_lastProps: any, lastState: PostState) {
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
    elmnt.classList.add("mark");
    this.state.scrolled = true;
    this.markScrolledAsRead(this.state.commentId);
  }

  get checkScrollIntoCommentsParam() {
    return Boolean(
      new URLSearchParams(this.props.location.search).get("scrollToComments")
    );
  }

  scrollIntoCommentSection() {
    this.state.commentSectionRef.current?.scrollIntoView();
  }

  // TODO this needs some re-work
  markScrolledAsRead(commentId: number) {
    let found = this.state.postRes.comments.find(
      c => c.comment.id == commentId
    );
    let parent = this.state.postRes.comments.find(
      c => found.comment.parent_id == c.comment.id
    );
    let parent_person_id = parent
      ? parent.creator.id
      : this.state.postRes.post_view.creator.id;

    if (
      UserService.Instance.myUserInfo &&
      UserService.Instance.myUserInfo.local_user_view.person.id ==
        parent_person_id
    ) {
      let form: MarkCommentAsRead = {
        comment_id: found.comment.id,
        read: true,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.markCommentAsRead(form));
      UserService.Instance.unreadInboxCountSub.next(
        UserService.Instance.unreadInboxCountSub.value - 1
      );
    }
  }

  isBottom(el: Element) {
    return el.getBoundingClientRect().bottom <= window.innerHeight;
  }

  /**
   * Shows new comments when scrolling to the bottom of the comments div
   */
  trackCommentsBoxScrolling = () => {
    const wrappedElement = document.getElementsByClassName("comments")[0];
    if (this.isBottom(wrappedElement)) {
      this.state.maxCommentsShown += commentsShownInterval;
      this.setState(this.state);
    }
  };

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
            <Spinner large />
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
              <div ref={this.state.commentSectionRef} className="mb-2" />
              <CommentForm
                postId={this.state.postId}
                disabled={pv.post.locked}
              />
              <div class="d-block d-md-none">
                <button
                  class="btn btn-secondary d-inline-block mb-2 mr-3"
                  onClick={linkEvent(this, this.handleShowSidebarMobile)}
                >
                  {i18n.t("sidebar")}{" "}
                  <Icon
                    icon={
                      this.state.showSidebarMobile
                        ? `minus-square`
                        : `plus-square`
                    }
                    classes="icon-inline"
                  />
                </button>
                {this.state.showSidebarMobile && this.sidebar()}
              </div>
              {this.state.postRes.comments.length > 0 && this.sortRadios()}
              {this.state.commentViewType == CommentViewType.Tree &&
                this.commentsTree()}
              {this.state.commentViewType == CommentViewType.Chat &&
                this.commentsFlat()}
            </div>
            <div class="d-none d-md-block col-md-4">{this.sidebar()}</div>
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
              this.state.commentSort === CommentSortType.Hot && "active"
            }`}
          >
            {i18n.t("hot")}
            <input
              type="radio"
              value={CommentSortType.Hot}
              checked={this.state.commentSort === CommentSortType.Hot}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.Top && "active"
            }`}
          >
            {i18n.t("top")}
            <input
              type="radio"
              value={CommentSortType.Top}
              checked={this.state.commentSort === CommentSortType.Top}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.New && "active"
            }`}
          >
            {i18n.t("new")}
            <input
              type="radio"
              value={CommentSortType.New}
              checked={this.state.commentSort === CommentSortType.New}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === CommentSortType.Old && "active"
            }`}
          >
            {i18n.t("old")}
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
              this.state.commentViewType === CommentViewType.Chat && "active"
            }`}
          >
            {i18n.t("chat")}
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
    // These are already sorted by new
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.state.postRes.comments)}
          maxCommentsShown={this.state.maxCommentsShown}
          noIndent
          locked={this.state.postRes.post_view.post.locked}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          postCreatorId={this.state.postRes.post_view.creator.id}
          showContext
          enableDownvotes={this.state.siteRes.site_view.site.enable_downvotes}
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
        />
      </div>
    );
  }

  handleCommentSortChange(i: Post, event: any) {
    i.state.commentSort = Number(event.target.value);
    i.state.commentViewType = CommentViewType.Tree;
    i.state.commentTree = buildCommentsTree(
      i.state.postRes.comments,
      i.state.commentSort
    );
    i.setState(i.state);
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    i.state.commentViewType = Number(event.target.value);
    i.state.commentSort = CommentSortType.New;
    i.state.commentTree = buildCommentsTree(
      i.state.postRes.comments,
      i.state.commentSort
    );
    i.setState(i.state);
  }

  handleShowSidebarMobile(i: Post) {
    i.state.showSidebarMobile = !i.state.showSidebarMobile;
    i.setState(i.state);
  }

  commentsTree() {
    return (
      <div>
        <CommentNodes
          nodes={this.state.commentTree}
          maxCommentsShown={this.state.maxCommentsShown}
          locked={this.state.postRes.post_view.post.locked}
          moderators={this.state.postRes.moderators}
          admins={this.state.siteRes.admins}
          postCreatorId={this.state.postRes.post_view.creator.id}
          enableDownvotes={this.state.siteRes.site_view.site.enable_downvotes}
        />
      </div>
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
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
      this.state.commentTree = buildCommentsTree(
        this.state.postRes.comments,
        this.state.commentSort
      );
      this.state.loading = false;

      // Get cross-posts
      this.fetchCrossPosts();
      this.setState(this.state);
      setupTippy();
      if (!this.state.commentId) restoreScrollPosition(this.context);

      if (this.checkScrollIntoCommentsParam) {
        this.scrollIntoCommentSection();
      }
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      // Necessary since it might be a user reply, which has the recipients, to avoid double
      if (data.recipient_ids.length == 0) {
        this.state.postRes.comments.unshift(data.comment_view);
        insertCommentIntoTree(this.state.commentTree, data.comment_view);
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
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator_banned_from_community = data.banned));
      if (
        this.state.postRes.post_view.creator.id == data.person_view.person.id
      ) {
        this.state.postRes.post_view.creator_banned_from_community =
          data.banned;
      }
      this.setState(this.state);
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(msg).data;
      this.state.postRes.moderators = data.moderators;
      this.setState(this.state);
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg).data;
      this.state.postRes.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      if (
        this.state.postRes.post_view.creator.id == data.person_view.person.id
      ) {
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
