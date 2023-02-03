import autosize from "autosize";
import { Component, createRef, linkEvent, RefObject } from "inferno";
import {
  AddAdminResponse,
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  BanPersonResponse,
  BlockPersonResponse,
  CommentNode as CommentNodeI,
  CommentReportResponse,
  CommentResponse,
  CommentSortType,
  CommunityResponse,
  GetComments,
  GetCommentsResponse,
  GetCommunityResponse,
  GetPost,
  GetPostResponse,
  GetSiteResponse,
  ListingType,
  PostReportResponse,
  PostResponse,
  PostView,
  PurgeItemResponse,
  Search,
  SearchResponse,
  SearchType,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { CommentViewType, InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  buildCommentsTree,
  commentsToFlatNodes,
  commentTreeMaxDepth,
  createCommentLikeRes,
  createPostLikeRes,
  debounce,
  editCommentRes,
  enableDownvotes,
  enableNsfw,
  getCommentIdFromProps,
  getCommentParentId,
  getDepthFromComment,
  getIdFromProps,
  insertCommentIntoTree,
  isBrowser,
  isImage,
  myAuth,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  toast,
  trendingFetchLimit,
  updatePersonBlock,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { CommentForm } from "../comment/comment-form";
import { CommentNodes } from "../comment/comment-nodes";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Sidebar } from "../community/sidebar";
import { PostListing } from "./post-listing";

const commentsShownInterval = 15;

interface PostState {
  postId?: number;
  commentId?: number;
  postRes?: GetPostResponse;
  commentsRes?: GetCommentsResponse;
  commentTree: CommentNodeI[];
  commentSort: CommentSortType;
  commentViewType: CommentViewType;
  scrolled?: boolean;
  loading: boolean;
  crossPosts?: PostView[];
  siteRes: GetSiteResponse;
  commentSectionRef?: RefObject<HTMLDivElement>;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
}

export class Post extends Component<any, PostState> {
  private subscription?: Subscription;
  private isoData = setIsoData(this.context);
  private commentScrollDebounced: () => void;
  state: PostState = {
    postId: getIdFromProps(this.props),
    commentId: getCommentIdFromProps(this.props),
    commentTree: [],
    commentSort: CommentSortType[CommentSortType.Hot],
    commentViewType: CommentViewType.Tree,
    scrolled: false,
    loading: true,
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
    maxCommentsShown: commentsShownInterval,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    this.state = { ...this.state, commentSectionRef: createRef() };

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        postRes: this.isoData.routeData[0] as GetPostResponse,
        commentsRes: this.isoData.routeData[1] as GetCommentsResponse,
      };

      if (this.state.commentsRes) {
        this.state = {
          ...this.state,
          commentTree: buildCommentsTree(
            this.state.commentsRes.comments,
            !!this.state.commentId
          ),
        };
      }

      this.state = { ...this.state, loading: false };

      if (isBrowser()) {
        if (this.state.postRes) {
          WebSocketService.Instance.send(
            wsClient.communityJoin({
              community_id: this.state.postRes.community_view.community.id,
            })
          );
        }

        if (this.state.postId) {
          WebSocketService.Instance.send(
            wsClient.postJoin({ post_id: this.state.postId })
          );
        }

        this.fetchCrossPosts();

        if (this.checkScrollIntoCommentsParam) {
          this.scrollIntoCommentSection();
        }
      }
    } else {
      this.fetchPost();
    }
  }

  fetchPost() {
    let auth = myAuth(false);
    let postForm: GetPost = {
      id: this.state.postId,
      comment_id: this.state.commentId,
      auth,
    };
    WebSocketService.Instance.send(wsClient.getPost(postForm));

    let commentsForm: GetComments = {
      post_id: this.state.postId,
      parent_id: this.state.commentId,
      max_depth: commentTreeMaxDepth,
      sort: this.state.commentSort,
      type_: ListingType.All,
      saved_only: false,
      auth,
    };
    WebSocketService.Instance.send(wsClient.getComments(commentsForm));
  }

  fetchCrossPosts() {
    let q = this.state.postRes?.post_view.post.url;
    if (q) {
      let form: Search = {
        q,
        type_: SearchType.Url,
        sort: SortType.TopAll,
        listing_type: ListingType.All,
        page: 1,
        limit: trendingFetchLimit,
        auth: myAuth(false),
      };
      WebSocketService.Instance.send(wsClient.search(form));
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let pathType = pathSplit.at(1);
    let id = pathSplit.at(2) ? Number(pathSplit.at(2)) : undefined;
    let auth = req.auth;

    let postForm: GetPost = {
      auth,
    };

    let commentsForm: GetComments = {
      max_depth: commentTreeMaxDepth,
      sort: CommentSortType.Hot,
      type_: ListingType.All,
      saved_only: false,
      auth,
    };

    // Set the correct id based on the path type
    if (pathType == "post") {
      postForm.id = id;
      commentsForm.post_id = id;
    } else {
      postForm.comment_id = id;
      commentsForm.parent_id = id;
    }

    promises.push(req.client.getPost(postForm));
    promises.push(req.client.getComments(commentsForm));

    return promises;
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
    document.removeEventListener("scroll", this.commentScrollDebounced);

    saveScrollPosition(this.context);
  }

  componentDidMount() {
    autosize(document.querySelectorAll("textarea"));

    this.commentScrollDebounced = debounce(this.trackCommentsBoxScrolling, 100);
    document.addEventListener("scroll", this.commentScrollDebounced);
  }

  componentDidUpdate(_lastProps: any) {
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

  get checkScrollIntoCommentsParam() {
    return Boolean(
      new URLSearchParams(this.props.location.search).get("scrollToComments")
    );
  }

  scrollIntoCommentSection() {
    this.state.commentSectionRef?.current?.scrollIntoView();
  }

  isBottom(el: Element): boolean {
    return el?.getBoundingClientRect().bottom <= window.innerHeight;
  }

  /**
   * Shows new comments when scrolling to the bottom of the comments div
   */
  trackCommentsBoxScrolling = () => {
    const wrappedElement = document.getElementsByClassName("comments")[0];
    if (wrappedElement && this.isBottom(wrappedElement)) {
      this.setState({
        maxCommentsShown: this.state.maxCommentsShown + commentsShownInterval,
      });
    }
  };

  get documentTitle(): string {
    let name_ = this.state.postRes?.post_view.post.name;
    let siteName = this.state.siteRes.site_view.site.name;
    return name_ ? `${name_} - ${siteName}` : "";
  }

  get imageTag(): string | undefined {
    let post = this.state.postRes?.post_view.post;
    let thumbnail = post?.thumbnail_url;
    let url = post?.url;
    return thumbnail || (url && isImage(url) ? url : undefined);
  }

  render() {
    let res = this.state.postRes;
    let description = res?.post_view.post.body;
    return (
      <div className="container-lg">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          res && (
            <div className="row">
              <div className="col-12 col-md-8 mb-3">
                <HtmlTags
                  title={this.documentTitle}
                  path={this.context.router.route.match.url}
                  image={this.imageTag}
                  description={description}
                />
                <PostListing
                  post_view={res.post_view}
                  duplicates={this.state.crossPosts}
                  showBody
                  showCommunity
                  moderators={res.moderators}
                  admins={this.state.siteRes.admins}
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  enableNsfw={enableNsfw(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                />
                <div ref={this.state.commentSectionRef} className="mb-2" />
                <CommentForm
                  node={res.post_view.post.id}
                  disabled={res.post_view.post.locked}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                />
                <div className="d-block d-md-none">
                  <button
                    className="btn btn-secondary d-inline-block mb-2 mr-3"
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
                {this.sortRadios()}
                {this.state.commentViewType == CommentViewType.Tree &&
                  this.commentsTree()}
                {this.state.commentViewType == CommentViewType.Flat &&
                  this.commentsFlat()}
              </div>
              <div className="d-none d-md-block col-md-4">{this.sidebar()}</div>
            </div>
          )
        )}
      </div>
    );
  }

  sortRadios() {
    return (
      <>
        <div className="btn-group btn-group-toggle flex-wrap mr-3 mb-2">
          <label
            className={`btn btn-outline-secondary pointer ${
              CommentSortType[this.state.commentSort] === CommentSortType.Hot &&
              "active"
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
              CommentSortType[this.state.commentSort] === CommentSortType.Top &&
              "active"
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
              CommentSortType[this.state.commentSort] === CommentSortType.New &&
              "active"
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
              CommentSortType[this.state.commentSort] === CommentSortType.Old &&
              "active"
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
        <div className="btn-group btn-group-toggle flex-wrap mb-2">
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentViewType === CommentViewType.Flat && "active"
            }`}
          >
            {i18n.t("chat")}
            <input
              type="radio"
              value={CommentViewType.Flat}
              checked={this.state.commentViewType === CommentViewType.Flat}
              onChange={linkEvent(this, this.handleCommentViewTypeChange)}
            />
          </label>
        </div>
      </>
    );
  }

  commentsFlat() {
    // These are already sorted by new
    let commentsRes = this.state.commentsRes;
    let postRes = this.state.postRes;
    return (
      commentsRes &&
      postRes && (
        <div>
          <CommentNodes
            nodes={commentsToFlatNodes(commentsRes.comments)}
            viewType={this.state.commentViewType}
            maxCommentsShown={this.state.maxCommentsShown}
            noIndent
            locked={postRes.post_view.post.locked}
            moderators={postRes.moderators}
            admins={this.state.siteRes.admins}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            showContext
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
          />
        </div>
      )
    );
  }

  sidebar() {
    let res = this.state.postRes;
    return (
      res && (
        <div className="mb-3">
          <Sidebar
            community_view={res.community_view}
            moderators={res.moderators}
            admins={this.state.siteRes.admins}
            online={res.online}
            enableNsfw={enableNsfw(this.state.siteRes)}
            showIcon
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
          />
        </div>
      )
    );
  }

  handleCommentSortChange(i: Post, event: any) {
    i.setState({
      commentSort: CommentSortType[event.target.value],
      commentViewType: CommentViewType.Tree,
      commentsRes: undefined,
      postRes: undefined,
    });
    i.fetchPost();
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    let comments = i.state.commentsRes?.comments;
    if (comments) {
      i.setState({
        commentViewType: Number(event.target.value),
        commentSort: CommentSortType.New,
        commentTree: buildCommentsTree(comments, !!i.state.commentId),
      });
    }
  }

  handleShowSidebarMobile(i: Post) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleViewPost(i: Post) {
    let id = i.state.postRes?.post_view.post.id;
    if (id) {
      i.context.router.history.push(`/post/${id}`);
    }
  }

  handleViewContext(i: Post) {
    let parentId = getCommentParentId(
      i.state.commentsRes?.comments?.at(0)?.comment
    );
    if (parentId) {
      i.context.router.history.push(`/comment/${parentId}`);
    }
  }

  commentsTree() {
    let res = this.state.postRes;
    let firstComment = this.state.commentTree.at(0)?.comment_view.comment;
    let depth = getDepthFromComment(firstComment);
    let showContextButton = depth ? depth > 0 : false;

    return (
      res && (
        <div>
          {!!this.state.commentId && (
            <>
              <button
                className="pl-0 d-block btn btn-link text-muted"
                onClick={linkEvent(this, this.handleViewPost)}
              >
                {i18n.t("view_all_comments")} ➔
              </button>
              {showContextButton && (
                <button
                  className="pl-0 d-block btn btn-link text-muted"
                  onClick={linkEvent(this, this.handleViewContext)}
                >
                  {i18n.t("show_context")} ➔
                </button>
              )}
            </>
          )}
          <CommentNodes
            nodes={this.state.commentTree}
            viewType={this.state.commentViewType}
            maxCommentsShown={this.state.maxCommentsShown}
            locked={res.post_view.post.locked}
            moderators={res.moderators}
            admins={this.state.siteRes.admins}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
          />
        </div>
      )
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      let post_id = this.state.postRes?.post_view.post.id;
      if (post_id) {
        WebSocketService.Instance.send(wsClient.postJoin({ post_id }));
        WebSocketService.Instance.send(
          wsClient.getPost({
            id: post_id,
            auth: myAuth(false),
          })
        );
      }
    } else if (op == UserOperation.GetPost) {
      let data = wsJsonToRes<GetPostResponse>(msg);
      this.setState({ postRes: data });

      // join the rooms
      WebSocketService.Instance.send(
        wsClient.postJoin({ post_id: data.post_view.post.id })
      );
      WebSocketService.Instance.send(
        wsClient.communityJoin({
          community_id: data.community_view.community.id,
        })
      );

      // Get cross-posts
      // TODO move this into initial fetch and refetch
      this.fetchCrossPosts();
      setupTippy();
      if (!this.state.commentId) restoreScrollPosition(this.context);

      if (this.checkScrollIntoCommentsParam) {
        this.scrollIntoCommentSection();
      }
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg);
      // This section sets the comments res
      let comments = this.state.commentsRes?.comments;
      if (comments) {
        // You might need to append here, since this could be building more comments from a tree fetch
        // Remove the first comment, since it is the parent
        let newComments = data.comments;
        newComments.shift();
        comments.push(...newComments);
      } else {
        this.setState({ commentsRes: data });
      }

      let cComments = this.state.commentsRes?.comments ?? [];
      this.setState({
        commentTree: buildCommentsTree(cComments, !!this.state.commentId),
        loading: false,
      });
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg);

      // Don't get comments from the post room, if the creator is blocked
      let creatorBlocked = UserService.Instance.myUserInfo?.person_blocks
        .map(pb => pb.target.id)
        .includes(data.comment_view.creator.id);

      // Necessary since it might be a user reply, which has the recipients, to avoid double
      let postRes = this.state.postRes;
      let commentsRes = this.state.commentsRes;
      if (
        data.recipient_ids.length == 0 &&
        !creatorBlocked &&
        postRes &&
        commentsRes
      ) {
        commentsRes.comments.unshift(data.comment_view);
        insertCommentIntoTree(
          this.state.commentTree,
          data.comment_view,
          !!this.state.commentId
        );
        postRes.post_view.counts.comments++;

        this.setState(this.state);
        setupTippy();
      }
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg);
      editCommentRes(data.comment_view, this.state.commentsRes?.comments);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      saveCommentRes(data.comment_view, this.state.commentsRes?.comments);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(data.comment_view, this.state.commentsRes?.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg);
      createPostLikeRes(data.post_view, this.state.postRes?.post_view);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.FeaturePost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg);
      let res = this.state.postRes;
      if (res) {
        res.post_view = data.post_view;
        this.setState(this.state);
        setupTippy();
      }
    } else if (
      op == UserOperation.EditCommunity ||
      op == UserOperation.DeleteCommunity ||
      op == UserOperation.RemoveCommunity ||
      op == UserOperation.FollowCommunity
    ) {
      let data = wsJsonToRes<CommunityResponse>(msg);
      let res = this.state.postRes;
      if (res) {
        res.community_view = data.community_view;
        res.post_view.community = data.community_view.community;
        this.setState(this.state);
      }
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(msg);

      let res = this.state.postRes;
      if (res) {
        if (res.post_view.creator.id == data.person_view.person.id) {
          res.post_view.creator_banned_from_community = data.banned;
        }
      }

      this.state.commentsRes?.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator_banned_from_community = data.banned));
      this.setState(this.state);
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(msg);
      let res = this.state.postRes;
      if (res) {
        res.moderators = data.moderators;
        this.setState(this.state);
      }
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg);
      this.state.commentsRes?.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));

      let res = this.state.postRes;
      if (res) {
        if (res.post_view.creator.id == data.person_view.person.id) {
          res.post_view.creator.banned = data.banned;
        }
      }
      this.setState(this.state);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg);
      this.setState(s => ((s.siteRes.admins = data.admins), s));
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg);
      let xPosts = data.posts.filter(
        p => p.post.ap_id != this.state.postRes?.post_view.post.ap_id
      );
      this.setState({ crossPosts: xPosts.length > 0 ? xPosts : undefined });
    } else if (op == UserOperation.LeaveAdmin) {
      let data = wsJsonToRes<GetSiteResponse>(msg);
      this.setState({ siteRes: data });
    } else if (op == UserOperation.TransferCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg);
      let res = this.state.postRes;
      if (res) {
        res.community_view = data.community_view;
        res.post_view.community = data.community_view.community;
        res.moderators = data.moderators;
        this.setState(this.state);
      }
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
