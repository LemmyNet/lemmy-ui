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
  CommentSortType,
  CommunityResponse,
  GetComments,
  GetCommentsResponse,
  GetCommunityResponse,
  GetPost,
  GetPostResponse,
  GetSiteResponse,
  PostReportResponse,
  PostResponse,
  PostView,
  PurgeItemResponse,
  Search,
  SearchResponse,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import {
  CommentNodeI,
  CommentViewType,
  InitialFetchRequest,
} from "../../interfaces";
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
    commentSort: "Hot",
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
    const auth = myAuth(false);
    const postForm: GetPost = {
      id: this.state.postId,
      comment_id: this.state.commentId,
      auth,
    };
    WebSocketService.Instance.send(wsClient.getPost(postForm));

    const commentsForm: GetComments = {
      post_id: this.state.postId,
      parent_id: this.state.commentId,
      max_depth: commentTreeMaxDepth,
      sort: this.state.commentSort,
      type_: "All",
      saved_only: false,
      auth,
    };
    WebSocketService.Instance.send(wsClient.getComments(commentsForm));
  }

  fetchCrossPosts() {
    const q = this.state.postRes?.post_view.post.url;
    if (q) {
      const form: Search = {
        q,
        type_: "Url",
        sort: "TopAll",
        listing_type: "All",
        page: 1,
        limit: trendingFetchLimit,
        auth: myAuth(false),
      };
      WebSocketService.Instance.send(wsClient.search(form));
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    const pathSplit = req.path.split("/");
    const promises: Promise<any>[] = [];

    const pathType = pathSplit.at(1);
    const id = pathSplit.at(2) ? Number(pathSplit.at(2)) : undefined;
    const auth = req.auth;

    const postForm: GetPost = {
      auth,
    };

    const commentsForm: GetComments = {
      max_depth: commentTreeMaxDepth,
      sort: "Hot",
      type_: "All",
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
    const name_ = this.state.postRes?.post_view.post.name;
    const siteName = this.state.siteRes.site_view.site.name;
    return name_ ? `${name_} - ${siteName}` : "";
  }

  get imageTag(): string | undefined {
    const post = this.state.postRes?.post_view.post;
    const thumbnail = post?.thumbnail_url;
    const url = post?.url;
    return thumbnail || (url && isImage(url) ? url : undefined);
  }

  render() {
    const res = this.state.postRes;
    const description = res?.post_view.post.body;
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
              this.state.commentSort === "Hot" && "active"
            }`}
          >
            {i18n.t("hot")}
            <input
              type="radio"
              value={"Hot"}
              checked={this.state.commentSort === "Hot"}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === "Top" && "active"
            }`}
          >
            {i18n.t("top")}
            <input
              type="radio"
              value={"Top"}
              checked={this.state.commentSort === "Top"}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === "New" && "active"
            }`}
          >
            {i18n.t("new")}
            <input
              type="radio"
              value={"New"}
              checked={this.state.commentSort === "New"}
              onChange={linkEvent(this, this.handleCommentSortChange)}
            />
          </label>
          <label
            className={`btn btn-outline-secondary pointer ${
              this.state.commentSort === "Old" && "active"
            }`}
          >
            {i18n.t("old")}
            <input
              type="radio"
              value={"Old"}
              checked={this.state.commentSort === "Old"}
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
    const commentsRes = this.state.commentsRes;
    const postRes = this.state.postRes;
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
    const res = this.state.postRes;
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
      commentSort: event.target.value as CommentSortType,
      commentViewType: CommentViewType.Tree,
      commentsRes: undefined,
      postRes: undefined,
    });
    i.fetchPost();
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    const comments = i.state.commentsRes?.comments;
    if (comments) {
      i.setState({
        commentViewType: Number(event.target.value),
        commentSort: "New",
        commentTree: buildCommentsTree(comments, !!i.state.commentId),
      });
    }
  }

  handleShowSidebarMobile(i: Post) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleViewPost(i: Post) {
    const id = i.state.postRes?.post_view.post.id;
    if (id) {
      i.context.router.history.push(`/post/${id}`);
    }
  }

  handleViewContext(i: Post) {
    const parentId = getCommentParentId(
      i.state.commentsRes?.comments?.at(0)?.comment
    );
    if (parentId) {
      i.context.router.history.push(`/comment/${parentId}`);
    }
  }

  commentsTree() {
    const res = this.state.postRes;
    const firstComment = this.state.commentTree.at(0)?.comment_view.comment;
    const depth = getDepthFromComment(firstComment);
    const showContextButton = depth ? depth > 0 : false;

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
    const op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      const post_id = this.state.postRes?.post_view.post.id;
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
      const data = wsJsonToRes<GetPostResponse>(msg);
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
      const data = wsJsonToRes<GetCommentsResponse>(msg);
      // This section sets the comments res
      const comments = this.state.commentsRes?.comments;
      if (comments) {
        // You might need to append here, since this could be building more comments from a tree fetch
        // Remove the first comment, since it is the parent
        const newComments = data.comments;
        newComments.shift();
        comments.push(...newComments);
      } else {
        this.setState({ commentsRes: data });
      }

      const cComments = this.state.commentsRes?.comments ?? [];
      this.setState({
        commentTree: buildCommentsTree(cComments, !!this.state.commentId),
        loading: false,
      });
    } else if (op == UserOperation.CreateComment) {
      const data = wsJsonToRes<CommentResponse>(msg);

      // Don't get comments from the post room, if the creator is blocked
      const creatorBlocked = UserService.Instance.myUserInfo?.person_blocks
        .map(pb => pb.target.id)
        .includes(data.comment_view.creator.id);

      // Necessary since it might be a user reply, which has the recipients, to avoid double
      const postRes = this.state.postRes;
      const commentsRes = this.state.commentsRes;
      if (
        data.recipient_ids.length == 0 &&
        !creatorBlocked &&
        postRes &&
        data.comment_view.post.id == postRes.post_view.post.id &&
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
      const data = wsJsonToRes<CommentResponse>(msg);
      editCommentRes(data.comment_view, this.state.commentsRes?.comments);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.SaveComment) {
      const data = wsJsonToRes<CommentResponse>(msg);
      saveCommentRes(data.comment_view, this.state.commentsRes?.comments);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      const data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(data.comment_view, this.state.commentsRes?.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      const data = wsJsonToRes<PostResponse>(msg);
      createPostLikeRes(data.post_view, this.state.postRes?.post_view);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.FeaturePost ||
      op == UserOperation.SavePost ||
      op == UserOperation.MarkPostAsRead
    ) {
      const data = wsJsonToRes<PostResponse>(msg);
      const res = this.state.postRes;
      if (res) {
        res.post_view = data.post_view;
        this.setState(prevState => {
          if (prevState.postRes) {
            prevState.postRes.post_view = data.post_view;
          }

          return prevState;
        });
        setupTippy();
      }
    } else if (
      op == UserOperation.EditCommunity ||
      op == UserOperation.DeleteCommunity ||
      op == UserOperation.RemoveCommunity ||
      op == UserOperation.FollowCommunity
    ) {
      const data = wsJsonToRes<CommunityResponse>(msg);
      const res = this.state.postRes;
      if (res) {
        res.community_view = data.community_view;
        res.post_view.community = data.community_view.community;
        this.setState(this.state);
      }
    } else if (op == UserOperation.BanFromCommunity) {
      const data = wsJsonToRes<BanFromCommunityResponse>(msg);

      const res = this.state.postRes;
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
      const data = wsJsonToRes<AddModToCommunityResponse>(msg);
      const res = this.state.postRes;
      if (res) {
        res.moderators = data.moderators;
        this.setState(this.state);
      }
    } else if (op == UserOperation.BanPerson) {
      const data = wsJsonToRes<BanPersonResponse>(msg);
      this.state.commentsRes?.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));

      const res = this.state.postRes;
      if (res) {
        if (res.post_view.creator.id == data.person_view.person.id) {
          res.post_view.creator.banned = data.banned;
        }
      }
      this.setState(this.state);
    } else if (op == UserOperation.AddAdmin) {
      const data = wsJsonToRes<AddAdminResponse>(msg);
      this.setState(s => ((s.siteRes.admins = data.admins), s));
    } else if (op == UserOperation.Search) {
      const data = wsJsonToRes<SearchResponse>(msg);
      const xPosts = data.posts.filter(
        p => p.post.ap_id != this.state.postRes?.post_view.post.ap_id
      );
      this.setState({ crossPosts: xPosts.length > 0 ? xPosts : undefined });
    } else if (op == UserOperation.LeaveAdmin) {
      const data = wsJsonToRes<GetSiteResponse>(msg);
      this.setState({ siteRes: data });
    } else if (op == UserOperation.TransferCommunity) {
      const data = wsJsonToRes<GetCommunityResponse>(msg);
      const res = this.state.postRes;
      if (res) {
        res.community_view = data.community_view;
        res.post_view.community = data.community_view.community;
        res.moderators = data.moderators;
        this.setState(this.state);
      }
    } else if (op == UserOperation.BlockPerson) {
      const data = wsJsonToRes<BlockPersonResponse>(msg);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      const data = wsJsonToRes<PostReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      const data = wsJsonToRes<CommentReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (
      op == UserOperation.PurgePerson ||
      op == UserOperation.PurgePost ||
      op == UserOperation.PurgeComment ||
      op == UserOperation.PurgeCommunity
    ) {
      const data = wsJsonToRes<PurgeItemResponse>(msg);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    }
  }
}
