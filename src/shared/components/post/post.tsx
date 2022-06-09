import { None, Option, Right, Some } from "@sniptt/monads";
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
  auth,
  buildCommentsTree,
  commentsToFlatNodes,
  createCommentLikeRes,
  createPostLikeRes,
  debounce,
  editCommentRes,
  enableDownvotes,
  enableNsfw,
  getCommentIdFromProps,
  getIdFromProps,
  insertCommentIntoTree,
  isBrowser,
  isImage,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setOptionalAuth,
  setupTippy,
  toast,
  toOption,
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
  postRes: Option<GetPostResponse>;
  postId: number;
  commentTree: CommentNodeI[];
  commentId?: number;
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
  private isoData = setIsoData(this.context);
  private commentScrollDebounced: () => void;
  private emptyState: PostState = {
    postRes: None,
    postId: getIdFromProps(this.props),
    commentTree: [],
    commentId: getCommentIdFromProps(this.props),
    commentSort: CommentSortType.Hot,
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
      this.state.postRes = Some(this.isoData.routeData[0]);
      this.state.commentTree = buildCommentsTree(
        this.state.postRes.unwrap().comments,
        this.state.commentSort
      );
      this.state.loading = false;

      if (isBrowser()) {
        WebSocketService.Instance.send(
          wsClient.communityJoin({
            community_id:
              this.state.postRes.unwrap().community_view.community.id,
          })
        );
        WebSocketService.Instance.send(
          wsClient.postJoin({ post_id: this.state.postId })
        );

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
      auth: auth(false),
    };
    WebSocketService.Instance.send(wsClient.getPost(form));
  }

  fetchCrossPosts() {
    this.state.postRes
      .andThen(r => toOption(r.post_view.post.url))
      .match({
        some: url => {
          let form: Search = {
            q: url,
            type_: SearchType.Url,
            sort: SortType.TopAll,
            listing_type: ListingType.All,
            page: 1,
            limit: 6,
            auth: auth(false),
          };
          WebSocketService.Instance.send(wsClient.search(form));
        },
        none: void 0,
      });
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
    document.removeEventListener("scroll", this.commentScrollDebounced);

    window.isoData.path = undefined;
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

  scrollCommentIntoView() {
    let commentElement = document.getElementById(
      `comment-${this.state.commentId}`
    );
    if (commentElement) {
      commentElement.scrollIntoView();
      commentElement.classList.add("mark");
      this.state.scrolled = true;
      this.markScrolledAsRead(this.state.commentId);
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

  // TODO this needs some re-work
  markScrolledAsRead(commentId: number) {
    this.state.postRes.match({
      some: res => {
        let found = res.comments.find(c => c.comment.id == commentId);
        let parent = res.comments.find(
          c => found.comment.parent_id == c.comment.id
        );
        let parent_person_id = parent
          ? parent.creator.id
          : res.post_view.creator.id;

        UserService.Instance.myUserInfo.match({
          some: mui => {
            if (mui.local_user_view.person.id == parent_person_id) {
              let form: MarkCommentAsRead = {
                comment_id: found.comment.id,
                read: true,
                auth: auth(),
              };
              WebSocketService.Instance.send(wsClient.markCommentAsRead(form));
              UserService.Instance.unreadInboxCountSub.next(
                UserService.Instance.unreadInboxCountSub.value - 1
              );
            }
          },
          none: void 0,
        });
      },
      none: void 0,
    });
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
      this.state.maxCommentsShown += commentsShownInterval;
      this.setState(this.state);
    }
  };

  get documentTitle(): string {
    return this.state.postRes.match({
      some: res =>
        toOption(this.state.siteRes.site_view).match({
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
        toOption(res.post_view.post.thumbnail_url).or(
          toOption(res.post_view.post.url).match({
            some: url => (isImage(url) ? Some(url) : None),
            none: None,
          })
        ),
      none: None,
    });
  }

  get descriptionTag(): Option<string> {
    return this.state.postRes.andThen(r => toOption(r.post_view.post.body));
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          this.state.postRes.match({
            some: res => (
              <div class="row">
                <div class="col-12 col-md-8 mb-3">
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
                    node={Right(this.state.postId)}
                    disabled={res.post_view.post.locked}
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
                  {res.comments.length > 0 && this.sortRadios()}
                  {this.state.commentViewType == CommentViewType.Tree &&
                    this.commentsTree()}
                  {this.state.commentViewType == CommentViewType.Chat &&
                    this.commentsFlat()}
                </div>
                <div class="d-none d-md-block col-md-4">{this.sidebar()}</div>
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
    return this.state.postRes.match({
      some: res => (
        <div>
          <CommentNodes
            nodes={commentsToFlatNodes(res.comments)}
            maxCommentsShown={Some(this.state.maxCommentsShown)}
            noIndent
            locked={res.post_view.post.locked}
            moderators={Some(res.moderators)}
            admins={Some(this.state.siteRes.admins)}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            showContext
          />
        </div>
      ),
      none: <></>,
    });
  }

  sidebar() {
    return this.state.postRes.match({
      some: res => (
        <div class="mb-3">
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
    i.state.commentSort = Number(event.target.value);
    i.state.commentViewType = CommentViewType.Tree;
    i.state.commentTree = buildCommentsTree(
      i.state.postRes.map(r => r.comments).unwrapOr([]),
      i.state.commentSort
    );
    i.setState(i.state);
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    i.state.commentViewType = Number(event.target.value);
    i.state.commentSort = CommentSortType.New;
    i.state.commentTree = buildCommentsTree(
      i.state.postRes.map(r => r.comments).unwrapOr([]),
      i.state.commentSort
    );
    i.setState(i.state);
  }

  handleShowSidebarMobile(i: Post) {
    i.state.showSidebarMobile = !i.state.showSidebarMobile;
    i.setState(i.state);
  }

  commentsTree() {
    return this.state.postRes.match({
      some: res => (
        <div>
          <CommentNodes
            nodes={this.state.commentTree}
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
      let postId = Number(this.props.match.params.id);
      WebSocketService.Instance.send(wsClient.postJoin({ post_id: postId }));
      WebSocketService.Instance.send(
        wsClient.getPost({
          id: postId,
          auth: auth(false),
        })
      );
    } else if (op == UserOperation.GetPost) {
      let data = wsJsonToRes<GetPostResponse>(msg).data;
      this.state.postRes = Some(data);

      this.state.commentTree = buildCommentsTree(
        this.state.postRes.map(r => r.comments).unwrapOr([]),
        this.state.commentSort
      );
      this.state.loading = false;

      // join the rooms
      WebSocketService.Instance.send(
        wsClient.postJoin({ post_id: this.state.postId })
      );
      WebSocketService.Instance.send(
        wsClient.communityJoin({
          community_id: data.community_view.community.id,
        })
      );

      // Get cross-posts
      this.fetchCrossPosts();
      this.setState(this.state);
      setupTippy();
      if (!this.state.commentId) restoreScrollPosition(this.context);

      if (this.checkScrollIntoCommentsParam) {
        this.scrollIntoCommentSection();
      }

      if (this.state.commentId && !this.state.scrolled) {
        this.scrollCommentIntoView();
      }
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      // Don't get comments from the post room, if the creator is blocked
      let creatorBlocked = UserService.Instance.myUserInfo
        .map(m => m.person_blocks)
        .unwrapOr([])
        .map(pb => pb.target.id)
        .includes(data.comment_view.creator.id);

      // Necessary since it might be a user reply, which has the recipients, to avoid double
      if (data.recipient_ids.length == 0 && !creatorBlocked) {
        this.state.postRes.match({
          some: res => {
            res.comments.unshift(data.comment_view);
            insertCommentIntoTree(this.state.commentTree, data.comment_view);
            res.post_view.counts.comments++;
          },
          none: void 0,
        });
        this.setState(this.state);
        setupTippy();
      }
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(
        data.comment_view,
        this.state.postRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(
        data.comment_view,
        this.state.postRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(
        data.comment_view,
        this.state.postRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
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
      let data = wsJsonToRes<PostResponse>(msg).data;
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
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      this.state.postRes.match({
        some: res => {
          res.community_view = data.community_view;
          res.post_view.community = data.community_view.community;
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(msg).data;
      this.state.postRes.match({
        some: res => {
          res.comments
            .filter(c => c.creator.id == data.person_view.person.id)
            .forEach(c => (c.creator_banned_from_community = data.banned));
          if (res.post_view.creator.id == data.person_view.person.id) {
            res.post_view.creator_banned_from_community = data.banned;
          }
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(msg).data;
      this.state.postRes.match({
        some: res => {
          res.moderators = data.moderators;
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg).data;
      this.state.postRes.match({
        some: res => {
          res.comments
            .filter(c => c.creator.id == data.person_view.person.id)
            .forEach(c => (c.creator.banned = data.banned));
          if (res.post_view.creator.id == data.person_view.person.id) {
            res.post_view.creator.banned = data.banned;
          }
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg).data;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg).data;
      let xPosts = data.posts.filter(
        p => p.post.id != Number(this.props.match.params.id)
      );
      this.state.crossPosts = xPosts.length > 0 ? Some(xPosts) : None;
      this.setState(this.state);
    } else if (op == UserOperation.LeaveAdmin) {
      let data = wsJsonToRes<GetSiteResponse>(msg).data;
      this.state.siteRes = data;
      this.setState(this.state);
    } else if (op == UserOperation.TransferCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg).data;
      this.state.postRes.match({
        some: res => {
          res.community_view = data.community_view;
          res.post_view.community = data.community_view.community;
          res.moderators = data.moderators;
          this.setState(this.state);
        },
        none: void 0,
      });
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
