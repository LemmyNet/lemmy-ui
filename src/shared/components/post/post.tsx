import autosize from "autosize";
import { Component, createRef, linkEvent, RefObject } from "inferno";
import {
  AddAdminResponse,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  BanPersonResponse,
  BlockCommunity,
  BlockCommunityResponse,
  BlockPersonResponse,
  CommentId,
  CommentReportResponse,
  CommentResponse,
  CommentSortType,
  CommunityResponse,
  CreateComment,
  DeleteCommunity,
  EditComment,
  FollowCommunity,
  GetComments,
  GetCommentsResponse,
  GetCommunityResponse,
  GetPost,
  GetPostResponse,
  GetSiteResponse,
  LanguageId,
  PostId,
  PostReportResponse,
  PostResponse,
  PurgeCommunity,
  PurgeItemResponse,
  RemoveCommunity,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import {
  CommentNodeI,
  CommentViewType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService } from "../../services";
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
  getUnixTime,
  isBrowser,
  isImage,
  isInitialRoute,
  myAuth,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  toast,
  updateCommunityBlock,
  updatePersonBlock,
} from "../../utils";
import { CommentForm } from "../comment/comment-form";
import { CommentNodes } from "../comment/comment-nodes";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Sidebar } from "../community/sidebar";
import { PostListing } from "./post-listing";
import {
  apiWrapper,
  HttpService,
  RequestState,
} from "../../services/HttpService";

const commentsShownInterval = 15;

interface PostState {
  postId?: number;
  commentId?: number;
  postRes: RequestState<GetPostResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  followCommunityRes: RequestState<CommunityResponse>;
  deleteCommunityRes: RequestState<CommunityResponse>;
  removeCommunityRes: RequestState<CommunityResponse>;
  leaveModTeamRes: RequestState<AddModToCommunityResponse>;
  blockCommunityRes: RequestState<BlockCommunityResponse>;
  purgeCommunityRes: RequestState<PurgeItemResponse>;
  createCommentRes: RequestState<CommentResponse>;
  editCommentRes: RequestState<CommentResponse>;
  commentSort: CommentSortType;
  commentViewType: CommentViewType;
  scrolled?: boolean;
  siteRes: GetSiteResponse;
  commentSectionRef?: RefObject<HTMLDivElement>;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
}

export class Post extends Component<any, PostState> {
  private isoData = setIsoData(this.context);
  private commentScrollDebounced: () => void;
  state: PostState = {
    postRes: { state: "empty" },
    commentsRes: { state: "empty" },
    followCommunityRes: { state: "empty" },
    deleteCommunityRes: { state: "empty" },
    removeCommunityRes: { state: "empty" },
    leaveModTeamRes: { state: "empty" },
    blockCommunityRes: { state: "empty" },
    purgeCommunityRes: { state: "empty" },
    createCommentRes: { state: "empty" },
    editCommentRes: { state: "empty" },
    postId: getIdFromProps(this.props),
    commentId: getCommentIdFromProps(this.props),
    commentSort: "Hot",
    commentViewType: CommentViewType.Tree,
    scrolled: false,
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
    maxCommentsShown: commentsShownInterval,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleDeleteCommunityClick =
      this.handleDeleteCommunityClick.bind(this);
    this.handleLeaveModTeamClick = this.handleLeaveModTeamClick.bind(this);
    this.handleFollow = this.handleFollow.bind(this);
    this.handleModRemoveCommunity = this.handleModRemoveCommunity.bind(this);
    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);

