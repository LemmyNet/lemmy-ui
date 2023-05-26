import autosize from "autosize";
import { Component, createRef, linkEvent, RefObject } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockCommunity,
  BlockPerson,
  CommentResponse,
  CommentSortType,
  CommunityResponse,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeleteCommunity,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditCommunity,
  FeaturePost,
  FollowCommunity,
  GetComments,
  GetCommentsResponse,
  GetCommunityResponse,
  GetPost,
  GetPostResponse,
  GetSiteResponse,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  PostResponse,
  PurgeComment,
  PurgeCommunity,
  PurgeItemResponse,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemoveCommunity,
  RemovePost,
  SaveComment,
  SavePost,
  TransferCommunity,
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
  debounce,
  editComments,
  enableDownvotes,
  enableNsfw,
  getCommentIdFromProps,
  getCommentParentId,
  getDepthFromComment,
  getIdFromProps,
  isBrowser,
  isImage,
  isInitialRoute,
  myAuth,
  restoreScrollPosition,
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
    this.handleFollow = this.handleFollow.bind(this);
    this.handleModRemoveCommunity = this.handleModRemoveCommunity.bind(this);
    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockCommunity = this.handleBlockCommunity.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleCommentVote = this.handleCommentVote.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleCommentReport = this.handleCommentReport.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleFetchChildren = this.handleFetchChildren.bind(this);
    this.handleCommentReplyRead = this.handleCommentReplyRead.bind(this);
    this.handlePersonMentionRead = this.handlePersonMentionRead.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePost = this.handleFeaturePost.bind(this);

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

    const auth = myAuth();

    this.setState({
      postRes: apiWrapper(
        await HttpService.client.getPost({
          id: this.state.postId,
          comment_id: this.state.commentId,
          auth,
        })
      ),
      commentsRes: apiWrapper(
        await HttpService.client.getComments({
          post_id: this.state.postId,
          parent_id: this.state.commentId,
          max_depth: commentTreeMaxDepth,
          sort: this.state.commentSort,
          type_: "All",
          saved_only: false,
          auth,
        })
      ),
    });

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
                onBlockPerson={this.handleBlockPerson}
                onPostVote={this.handlePostVote}
                onPostReport={this.handlePostReport}
                onLockPost={this.handleLockPost}
                onDeletePost={this.handleDeletePost}
                onRemovePost={this.handleRemovePost}
                onSavePost={this.handleSavePost}
                onPurgePerson={this.handlePurgePerson}
                onPurgePost={this.handlePurgePost}
                onBanPerson={this.handleBanPerson}
                onBanPersonFromCommunity={this.handleBanFromCommunity}
                onAddModToCommunity={this.handleAddModToCommunity}
                onAddAdmin={this.handleAddAdmin}
                onTransferCommunity={this.handleTransferCommunity}
                onFeaturePost={this.handleFeaturePost}
              />
              <div ref={this.state.commentSectionRef} className="mb-2" />
              <CommentForm
                node={res.post_view.post.id}
                disabled={res.post_view.post.locked}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
                onCreateComment={this.handleCreateComment}
                onEditComment={this.handleEditComment}
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
            onSaveComment={this.handleSaveComment}
            onBlockPerson={this.handleBlockPerson}
            onDeleteComment={this.handleDeleteComment}
            onRemoveComment={this.handleRemoveComment}
            onCommentVote={this.handleCommentVote}
            onCommentReport={this.handleCommentReport}
            onDistinguishComment={this.handleDistinguishComment}
            onAddModToCommunity={this.handleAddModToCommunity}
            onAddAdmin={this.handleAddAdmin}
            onTransferCommunity={this.handleTransferCommunity}
            onFetchChildren={this.handleFetchChildren}
            onPurgeComment={this.handlePurgeComment}
            onPurgePerson={this.handlePurgePerson}
            onCommentReplyRead={this.handleCommentReplyRead}
            onPersonMentionRead={this.handlePersonMentionRead}
            onBanPersonFromCommunity={this.handleBanFromCommunity}
            onBanPerson={this.handleBanPerson}
            onCreateComment={this.handleCreateComment}
            onEditComment={this.handleEditComment}
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
            onDeleteCommunity={this.handleDeleteCommunityClick}
            onLeaveModTeam={this.handleAddModToCommunity}
            onFollowCommunity={this.handleFollow}
            onRemoveCommunity={this.handleModRemoveCommunity}
            onPurgeCommunity={this.handlePurgeCommunity}
            onBlockCommunity={this.handleBlockCommunity}
            onEditCommunity={this.handleEditCommunity}
          />
        </div>
      );
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
            onSaveComment={this.handleSaveComment}
            onBlockPerson={this.handleBlockPerson}
            onDeleteComment={this.handleDeleteComment}
            onRemoveComment={this.handleRemoveComment}
            onCommentVote={this.handleCommentVote}
            onCommentReport={this.handleCommentReport}
            onDistinguishComment={this.handleDistinguishComment}
            onAddModToCommunity={this.handleAddModToCommunity}
            onAddAdmin={this.handleAddAdmin}
            onTransferCommunity={this.handleTransferCommunity}
            onFetchChildren={this.handleFetchChildren}
            onPurgeComment={this.handlePurgeComment}
            onPurgePerson={this.handlePurgePerson}
            onCommentReplyRead={this.handleCommentReplyRead}
            onPersonMentionRead={this.handlePersonMentionRead}
            onBanPersonFromCommunity={this.handleBanFromCommunity}
            onBanPerson={this.handleBanPerson}
            onCreateComment={this.handleCreateComment}
            onEditComment={this.handleEditComment}
          />
        </div>
      )
    );
  }

  commentTree(): CommentNodeI[] {
    if (this.state.commentsRes.state == "success") {
      return buildCommentsTree(
        this.state.commentsRes.data.comments,
        !!this.state.commentId
      );
    } else {
      return [];
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

  async handleDeleteCommunityClick(form: DeleteCommunity) {
    const deleteCommunityRes = apiWrapper(
      await HttpService.client.deleteCommunity(form)
    );

    this.updateCommunity(deleteCommunityRes);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    const addModRes = apiWrapper(
      await HttpService.client.addModToCommunity(form)
    );

    this.updateModerators(addModRes);
  }

  async handleFollow(form: FollowCommunity) {
    const followCommunityRes = apiWrapper(
      await HttpService.client.followCommunity(form)
    );
    this.updateCommunity(followCommunityRes);

    // Update myUserInfo
    if (followCommunityRes.state == "success") {
      const communityId = followCommunityRes.data.community_view.community.id;
      const mui = UserService.Instance.myUserInfo;
      if (mui) {
        mui.follows = mui.follows.filter(i => i.community.id != communityId);
      }
    }
  }

  async handlePurgeCommunity(form: PurgeCommunity) {
    const purgeCommunityRes = apiWrapper(
      await HttpService.client.purgeCommunity(form)
    );
    this.purgeItem(purgeCommunityRes);
  }

  async handlePurgePerson(form: PurgePerson) {
    const purgePersonRes = apiWrapper(
      await HttpService.client.purgePerson(form)
    );
    this.purgeItem(purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    const purgeCommentRes = apiWrapper(
      await HttpService.client.purgeComment(form)
    );
    this.purgeItem(purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    const purgeRes = apiWrapper(await HttpService.client.purgePost(form));
    this.purgeItem(purgeRes);
  }

  async handleBlockCommunity(form: BlockCommunity) {
    const blockCommunityRes = apiWrapper(
      await HttpService.client.blockCommunity(form)
    );

    // TODO Probably isn't necessary
    this.setState(s => {
      if (
        s.postRes.state == "success" &&
        blockCommunityRes.state == "success"
      ) {
        s.postRes.data.community_view = blockCommunityRes.data.community_view;
      }
      return s;
    });

    if (blockCommunityRes.state == "success") {
      updateCommunityBlock(blockCommunityRes.data);
    }
  }

  async handleBlockPerson(form: BlockPerson) {
    const blockPersonRes = apiWrapper(
      await HttpService.client.blockPerson(form)
    );

    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleModRemoveCommunity(form: RemoveCommunity) {
    const removeCommunityRes = apiWrapper(
      await HttpService.client.removeCommunity(form)
    );
    this.updateCommunity(removeCommunityRes);
  }

  async handleEditCommunity(form: EditCommunity) {
    const res = apiWrapper(await HttpService.client.editCommunity(form));
    this.updateCommunity(res);
  }

  async handleCreateComment(form: CreateComment) {
    const createCommentRes = apiWrapper(
      await HttpService.client.createComment(form)
    );

    this.setState(s => {
      if (
        s.commentsRes.state == "success" &&
        createCommentRes.state == "success"
      ) {
        s.commentsRes.data.comments.unshift(createCommentRes.data.comment_view);
      }
      return s;
    });
  }

  async handleEditComment(form: EditComment) {
    const editCommentRes = apiWrapper(
      await HttpService.client.editComment(form)
    );

    this.findAndUpdateComment(editCommentRes);
  }

  async handleDeleteComment(form: DeleteComment) {
    const deleteCommentRes = apiWrapper(
      await HttpService.client.deleteComment(form)
    );

    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    const deleteRes = apiWrapper(await HttpService.client.deletePost(form));
    this.updatePost(deleteRes);
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = apiWrapper(await HttpService.client.removePost(form));
    this.updatePost(removeRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    const removeCommentRes = apiWrapper(
      await HttpService.client.removeComment(form)
    );

    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    const saveCommentRes = apiWrapper(
      await HttpService.client.saveComment(form)
    );
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    const saveRes = apiWrapper(await HttpService.client.savePost(form));
    this.updatePost(saveRes);
  }

  async handleFeaturePost(form: FeaturePost) {
    const featureRes = apiWrapper(await HttpService.client.featurePost(form));
    this.updatePost(featureRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = apiWrapper(await HttpService.client.likeComment(form));
    this.findAndUpdateComment(voteRes);
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = apiWrapper(await HttpService.client.likePost(form));
    this.updatePost(voteRes);
  }

  async handleCommentReport(form: CreateCommentReport) {
    const reportRes = apiWrapper(
      await HttpService.client.createCommentReport(form)
    );
    if (reportRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    const reportRes = apiWrapper(
      await HttpService.client.createPostReport(form)
    );
    if (reportRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    const lockRes = apiWrapper(await HttpService.client.lockPost(form));
    this.updatePost(lockRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    const distinguishRes = apiWrapper(
      await HttpService.client.distinguishComment(form)
    );
    this.findAndUpdateComment(distinguishRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = apiWrapper(await HttpService.client.addAdmin(form));

    if (addAdminRes.state == "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    const transferCommunityRes = apiWrapper(
      await HttpService.client.transferCommunity(form)
    );

    this.updateCommunityFull(transferCommunityRes);
  }

  async handleFetchChildren(form: GetComments) {
    const moreCommentsRes = apiWrapper(
      await HttpService.client.getComments(form)
    );

    if (
      this.state.commentsRes.state == "success" &&
      moreCommentsRes.state == "success"
    ) {
      const newComments = moreCommentsRes.data.comments;
      // Remove the first comment, since it is the parent
      newComments.shift();
      const newRes = this.state.commentsRes;
      newRes.data.comments.push(...newComments);
      this.setState({ commentsRes: newRes });
    }
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    const readRes = apiWrapper(
      await HttpService.client.markCommentReplyAsRead(form)
    );
    this.findAndUpdateComment(readRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    apiWrapper(await HttpService.client.markPersonMentionAsRead(form));
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = apiWrapper(await HttpService.client.banFromCommunity(form));
    this.updateBan(banRes);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = apiWrapper(await HttpService.client.banPerson(form));
    this.updateBan(banRes);
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (
          s.postRes.state == "success" &&
          s.postRes.data.post_view.creator.id ==
            banRes.data.person_view.person.id
        ) {
          s.postRes.data.post_view.creator_banned_from_community =
            banRes.data.banned;
        }
        if (s.commentsRes.state == "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (
          s.postRes.state == "success" &&
          s.postRes.data.post_view.creator.id ==
            banRes.data.person_view.person.id
        ) {
          s.postRes.data.post_view.creator.banned = banRes.data.banned;
        }
        if (s.commentsRes.state == "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        return s;
      });
    }
  }

  updateCommunity(communityRes: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.postRes.state == "success" && communityRes.state == "success") {
        s.postRes.data.community_view = communityRes.data.community_view;
      }
      return s;
    });
  }

  updateCommunityFull(res: RequestState<GetCommunityResponse>) {
    this.setState(s => {
      if (s.postRes.state == "success" && res.state == "success") {
        s.postRes.data.community_view = res.data.community_view;
        s.postRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }

  updatePost(post: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postRes.state == "success" && post.state == "success") {
        s.postRes.data.post_view = post.data.post_view;
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

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments = editComments(
          res.data.comment_view,
          s.commentsRes.data.comments
        );
      }
      return s;
    });
  }

  updateModerators(res: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    this.setState(s => {
      if (s.postRes.state == "success" && res.state == "success") {
        s.postRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }
}
