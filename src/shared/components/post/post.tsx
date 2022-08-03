import { None, Option, Right, Some } from "@sniptt/monads";
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
  auth,
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
  postId: Option<number>;
  commentId: Option<number>;
  postRes: Option<GetPostResponse>;
  commentsRes: Option<GetCommentsResponse>;
  commentTree: CommentNodeI[];
  commentSort: CommentSortType;
  commentViewType: CommentViewType;
  scrolled?: boolean;
  loading: boolean;
  crossPosts: Option<PostView[]>;
  siteRes: GetSiteResponse;
  commentSectionRef?: RefObject<HTMLDivElement>;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
}

export class Post extends Component<any, PostState> {
  private subscription: Subscription;
  private isoData = setIsoData(
    this.context,
    GetPostResponse,
    GetCommentsResponse
  );
  private commentScrollDebounced: () => void;
  private emptyState: PostState = {
    postRes: None,
    commentsRes: None,
    postId: getIdFromProps(this.props),
    commentId: getCommentIdFromProps(this.props),
    commentTree: [],
    commentSort: CommentSortType[CommentSortType.Hot],
    commentViewType: CommentViewType.Tree,
    scrolled: false,
    loading: true,
    crossPosts: None,
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
      this.state.postRes = Some(this.isoData.routeData[0] as GetPostResponse);
      this.state.commentsRes = Some(
        this.isoData.routeData[1] as GetCommentsResponse
      );
      this.state.loading = false;

      this.state.commentsRes.match({
        some: res =>
          this.setState({
            commentTree: buildCommentsTree(
              res.comments,
              this.state.commentId.isSome()
            ),
          }),
        none: void 0,
      });

      if (isBrowser()) {
        WebSocketService.Instance.send(
          wsClient.communityJoin({
            community_id:
              this.state.postRes.unwrap().community_view.community.id,
          })
        );

        this.state.postId.match({
          some: post_id =>
            WebSocketService.Instance.send(wsClient.postJoin({ post_id })),
          none: void 0,
        });

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
    this.setState({ commentsRes: None });
    let postForm = new GetPost({
      id: this.state.postId,
      comment_id: this.state.commentId,
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(wsClient.getPost(postForm));

    let commentsForm = new GetComments({
      post_id: this.state.postId,
      parent_id: this.state.commentId,
      max_depth: Some(commentTreeMaxDepth),
      page: None,
      limit: None,
      sort: Some(this.state.commentSort),
      type_: Some(ListingType.All),
      community_name: None,
      community_id: None,
      saved_only: Some(false),
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(wsClient.getComments(commentsForm));
  }

  fetchCrossPosts() {
    this.state.postRes
      .andThen(r => r.post_view.post.url)
      .match({
        some: url => {
          let form = new Search({
            q: url,
            type_: Some(SearchType.Url),
            sort: Some(SortType.TopAll),
            listing_type: Some(ListingType.All),
            page: Some(1),
            limit: Some(trendingFetchLimit),
            community_id: None,
            community_name: None,
            creator_id: None,
            auth: auth(false).ok(),
          });
          WebSocketService.Instance.send(wsClient.search(form));
        },
        none: void 0,
      });
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let pathType = pathSplit[1];
    let id = Number(pathSplit[2]);

    let postForm = new GetPost({
      id: None,
      comment_id: None,
      auth: req.auth,
    });

    let commentsForm = new GetComments({
      post_id: None,
      parent_id: None,
      max_depth: Some(commentTreeMaxDepth),
      page: None,
      limit: None,
      sort: Some(CommentSortType.Hot),
      type_: Some(ListingType.All),
      community_name: None,
      community_id: None,
      saved_only: Some(false),
      auth: req.auth,
    });

    // Set the correct id based on the path type
    if (pathType == "post") {
      postForm.id = Some(id);
      commentsForm.post_id = Some(id);
    } else {
      postForm.comment_id = Some(id);
      commentsForm.parent_id = Some(id);
    }

    promises.push(req.client.getPost(postForm));
    promises.push(req.client.getComments(commentsForm));

    return promises;
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
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
    this.state.commentSectionRef.current?.scrollIntoView();
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
    return this.state.postRes.match({
      some: res =>
        this.state.siteRes.site_view.match({
          some: siteView =>
            `${res.post_view.post.name} - ${siteView.site.name}`,
          none: "",
        }),
      none: "",
    });
  }

  get imageTag(): Option<string> {
    return this.state.postRes.match({
      some: res =>
        res.post_view.post.thumbnail_url.or(
          res.post_view.post.url.match({
            some: url => (isImage(url) ? Some(url) : None),
            none: None,
          })
        ),
      none: None,
    });
  }

  get descriptionTag(): Option<string> {
    return this.state.postRes.andThen(r => r.post_view.post.body);
  }

  render() {
    return (
      <div className="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          this.state.postRes.match({
            some: res => (
              <div className="row">
                <div className="col-12 col-md-8 mb-3">
                  <HtmlTags
                    title={this.documentTitle}
                    path={this.context.router.route.match.url}
                    image={this.imageTag}
                    description={this.descriptionTag}
                  />
                  <PostListing
                    post_view={res.post_view}
                    duplicates={this.state.crossPosts}
                    showBody
                    showCommunity
                    moderators={Some(res.moderators)}
                    admins={Some(this.state.siteRes.admins)}
                    enableDownvotes={enableDownvotes(this.state.siteRes)}
                    enableNsfw={enableNsfw(this.state.siteRes)}
                  />
                  <div ref={this.state.commentSectionRef} className="mb-2" />
                  <CommentForm
                    node={Right(res.post_view.post.id)}
                    disabled={res.post_view.post.locked}
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
                <div className="d-none d-md-block col-md-4">
                  {this.sidebar()}
                </div>
              </div>
            ),
            none: <></>,
          })
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
    return this.state.commentsRes.match({
      some: commentsRes =>
        this.state.postRes.match({
          some: postRes => (
            <div>
              <CommentNodes
                nodes={commentsToFlatNodes(commentsRes.comments)}
                viewType={this.state.commentViewType}
                maxCommentsShown={Some(this.state.maxCommentsShown)}
                noIndent
                locked={postRes.post_view.post.locked}
                moderators={Some(postRes.moderators)}
                admins={Some(this.state.siteRes.admins)}
                enableDownvotes={enableDownvotes(this.state.siteRes)}
                showContext
              />
            </div>
          ),
          none: <></>,
        }),
      none: <></>,
    });
  }

  sidebar() {
    return this.state.postRes.match({
      some: res => (
        <div className="mb-3">
          <Sidebar
            community_view={res.community_view}
            moderators={res.moderators}
            admins={this.state.siteRes.admins}
            online={res.online}
            enableNsfw={enableNsfw(this.state.siteRes)}
            showIcon
          />
        </div>
      ),
      none: <></>,
    });
  }

  handleCommentSortChange(i: Post, event: any) {
    i.setState({
      commentSort: CommentSortType[event.target.value],
    });
    i.fetchPost();
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    // TODO test this
    i.setState({ commentViewType: Number(event.target.value) });
  }

  handleShowSidebarMobile(i: Post) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleViewPost(i: Post) {
    i.state.postRes.match({
      some: res =>
        i.context.router.history.push(`/post/${res.post_view.post.id}`),
      none: void 0,
    });
  }

  handleViewContext(i: Post) {
    i.state.commentsRes.match({
      some: res =>
        i.context.router.history.push(
          `/comment/${getCommentParentId(res.comments[0].comment).unwrap()}`
        ),
      none: void 0,
    });
  }

  commentsTree() {
    let showContextButton =
      getDepthFromComment(this.state.commentTree[0].comment_view.comment) > 0;

    return this.state.postRes.match({
      some: res => (
        <div>
          {this.state.commentId.isSome() && (
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
            maxCommentsShown={Some(this.state.maxCommentsShown)}
            locked={res.post_view.post.locked}
            moderators={Some(res.moderators)}
            admins={Some(this.state.siteRes.admins)}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
          />
        </div>
      ),
      none: <></>,
    });
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      this.state.postRes.match({
        some: res => {
          let postId = res.post_view.post.id;
          WebSocketService.Instance.send(
            wsClient.postJoin({ post_id: postId })
          );
          WebSocketService.Instance.send(
            wsClient.getPost({
              id: Some(postId),
              comment_id: None,
              auth: auth(false).ok(),
            })
          );
        },
        none: void 0,
      });
    } else if (op == UserOperation.GetPost) {
      let data = wsJsonToRes<GetPostResponse>(msg, GetPostResponse);
      this.setState({ postRes: Some(data) });

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
      if (this.state.commentId.isNone()) restoreScrollPosition(this.context);

      if (this.checkScrollIntoCommentsParam) {
        this.scrollIntoCommentSection();
      }
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg, GetCommentsResponse);
      // You might need to append here, since this could be building more comments from a tree fetch
      this.state.commentsRes.match({
        some: res => {
          // Remove the first comment, since it is the parent
          let newComments = data.comments;
          newComments.shift();
          res.comments.push(...newComments);
          this.setState({ commentsRes: Some(res) });
        },
        none: () => this.setState({ commentsRes: Some(data) }),
      });
      this.setState({
        commentTree: buildCommentsTree(
          this.state.commentsRes.map(r => r.comments).unwrapOr([]),
          this.state.commentId.isSome()
        ),
        loading: false,
      });
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);

      // Don't get comments from the post room, if the creator is blocked
      let creatorBlocked = UserService.Instance.myUserInfo
        .map(m => m.person_blocks)
        .unwrapOr([])
        .map(pb => pb.target.id)
        .includes(data.comment_view.creator.id);

      // Necessary since it might be a user reply, which has the recipients, to avoid double
      if (data.recipient_ids.length == 0 && !creatorBlocked) {
        this.state.postRes.match({
          some: postRes =>
            this.state.commentsRes.match({
              some: commentsRes => {
                commentsRes.comments.unshift(data.comment_view);
                insertCommentIntoTree(
                  this.state.commentTree,
                  data.comment_view,
                  this.state.commentId.isSome()
                );
                postRes.post_view.counts.comments++;
                this.setState({
                  commentsRes: this.state.commentsRes,
                  commentTree: this.state.commentTree,
                  postRes: this.state.postRes,
                });
              },
              none: void 0,
            }),
          none: void 0,
        });
        setupTippy();
      }
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      editCommentRes(
        data.comment_view,
        this.state.commentsRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      saveCommentRes(
        data.comment_view,
        this.state.commentsRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      createCommentLikeRes(
        data.comment_view,
        this.state.commentsRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      this.state.postRes.match({
        some: res => createPostLikeRes(data.post_view, res.post_view),
        none: void 0,
      });
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.StickyPost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      this.state.postRes.match({
        some: res => (res.post_view = data.post_view),
        none: void 0,
      });
      this.setState(this.state);
      setupTippy();
    } else if (
      op == UserOperation.EditCommunity ||
      op == UserOperation.DeleteCommunity ||
      op == UserOperation.RemoveCommunity ||
      op == UserOperation.FollowCommunity
    ) {
      let data = wsJsonToRes<CommunityResponse>(msg, CommunityResponse);
      this.state.postRes.match({
        some: res => {
          res.community_view = data.community_view;
          res.post_view.community = data.community_view.community;
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(
        msg,
        BanFromCommunityResponse
      );
      this.state.postRes.match({
        some: postRes =>
          this.state.commentsRes.match({
            some: commentsRes => {
              commentsRes.comments
                .filter(c => c.creator.id == data.person_view.person.id)
                .forEach(c => (c.creator_banned_from_community = data.banned));
              if (postRes.post_view.creator.id == data.person_view.person.id) {
                postRes.post_view.creator_banned_from_community = data.banned;
              }
              this.setState(this.state);
            },
            none: void 0,
          }),
        none: void 0,
      });
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(
        msg,
        AddModToCommunityResponse
      );
      this.state.postRes.match({
        some: res => {
          res.moderators = data.moderators;
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg, BanPersonResponse);
      this.state.postRes.match({
        some: postRes =>
          this.state.commentsRes.match({
            some: commentsRes => {
              commentsRes.comments
                .filter(c => c.creator.id == data.person_view.person.id)
                .forEach(c => (c.creator.banned = data.banned));
              if (postRes.post_view.creator.id == data.person_view.person.id) {
                postRes.post_view.creator.banned = data.banned;
              }
              this.setState(this.state);
            },
            none: void 0,
          }),
        none: void 0,
      });
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg, AddAdminResponse);
      this.setState({
        siteRes: { ...this.state.siteRes, admins: data.admins },
      });
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg, SearchResponse);
      let xPosts = data.posts.filter(
        p => p.post.id != Number(this.props.match.params.id)
      );
      this.setState({ crossPosts: xPosts.length > 0 ? Some(xPosts) : None });
    } else if (op == UserOperation.LeaveAdmin) {
      let data = wsJsonToRes<GetSiteResponse>(msg, GetSiteResponse);
      this.setState({ siteRes: data });
    } else if (op == UserOperation.TransferCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg, GetCommunityResponse);
      this.state.postRes.match({
        some: res => {
          res.community_view = data.community_view;
          res.post_view.community = data.community_view.community;
          res.moderators = data.moderators;
          this.setState({ postRes: this.state.postRes });
        },
        none: void 0,
      });
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg, BlockPersonResponse);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg, PostReportResponse);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg, CommentReportResponse);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (
      op == UserOperation.PurgePerson ||
      op == UserOperation.PurgePost ||
      op == UserOperation.PurgeComment ||
      op == UserOperation.PurgeCommunity
    ) {
      let data = wsJsonToRes<PurgeItemResponse>(msg, PurgeItemResponse);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    }
  }
}