    this.state = { ...this.state, commentSectionRef: createRef() };

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        postRes: apiWrapper(this.isoData.routeData[0] as GetPostResponse),
        commentsRes: apiWrapper(
          this.isoData.routeData[1] as GetCommentsResponse
        ),
      };

      if (isBrowser()) {
        if (this.checkScrollIntoCommentsParam) {
          this.scrollIntoCommentSection();
        }
      }
    }
  }

  async fetchPost() {
    this.setState({
      postRes: { state: "loading" },
      commentsRes: { state: "loading" },
    });

    const auth = myAuth(false);
    const postForm: GetPost = {
      id: this.state.postId,
      comment_id: this.state.commentId,
      auth,
    };

    this.setState({
      postRes: apiWrapper(await HttpService.client.getPost(postForm)),
    });

    const commentsForm: GetComments = {
      post_id: this.state.postId,
      parent_id: this.state.commentId,
      max_depth: commentTreeMaxDepth,
      sort: this.state.commentSort,
      type_: "All",
      saved_only: false,
      auth,
    };
    this.setState({
      commentsRes: apiWrapper(
        await HttpService.client.getComments(commentsForm)
      ),
    });

    // TODO this needs to be a separate appendComments handler
    // // This section sets the comments res
    // // You might need to append here, since this could be building more comments from a tree fetch
    // if (this.state.commentsRes.state == "success") {
    //   const newComments = commentsRes.data.comments;
    //   // Remove the first comment, since it is the parent
    //   newComments.shift();
    //   const newRes = this.state.commentsRes;
    //   newRes.data.comments.push(...newComments);
    //   this.setState({ commentsRes: newRes });
    // } else {
    //   this.setState({ commentsRes });
    // }

    // const cComments = this.state.commentsRes?.comments ?? [];
    // this.setState({
    //   commentTree: buildCommentsTree(cComments, !!this.state.commentId),
    // });

    setupTippy();

    if (!this.state.commentId) restoreScrollPosition(this.context);

    if (this.checkScrollIntoCommentsParam) {
      this.scrollIntoCommentSection();
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
    document.removeEventListener("scroll", this.commentScrollDebounced);

    saveScrollPosition(this.context);
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.fetchPost();
    }

    autosize(document.querySelectorAll("textarea"));

    this.commentScrollDebounced = debounce(this.trackCommentsBoxScrolling, 100);
    document.addEventListener("scroll", this.commentScrollDebounced);
  }

  componentDidUpdate(_lastProps: any) {
    // Necessary if you are on a post and you click another post (same route)
    if (_lastProps.location.pathname !== _lastProps.history.location.pathname) {
      // TODO Couldnt get a refresh working. This does for now.
      location.reload();

      // const currentId = this.props.match.params.id;
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
    const siteName = this.state.siteRes.site_view.site.name;
    return this.state.postRes.state == "success"
      ? `${this.state.postRes.data.post_view.post.name} - ${siteName}`
      : siteName;
  }

  get imageTag(): string | undefined {
    if (this.state.postRes.state == "success") {
      const post = this.state.postRes.data.post_view.post;
      const thumbnail = post.thumbnail_url;
      const url = post.url;
      return thumbnail || (url && isImage(url) ? url : undefined);
    } else return undefined;
  }

  renderPostRes() {
    switch (this.state.postRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success":
        const res = this.state.postRes.data;
        return (
          <div className="row">
            <div className="col-12 col-md-8 mb-3">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                image={this.imageTag}
                description={res.post_view.post.body}
              />
              <PostListing
                post_view={res.post_view}
                duplicates={res.cross_posts}
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
                onCreateComment={this.handleCreateComment}
                onEditComment={this.handleEditComment}
                loading={this.state.createCommentRes.state == "loading" || this.state.editCommentRes.state == "loading"}              />
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
        );
    }
  }

  render() {
    return <div className="container-lg">{this.renderPostRes()}</div>;
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

    if (commentsRes.state == "success" && postRes.state == "success") {
      return (
        <div>
          <CommentNodes
            nodes={commentsToFlatNodes(commentsRes.data.comments)}
            viewType={this.state.commentViewType}
            maxCommentsShown={this.state.maxCommentsShown}
            noIndent
            locked={postRes.data.post_view.post.locked}
            moderators={postRes.data.moderators}
            admins={this.state.siteRes.admins}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            showContext
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
          />
        </div>
      );
    }
  }

  sidebar() {
    const res = this.state.postRes;
    if (res.state == "success") {
      return (
        <div className="mb-3">
          <Sidebar
            community_view={res.data.community_view}
            moderators={res.data.moderators}
            admins={this.state.siteRes.admins}
            online={res.data.online}
            enableNsfw={enableNsfw(this.state.siteRes)}
            showIcon
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
            onDeleteCommunityClick={this.handleDeleteCommunityClick}
            onLeaveModTeamClick={this.handleLeaveModTeamClick}
            onFollowCommunityClick={this.handleFollow}
            onRemoveCommunityClick={this.handleModRemoveCommunity}
            onPurgeCommunityClick={this.handleCommunityPurge}
            onBlockCommunityClick={this.handleBlockCommunity}
            removeCommunityLoading={
              this.state.removeCommunityRes.state == "loading"
            }
            deleteCommunityLoading={
              this.state.deleteCommunityRes.state == "loading"
            }
            leaveModTeamLoading={this.state.leaveModTeamRes.state == "loading"}
            followCommunityLoading={
              this.state.followCommunityRes.state == "loading"
            }
            purgeCommunityLoading={
              this.state.purgeCommunityRes.state == "loading"
            }
            blockCommunityLoading={
              this.state.blockCommunityRes.state == "loading"
            }
          />
        </div>
      );
    }
  }

  async handleCommentSortChange(i: Post, event: any) {
    i.setState({
      commentSort: event.target.value as CommentSortType,
      commentViewType: CommentViewType.Tree,
      commentsRes: { state: "loading" },
      postRes: { state: "loading" },
    });
    await i.fetchPost();
  }

  handleCommentViewTypeChange(i: Post, event: any) {
      i.setState({
        commentViewType: Number(event.target.value),
        commentSort: "New",
      });
  }

  commentTree(): CommentNodeI[] {
    if (this.state.commentsRes.state == 'success') {
    return buildCommentsTree(this.state.commentsRes.data.comments, !!this.state.commentId)
      
    } else {
      return [];
          }

  }

  handleShowSidebarMobile(i: Post) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleViewPost(i: Post) {
    if (i.state.postRes.state == "success") {
      const id = i.state.postRes.data.post_view.post.id;
      i.context.router.history.push(`/post/${id}`);
    }
  }

  handleViewContext(i: Post) {
    if (i.state.commentsRes.state == "success") {
      const parentId = getCommentParentId(
        i.state.commentsRes.data.comments.at(0)?.comment
      );
      if (parentId) {
        i.context.router.history.push(`/comment/${parentId}`);
      }
    }
  }

  async handleDeleteCommunityClick() {
    const auth = myAuth();
    if (auth && this.state.postRes.state == "success") {
      const cv = this.state.postRes.data.community_view;
      const deleteForm: DeleteCommunity = {
        community_id: cv.community.id,
        deleted: !cv.community.deleted,
        auth,
      };

      this.setState({ deleteCommunityRes: { state: "loading" } });
      this.setState({
        deleteCommunityRes: apiWrapper(
          await HttpService.client.deleteCommunity(deleteForm)
        ),
      });

      this.updateCommunity(this.state.deleteCommunityRes);
    }
  }

  async handleLeaveModTeamClick() {
    const mui = UserService.Instance.myUserInfo;
    const auth = myAuth();
    if (auth && mui && this.state.postRes.state == "success") {
      const form: AddModToCommunity = {
        person_id: mui.local_user_view.person.id,
        community_id: this.state.postRes.data.community_view.community.id,
        added: false,
        auth,
      };

      this.setState({ leaveModTeamRes: { state: "loading" } });

      this.setState({
        leaveModTeamRes: apiWrapper(
          await HttpService.client.addModToCommunity(form)
        ),
      });

      // Update the moderators
      this.setState(s => {
        if (
          s.postRes.state == "success" &&
          s.leaveModTeamRes.state == "success"
        ) {
          s.postRes.data.moderators = s.leaveModTeamRes.data.moderators;
        }
        return s;
      });
    }
  }

  async handleFollow(follow: boolean) {
    const auth = myAuth();
    if (auth && this.state.postRes.state == "success") {
      const community_id = this.state.postRes.data.community_view.community.id;
      const form: FollowCommunity = {
        community_id,
        follow,
        auth,
      };
      this.setState({ followCommunityRes: { state: "loading" } });
      this.setState({
        followCommunityRes: apiWrapper(
          await HttpService.client.followCommunity(form)
        ),
      });
      this.updateCommunity(this.state.followCommunityRes);

      // Update myUserInfo
      if (this.state.followCommunityRes.state == "success") {
        const mui = UserService.Instance.myUserInfo;
        if (mui) {
          mui.follows = mui.follows.filter(i => i.community.id != community_id);
        }
      }
    }
  }

  async handleCommunityPurge(reason: string) {
    const auth = myAuth();
    if (auth && this.state.postRes.state == "success") {
      const form: PurgeCommunity = {
        community_id: this.state.postRes.data.community_view.community.id,
        reason,
        auth,
      };
      this.setState({ purgeCommunityRes: { state: "loading" } });
      this.setState({
        purgeCommunityRes: apiWrapper(
          await HttpService.client.purgeCommunity(form)
        ),
      });
      this.purgeItem(this.state.purgeCommunityRes);
    }
  }

  async handleBlockCommunity(block: boolean) {
    const auth = myAuth();
    if (auth && this.state.postRes.state == "success") {
      const form: BlockCommunity = {
        community_id: this.state.postRes.data.community_view.community.id,
        block,
        auth,
      };
      this.setState({ blockCommunityRes: { state: "loading" } });
      this.setState({
        blockCommunityRes: apiWrapper(
          await HttpService.client.blockCommunity(form)
        ),
      });

      this.setState(s => {
        if (
          s.postRes.state == "success" &&
          s.blockCommunityRes.state == "success"
        ) {
          s.postRes.data.community_view =
            s.blockCommunityRes.data.community_view;
        }
        return s;
      });
      if (this.state.blockCommunityRes.state == "success") {
        updateCommunityBlock(this.state.blockCommunityRes.data);
      }
    }
  }

  async handleModRemoveCommunity(reason?: string, expires?: string) {
    const auth = myAuth();
    if (auth && this.state.postRes.state == "success") {
      const community = this.state.postRes.data.community_view.community;
      const form: RemoveCommunity = {
        community_id: community.id,
        removed: !community.removed,
        reason,
        expires: getUnixTime(expires),
        auth,
      };

      this.setState({ removeCommunityRes: { state: "loading" } });
      this.setState({
        removeCommunityRes: apiWrapper(
          await HttpService.client.removeCommunity(form)
        ),
      });
      this.updateCommunity(this.state.removeCommunityRes);
    }
  }

  async handleCreateComment(
    content: string,
    formId: string,
    postId: PostId,
    parentId?: CommentId,
    languageId?: LanguageId
  ) {

    let auth = myAuth();
    if (auth) {
        let form: CreateComment = {
          content,
          form_id: formId,
          post_id: postId,
          language_id: languageId,
          parent_id: parentId,
          auth,
        };

      this.setState({ createCommentRes: { state: "loading" } });
      this.setState({
        createCommentRes: apiWrapper(
          await HttpService.client.createComment(form)
        ),
      });

        this.setState(s => {
      if (s.commentsRes.state == "success" && s.createCommentRes.state == "success") {
          s.commentsRes.data.comments.unshift(s.createCommentRes.data.comment_view)
          }
        return s;
        });
  }
    }

  async handleEditComment(
    content: string,
    formId: string,
    commentId: CommentId,
    languageId?: LanguageId,
  ) {

    let auth = myAuth();
    if (auth) {
        let form: EditComment = {
          content,
          form_id: formId,
          comment_id: commentId,
          language_id: languageId,
          auth,
        };

      this.setState({ editCommentRes: { state: "loading" } });
      this.setState({
        editCommentRes: apiWrapper(
          await HttpService.client.editComment(form)
        ),
      });

        this.setState(s => {
        if (s.commentsRes.state == "success" && s.editCommentRes.state == "success") {
        s.commentsRes.data.comments = editCommentRes(s.editCommentRes.data.comment_view, s.commentsRes.data.comments)
        }
        return s;
        });
  }
    }


  commentsTree() {
    const res = this.state.postRes;
    const firstComment = this.commentTree().at(0)?.comment_view.comment;
    const depth = getDepthFromComment(firstComment);
    const showContextButton = depth ? depth > 0 : false;

    return (
      res.state == "success" && (
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
            nodes={this.commentTree()}
            viewType={this.state.commentViewType}
            maxCommentsShown={this.state.maxCommentsShown}
            locked={res.data.post_view.post.locked}
            moderators={res.data.moderators}
            admins={this.state.siteRes.admins}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
          />
        </div>
      )
    );
  }

  updateCommunity(communityRes: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.postRes.state == "success" && communityRes.state == "success") {
        s.postRes.data.community_view = communityRes.data.community_view;
      }
      return s;
    });
  }

  purgeItem(purgeRes: RequestState<PurgeItemResponse>) {
    if (purgeRes.state == "success") {
      toast(i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  parseMessage(msg: any) {
    const op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
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
  }
}
