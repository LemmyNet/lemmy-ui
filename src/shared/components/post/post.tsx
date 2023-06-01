import autosize from "autosize";
import { Component, createRef, linkEvent, RefObject } from "inferno";
import {
  AddAdmin,
  AddAdminResponse,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockCommunity,
  BlockCommunityResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentReplyResponse,
  CommentReportResponse,
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
  PersonMentionResponse,
  PostReportResponse,
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
  apiWrapper,
  apiWrapperIso,
  HttpService,
  RequestState,
} from "../../services/HttpService";
import {
  buildCommentsTree,
  commentsToFlatNodes,
  commentTreeMaxDepth,
  debounce,
  editComments,
  editCommentWithCommentReplies,
  enableDownvotes,
  enableNsfw,
  getCommentIdFromProps,
  getCommentParentId,
  getDepthFromComment,
  getIdFromProps,
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

  // Other responses, mainly used for loading indicators
  editCommunityRes: RequestState<CommunityResponse>;
  deleteCommunityRes: RequestState<CommunityResponse>;
  removeCommunityRes: RequestState<CommunityResponse>;
  addModRes: RequestState<AddModToCommunityResponse>;
  followRes: RequestState<CommunityResponse>;
  blockCommunityRes: RequestState<BlockCommunityResponse>;
  purgeCommunityRes: RequestState<PurgeItemResponse>;

  votePostRes: RequestState<PostResponse>;
  reportPostRes: RequestState<PostReportResponse>;
  blockPostRes: RequestState<PostResponse>;
  lockPostRes: RequestState<PostResponse>;
  deletePostRes: RequestState<PostResponse>;
  removePostRes: RequestState<PostResponse>;
  savePostRes: RequestState<PostResponse>;
  featurePostCommunityRes: RequestState<PostResponse>;
  featurePostLocalRes: RequestState<PostResponse>;
  banPersonRes: RequestState<BanPersonResponse>;
  banFromCommunityRes: RequestState<BanPersonResponse>;
  addAdminRes: RequestState<AddAdminResponse>;
  transferCommunityRes: RequestState<CommunityResponse>;
  purgePostRes: RequestState<PurgeItemResponse>;
  purgePersonRes: RequestState<PurgeItemResponse>;

  createCommentRes: RequestState<CommentResponse>;
  editCommentRes: RequestState<CommentResponse>;
  voteCommentRes: RequestState<CommentResponse>;
  saveCommentRes: RequestState<CommentResponse>;
  readCommentReplyRes: RequestState<CommentReplyResponse>;
  readPersonMentionRes: RequestState<PersonMentionResponse>;
  blockPersonRes: RequestState<BlockPersonResponse>;
  deleteCommentRes: RequestState<CommentResponse>;
  removeCommentRes: RequestState<CommentResponse>;
  distinguishCommentRes: RequestState<CommentResponse>;
  fetchChildrenRes: RequestState<GetCommentsResponse>;
  reportCommentRes: RequestState<CommentReportResponse>;
  purgeCommentRes: RequestState<PurgeItemResponse>;
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
    editCommunityRes: { state: "empty" },
    deleteCommunityRes: { state: "empty" },
    removeCommunityRes: { state: "empty" },
    addModRes: { state: "empty" },
    followRes: { state: "empty" },
    blockCommunityRes: { state: "empty" },
    purgeCommunityRes: { state: "empty" },
    votePostRes: { state: "empty" },
    reportPostRes: { state: "empty" },
    blockPostRes: { state: "empty" },
    lockPostRes: { state: "empty" },
    deletePostRes: { state: "empty" },
    removePostRes: { state: "empty" },
    savePostRes: { state: "empty" },
    featurePostCommunityRes: { state: "empty" },
    featurePostLocalRes: { state: "empty" },
    banPersonRes: { state: "empty" },
    banFromCommunityRes: { state: "empty" },
    addAdminRes: { state: "empty" },
    transferCommunityRes: { state: "empty" },
    purgePostRes: { state: "empty" },
    purgePersonRes: { state: "empty" },
    createCommentRes: { state: "empty" },
    editCommentRes: { state: "empty" },
    voteCommentRes: { state: "empty" },
    saveCommentRes: { state: "empty" },
    readCommentReplyRes: { state: "empty" },
    readPersonMentionRes: { state: "empty" },
    blockPersonRes: { state: "empty" },
    deleteCommentRes: { state: "empty" },
    removeCommentRes: { state: "empty" },
    distinguishCommentRes: { state: "empty" },
    fetchChildrenRes: { state: "empty" },
    reportCommentRes: { state: "empty" },
    purgeCommentRes: { state: "empty" },
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleDeleteCommunity = this.handleDeleteCommunity.bind(this);
    this.handleFollow = this.handleFollow.bind(this);
    this.handleRemoveCommunity = this.handleRemoveCommunity.bind(this);
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
    this.handleFeaturePostLocal = this.handleFeaturePostLocal.bind(this);
    this.handleFeaturePostCommunity =
      this.handleFeaturePostCommunity.bind(this);
    this.handlePurgeCommunity = this.handlePurgeCommunity.bind(this);
    this.handleEditCommunity = this.handleEditCommunity.bind(this);

    this.state = { ...this.state, commentSectionRef: createRef() };

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        postRes: apiWrapperIso(this.isoData.routeData[0] as GetPostResponse),
        commentsRes: apiWrapperIso(
          this.isoData.routeData[1] as GetCommentsResponse
        ),
      };
    }
  }

  async fetchPost() {
    this.setState({
      postRes: { state: "loading" },
      commentsRes: { state: "loading" },
    });

    const auth = myAuth();

    this.setState({
      postRes: await apiWrapper(
        HttpService.client.getPost({
          id: this.state.postId,
          comment_id: this.state.commentId,
          auth,
        })
      ),
      commentsRes: await apiWrapper(
        HttpService.client.getComments({
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
      if (this.checkScrollIntoCommentsParam) {
        this.scrollIntoCommentSection();
      }
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
      case "success": {
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
                crossPosts={res.cross_posts}
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
                onFeaturePostLocal={this.handleFeaturePostLocal}
                onFeaturePostCommunity={this.handleFeaturePostCommunity}
                upvoteLoading={this.state.votePostRes.state == "loading"}
                downvoteLoading={this.state.votePostRes.state == "loading"}
                reportLoading={this.state.reportPostRes.state == "loading"}
                blockLoading={this.state.blockPostRes.state == "loading"}
                lockLoading={this.state.lockPostRes.state == "loading"}
                deleteLoading={this.state.deletePostRes.state == "loading"}
                removeLoading={this.state.removePostRes.state == "loading"}
                saveLoading={this.state.savePostRes.state == "loading"}
                featureCommunityLoading={
                  this.state.featurePostCommunityRes.state == "loading"
                }
                featureLocalLoading={
                  this.state.featurePostLocalRes.state == "loading"
                }
                banLoading={this.state.banPersonRes.state == "loading"}
                addModLoading={this.state.addModRes.state == "loading"}
                addAdminLoading={this.state.addAdminRes.state == "loading"}
                transferLoading={
                  this.state.transferCommunityRes.state == "loading"
                }
                purgeLoading={
                  this.state.purgePersonRes.state == "loading" ||
                  this.state.purgePostRes.state == "loading"
                }
              />
              <div ref={this.state.commentSectionRef} className="mb-2" />
              <CommentForm
                node={res.post_view.post.id}
                disabled={res.post_view.post.locked}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
                onCreateComment={this.handleCreateComment}
                onEditComment={this.handleEditComment}
                loading={
                  this.state.createCommentRes.state == "loading" ||
                  this.state.editCommentRes.state == "loading"
                }
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
            createOrEditCommentLoading={
              this.state.createCommentRes.state == "loading" ||
              this.state.editCommentRes.state == "loading"
            }
            upvoteLoading={this.state.voteCommentRes.state == "loading"}
            downvoteLoading={this.state.voteCommentRes.state == "loading"}
            saveLoading={this.state.saveCommentRes.state == "loading"}
            readLoading={
              this.state.readCommentReplyRes.state == "loading" ||
              this.state.readPersonMentionRes.state == "loading"
            }
            blockPersonLoading={this.state.blockPersonRes.state == "loading"}
            deleteLoading={this.state.deleteCommentRes.state == "loading"}
            removeLoading={this.state.removeCommentRes.state == "loading"}
            distinguishLoading={
              this.state.distinguishCommentRes.state == "loading"
            }
            banLoading={this.state.banPersonRes.state == "loading"}
            addModLoading={this.state.addModRes.state == "loading"}
            addAdminLoading={this.state.addAdminRes.state == "loading"}
            transferCommunityLoading={
              this.state.transferCommunityRes.state == "loading"
            }
            fetchChildrenLoading={
              this.state.fetchChildrenRes.state == "loading"
            }
            reportLoading={this.state.reportCommentRes.state == "loading"}
            purgeLoading={this.state.purgeCommentRes.state == "loading"}
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
            onDeleteCommunity={this.handleDeleteCommunity}
            onLeaveModTeam={this.handleAddModToCommunity}
            onFollowCommunity={this.handleFollow}
            onRemoveCommunity={this.handleRemoveCommunity}
            onPurgeCommunity={this.handlePurgeCommunity}
            onBlockCommunity={this.handleBlockCommunity}
            onEditCommunity={this.handleEditCommunity}
            editCommunityLoading={
              this.state.editCommunityRes.state == "loading"
            }
            deleteCommunityLoading={
              this.state.deleteCommunityRes.state == "loading"
            }
            removeCommunityLoading={
              this.state.removeCommunityRes.state == "loading"
            }
            leaveModTeamLoading={this.state.addModRes.state == "loading"}
            followCommunityLoading={this.state.followRes.state == "loading"}
            blockCommunityLoading={
              this.state.blockCommunityRes.state == "loading"
            }
            purgeCommunityLoading={
              this.state.purgeCommunityRes.state == "loading"
            }
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
            createOrEditCommentLoading={
              this.state.createCommentRes.state == "loading" ||
              this.state.editCommentRes.state == "loading"
            }
            upvoteLoading={this.state.voteCommentRes.state == "loading"}
            downvoteLoading={this.state.voteCommentRes.state == "loading"}
            saveLoading={this.state.saveCommentRes.state == "loading"}
            readLoading={
              this.state.readCommentReplyRes.state == "loading" ||
              this.state.readPersonMentionRes.state == "loading"
            }
            blockPersonLoading={this.state.blockPersonRes.state == "loading"}
            deleteLoading={this.state.deleteCommentRes.state == "loading"}
            removeLoading={this.state.removeCommentRes.state == "loading"}
            distinguishLoading={
              this.state.distinguishCommentRes.state == "loading"
            }
            banLoading={this.state.banPersonRes.state == "loading"}
            addModLoading={this.state.addModRes.state == "loading"}
            addAdminLoading={this.state.addAdminRes.state == "loading"}
            transferCommunityLoading={
              this.state.transferCommunityRes.state == "loading"
            }
            fetchChildrenLoading={
              this.state.fetchChildrenRes.state == "loading"
            }
            reportLoading={this.state.reportCommentRes.state == "loading"}
            purgeLoading={this.state.purgeCommentRes.state == "loading"}
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

  async handleDeleteCommunity(form: DeleteCommunity) {
    this.setState({ deleteCommunityRes: { state: "loading" } });
    this.setState({
      deleteCommunityRes: await apiWrapper(
        HttpService.client.deleteCommunity(form)
      ),
    });

    this.updateCommunity(this.state.deleteCommunityRes);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    this.setState({ addModRes: { state: "loading" } });
    this.setState({
      addModRes: await apiWrapper(HttpService.client.addModToCommunity(form)),
    });
    this.updateModerators(this.state.addModRes);
  }

  async handleFollow(form: FollowCommunity) {
    this.setState({ followRes: { state: "loading" } });
    this.setState({
      followRes: await apiWrapper(HttpService.client.followCommunity(form)),
    });
    const res = this.state.followRes;
    this.updateCommunity(res);

    // Update myUserInfo
    if (res.state == "success") {
      const communityId = res.data.community_view.community.id;
      const mui = UserService.Instance.myUserInfo;
      if (mui) {
        mui.follows = mui.follows.filter(i => i.community.id != communityId);
      }
    }
  }

  async handlePurgeCommunity(form: PurgeCommunity) {
    this.setState({ purgeCommunityRes: { state: "loading" } });
    this.setState({
      purgeCommunityRes: await apiWrapper(
        HttpService.client.purgeCommunity(form)
      ),
    });
    this.purgeItem(this.state.purgeCommunityRes);
  }

  async handlePurgePerson(form: PurgePerson) {
    this.setState({ purgePersonRes: { state: "loading" } });
    this.setState({
      purgePersonRes: await apiWrapper(HttpService.client.purgePerson(form)),
    });
    this.purgeItem(this.state.purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    this.setState({ purgeCommentRes: { state: "loading" } });
    this.setState({
      purgeCommentRes: await apiWrapper(HttpService.client.purgeComment(form)),
    });
    this.purgeItem(this.state.purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    this.setState({ purgePostRes: { state: "loading" } });
    this.setState({
      purgePostRes: await apiWrapper(HttpService.client.purgePost(form)),
    });
    this.purgeItem(this.state.purgePostRes);
  }

  async handleBlockCommunity(form: BlockCommunity) {
    this.setState({ blockCommunityRes: { state: "loading" } });
    this.setState({
      blockCommunityRes: await apiWrapper(
        HttpService.client.blockCommunity(form)
      ),
    });
    const res = this.state.blockCommunityRes;

    if (res.state == "success") {
      updateCommunityBlock(res.data);
    }
  }

  async handleBlockPerson(form: BlockPerson) {
    this.setState({ blockPersonRes: { state: "loading" } });
    const blockPersonRes = await apiWrapper(
      HttpService.client.blockPerson(form)
    );
    this.setState({ blockPersonRes });

    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleRemoveCommunity(form: RemoveCommunity) {
    this.setState({ removeCommunityRes: { state: "loading" } });
    this.setState({
      removeCommunityRes: await apiWrapper(
        HttpService.client.removeCommunity(form)
      ),
    });
    this.updateCommunity(this.state.removeCommunityRes);
  }

  async handleEditCommunity(form: EditCommunity) {
    this.setState({ editCommunityRes: { state: "loading" } });
    this.setState({
      editCommunityRes: await apiWrapper(
        HttpService.client.editCommunity(form)
      ),
    });
    this.updateCommunity(this.state.editCommunityRes);
  }

  async handleCreateComment(form: CreateComment) {
    this.setState({ createCommentRes: { state: "loading" } });

    const createCommentRes = await apiWrapper(
      HttpService.client.createComment(form)
    );
    this.setState({ createCommentRes });

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
    this.setState({ editCommentRes: { state: "loading" } });
    const editCommentRes = await apiWrapper(
      HttpService.client.editComment(form)
    );
    this.setState({ editCommentRes });

    this.findAndUpdateComment(editCommentRes);
  }

  async handleDeleteComment(form: DeleteComment) {
    this.setState({ deleteCommentRes: { state: "loading" } });
    const deleteCommentRes = await apiWrapper(
      HttpService.client.deleteComment(form)
    );
    this.setState({ deleteCommentRes });

    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    this.setState({ deletePostRes: { state: "loading" } });
    const deletePostRes = await apiWrapper(HttpService.client.deletePost(form));
    this.setState({ deletePostRes });
    this.updatePost(deletePostRes);
  }

  async handleRemovePost(form: RemovePost) {
    this.setState({ removePostRes: { state: "loading" } });
    const removePostRes = await apiWrapper(HttpService.client.removePost(form));
    this.setState({ removePostRes });
    this.updatePost(removePostRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    this.setState({ removeCommentRes: { state: "loading" } });
    const removeCommentRes = await apiWrapper(
      HttpService.client.removeComment(form)
    );
    this.setState({ removeCommentRes });

    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    this.setState({ saveCommentRes: { state: "loading" } });
    const saveCommentRes = await apiWrapper(
      HttpService.client.saveComment(form)
    );
    this.setState({ saveCommentRes });
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    this.setState({ savePostRes: { state: "loading" } });
    const savePostRes = await apiWrapper(HttpService.client.savePost(form));
    this.setState({ savePostRes });
    this.updatePost(savePostRes);
  }

  async handleFeaturePostLocal(form: FeaturePost) {
    this.setState({ featurePostLocalRes: { state: "loading" } });
    const featurePostLocalRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostLocalRes });
    this.updatePost(featurePostLocalRes);
  }

  async handleFeaturePostCommunity(form: FeaturePost) {
    this.setState({ featurePostCommunityRes: { state: "loading" } });
    const featurePostCommunityRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostCommunityRes });
    this.updatePost(featurePostCommunityRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    this.setState({ voteCommentRes: { state: "loading" } });
    const voteCommentRes = await apiWrapper(
      HttpService.client.likeComment(form)
    );
    this.setState({ voteCommentRes });
    this.findAndUpdateComment(voteCommentRes);
  }

  async handlePostVote(form: CreatePostLike) {
    this.setState({ votePostRes: { state: "loading" } });
    const votePostRes = await apiWrapper(HttpService.client.likePost(form));
    this.setState({ votePostRes });
    this.updatePost(votePostRes);
  }

  async handleCommentReport(form: CreateCommentReport) {
    this.setState({ reportCommentRes: { state: "loading" } });
    const reportCommentRes = await apiWrapper(
      HttpService.client.createCommentReport(form)
    );
    this.setState({ reportCommentRes });
    if (reportCommentRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    this.setState({ reportPostRes: { state: "loading" } });
    const reportPostRes = await apiWrapper(
      HttpService.client.createPostReport(form)
    );
    this.setState({ reportPostRes });
    if (reportPostRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    this.setState({ lockPostRes: { state: "loading" } });
    const lockPostRes = await apiWrapper(HttpService.client.lockPost(form));
    this.setState({ lockPostRes });

    this.updatePost(lockPostRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    this.setState({ distinguishCommentRes: { state: "loading" } });
    const distinguishCommentRes = await apiWrapper(
      HttpService.client.distinguishComment(form)
    );
    this.setState({ distinguishCommentRes });
    this.findAndUpdateComment(distinguishCommentRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    this.setState({ addAdminRes: { state: "loading" } });
    const addAdminRes = await apiWrapper(HttpService.client.addAdmin(form));
    this.setState({ addAdminRes });

    if (addAdminRes.state == "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    this.setState({ readCommentReplyRes: { state: "loading" } });
    const readCommentReplyRes = await apiWrapper(
      HttpService.client.markCommentReplyAsRead(form)
    );
    this.setState({ readCommentReplyRes });
    this.findAndUpdateCommentReply(readCommentReplyRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    this.setState({ readPersonMentionRes: { state: "loading" } });
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    const readPersonMentionRes = await apiWrapper(
      HttpService.client.markPersonMentionAsRead(form)
    );
    this.setState({ readPersonMentionRes });
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    this.setState({ banFromCommunityRes: { state: "loading" } });
    const banFromCommunityRes = await apiWrapper(
      HttpService.client.banFromCommunity(form)
    );
    this.setState({ banFromCommunityRes });
    this.updateBanFromCommunity(banFromCommunityRes);
  }

  async handleBanPerson(form: BanPerson) {
    this.setState({ banPersonRes: { state: "loading" } });
    const banPersonRes = await apiWrapper(HttpService.client.banPerson(form));
    this.setState({ banPersonRes });
    this.updateBan(banPersonRes);
  }

  async handleTransferCommunity(form: TransferCommunity) {
    this.setState({ transferCommunityRes: { state: "loading" } });
    const transferCommunityRes = await apiWrapper(
      HttpService.client.transferCommunity(form)
    );
    this.setState({ transferCommunityRes });
    toast(i18n.t("transfer_community"));
    this.updateCommunityFull(transferCommunityRes);
  }

  async handleFetchChildren(form: GetComments) {
    this.setState({ fetchChildrenRes: { state: "loading" } });

    const fetchChildrenRes = await apiWrapper(
      HttpService.client.getComments(form)
    );
    this.setState({ fetchChildrenRes });

    if (
      this.state.commentsRes.state == "success" &&
      fetchChildrenRes.state == "success"
    ) {
      const newComments = fetchChildrenRes.data.comments;
      // Remove the first comment, since it is the parent
      newComments.shift();
      const newRes = this.state.commentsRes;
      newRes.data.comments.push(...newComments);
      this.setState({ commentsRes: newRes });
    }
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

  findAndUpdateCommentReply(res: RequestState<CommentReplyResponse>) {
    this.setState(s => {
      if (s.commentsRes.state == "success" && res.state == "success") {
        s.commentsRes.data.comments = editCommentWithCommentReplies(
          res.data.comment_reply_view,
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
