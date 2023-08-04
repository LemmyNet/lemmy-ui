import {
  buildCommentsTree,
  commentsToFlatNodes,
  editComment,
  editWith,
  enableDownvotes,
  enableNsfw,
  getCommentParentId,
  getDepthFromComment,
  myAuth,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import {
  isBrowser,
  restoreScrollPosition,
  saveScrollPosition,
} from "@utils/browser";
import { debounce, getIdFromString, randomStr } from "@utils/helpers";
import { isImage } from "@utils/media";
import { RouteDataResponse } from "@utils/types";
import autosize from "autosize";
import classNames from "classnames";
import { Component, RefObject, createRef, linkEvent } from "inferno";
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
  CommentId,
  CommentReplyResponse,
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
  EditPost,
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
import { commentTreeMaxDepth } from "../../config";
import {
  CommentNodeI,
  CommentViewType,
  InitialFetchRequest,
} from "../../interfaces";
import { FirstLoadService, I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { setupTippy } from "../../tippy";
import { toast } from "../../toast";
import { CommentForm } from "../comment/comment-form";
import { CommentNodes } from "../comment/comment-nodes";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Sidebar } from "../community/sidebar";
import { PostListing } from "./post-listing";

const commentsShownInterval = 15;

interface PostParams {
  post_id?: string;
  comment_id?: string;
}
type PostData = RouteDataResponse<{
  postRes: GetPostResponse;
  commentsRes: GetCommentsResponse;
}>;

interface PostState {
  postRes: RequestState<GetPostResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  commentSort: CommentSortType;
  commentViewType: CommentViewType;
  scrolled?: boolean;
  siteRes: GetSiteResponse;
  commentSectionRef?: RefObject<HTMLDivElement>;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
  finished: Map<CommentId, boolean | undefined>;
  isIsomorphic: boolean;
}

export class Post extends Component<any, PostState> {
  private isoData = setIsoData<PostData>(this.context);
  private commentScrollDebounced: () => void;
  state: PostState = {
    postRes: { state: "empty" },
    commentsRes: { state: "empty" },
    commentSort: "Hot",
    commentViewType: CommentViewType.Tree,
    scrolled: false,
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
    maxCommentsShown: commentsShownInterval,
    finished: new Map(),
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleDeleteCommunityClick =
      this.handleDeleteCommunityClick.bind(this);
    this.handleEditCommunity = this.handleEditCommunity.bind(this);
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
    this.handlePostEdit = this.handlePostEdit.bind(this);
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
    if (FirstLoadService.isFirstLoad) {
      const { commentsRes, postRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        postRes,
        commentsRes,
        isIsomorphic: true,
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
    const { post_id, comment_id } = this.props.match.params as PostParams;

    this.setState({
      postRes: await HttpService.client.getPost({
        id: getIdFromString(post_id),
        comment_id: getIdFromString(comment_id),
        auth,
      }),
      commentsRes: await HttpService.client.getComments({
        post_id: getIdFromString(post_id),
        parent_id: getIdFromString(comment_id),
        max_depth: commentTreeMaxDepth,
        sort: this.state.commentSort,
        type_: "All",
        saved_only: false,
        auth,
      }),
    });

    setupTippy();

    if (!comment_id) {
      restoreScrollPosition(this.context);
    }

    if (this.checkScrollIntoCommentsParam) {
      this.scrollIntoCommentSection();
    }
  }

  static async fetchInitialData({
    client,
    path,
    auth,
  }: InitialFetchRequest): Promise<PostData> {
    const pathSplit = path.split("/");

    const id = getIdFromString(pathSplit.at(2));
    const comment_id = getIdFromString(pathSplit.at(4));

    const postForm: GetPost = {
      auth,
      id,
      comment_id,
    };

    const commentsForm: GetComments = {
      max_depth: commentTreeMaxDepth,
      sort: "Hot",
      type_: "All",
      saved_only: false,
      auth,
      post_id: id,
      parent_id: comment_id,
    };

    return {
      postRes: await client.getPost(postForm),
      commentsRes: await client.getComments(commentsForm),
    };
  }

  componentWillUnmount() {
    document.removeEventListener("scroll", this.commentScrollDebounced);

    saveScrollPosition(this.context);
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.fetchPost();
    }

    autosize(document.querySelectorAll("textarea"));

    this.commentScrollDebounced = debounce(this.trackCommentsBoxScrolling, 100);
    document.addEventListener("scroll", this.commentScrollDebounced);
  }

  async componentDidUpdate(_lastProps: any) {
    // Necessary if you are on a post and you click another post (same route)
    if (_lastProps.location.pathname !== _lastProps.history.location.pathname) {
      await this.fetchPost();
    }
  }

  get checkScrollIntoCommentsParam() {
    return Boolean(
      new URLSearchParams(this.props.location.search).get("scrollToComments"),
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
      const commentCount =
        this.state.commentsRes.state === "success"
          ? this.state.commentsRes.data.comments.length
          : 0;

      if (this.state.maxCommentsShown < commentCount) {
        this.setState({
          maxCommentsShown: this.state.maxCommentsShown + commentsShownInterval,
        });
      }
    }
  };

  get documentTitle(): string {
    const siteName = this.state.siteRes.site_view.site.name;
    return this.state.postRes.state === "success"
      ? `${this.state.postRes.data.post_view.post.name} - ${siteName}`
      : siteName;
  }

  get imageTag(): string | undefined {
    if (this.state.postRes.state === "success") {
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
            <main className="col-12 col-md-8 col-lg-9 mb-3">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                canonicalPath={res.post_view.post.ap_id}
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
                onPostEdit={this.handlePostEdit}
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
                containerClass="post-comment-container"
                onUpsertComment={this.handleCreateComment}
                finished={this.state.finished.get(0)}
              />
              <div className="d-block d-md-none">
                <button
                  className="btn btn-secondary d-inline-block mb-2 me-3"
                  onClick={linkEvent(this, this.handleShowSidebarMobile)}
                >
                  {I18NextService.i18n.t("sidebar")}{" "}
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
              {this.state.commentViewType === CommentViewType.Tree &&
                this.commentsTree()}
              {this.state.commentViewType === CommentViewType.Flat &&
                this.commentsFlat()}
            </main>
            <aside className="d-none d-md-block col-md-4 col-lg-3">
              {this.sidebar()}
            </aside>
          </div>
        );
      }
    }
  }

  render() {
    return <div className="post container-lg">{this.renderPostRes()}</div>;
  }

  sortRadios() {
    const radioId =
      this.state.postRes.state === "success"
        ? this.state.postRes.data.post_view.post.id
        : randomStr();

    return (
      <>
        <div
          className="btn-group btn-group-toggle flex-wrap me-3 mb-2"
          role="group"
        >
          <input
            id={`${radioId}-hot`}
            type="radio"
            className="btn-check"
            value={"Hot"}
            checked={this.state.commentSort === "Hot"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-hot`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.state.commentSort === "Hot",
            })}
          >
            {I18NextService.i18n.t("hot")}
          </label>
          <input
            id={`${radioId}-top`}
            type="radio"
            className="btn-check"
            value={"Top"}
            checked={this.state.commentSort === "Top"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-top`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.state.commentSort === "Top",
            })}
          >
            {I18NextService.i18n.t("top")}
          </label>
          <input
            id={`${radioId}-new`}
            type="radio"
            className="btn-check"
            value={"New"}
            checked={this.state.commentSort === "New"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-new`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.state.commentSort === "New",
            })}
          >
            {I18NextService.i18n.t("new")}
          </label>
          <input
            id={`${radioId}-old`}
            type="radio"
            className="btn-check"
            value={"Old"}
            checked={this.state.commentSort === "Old"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-old`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.state.commentSort === "Old",
            })}
          >
            {I18NextService.i18n.t("old")}
          </label>
        </div>
        <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
          <input
            id={`${radioId}-chat`}
            type="radio"
            className="btn-check"
            value={CommentViewType.Flat}
            checked={this.state.commentViewType === CommentViewType.Flat}
            onChange={linkEvent(this, this.handleCommentViewTypeChange)}
          />
          <label
            htmlFor={`${radioId}-chat`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.state.commentViewType === CommentViewType.Flat,
            })}
          >
            {I18NextService.i18n.t("chat")}
          </label>
        </div>
      </>
    );
  }

  commentsFlat() {
    // These are already sorted by new
    const commentsRes = this.state.commentsRes;
    const postRes = this.state.postRes;

    if (commentsRes.state === "success" && postRes.state === "success") {
      return (
        <div>
          <CommentNodes
            nodes={commentsToFlatNodes(commentsRes.data.comments)}
            viewType={this.state.commentViewType}
            maxCommentsShown={this.state.maxCommentsShown}
            isTopLevel
            locked={postRes.data.post_view.post.locked}
            moderators={postRes.data.moderators}
            admins={this.state.siteRes.admins}
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            showContext
            finished={this.state.finished}
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
    if (res.state === "success") {
      return (
        <Sidebar
          community_view={res.data.community_view}
          moderators={res.data.moderators}
          admins={this.state.siteRes.admins}
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
      );
    }
  }

  commentsTree() {
    const res = this.state.postRes;
    const firstComment = this.commentTree().at(0)?.comment_view.comment;
    const depth = getDepthFromComment(firstComment);
    const showContextButton = depth ? depth > 0 : false;

    return (
      res.state === "success" && (
        <div>
          {!!this.props.match.params.comment_id && (
            <>
              <button
                className="ps-0 d-block btn btn-link text-muted"
                onClick={linkEvent(this, this.handleViewPost)}
              >
                {I18NextService.i18n.t("view_all_comments")} ➔
              </button>
              {showContextButton && (
                <button
                  className="ps-0 d-block btn btn-link text-muted"
                  onClick={linkEvent(this, this.handleViewContext)}
                >
                  {I18NextService.i18n.t("show_context")} ➔
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
            finished={this.state.finished}
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
    if (this.state.commentsRes.state === "success") {
      const { comment_id } = this.props.match.params;

      return buildCommentsTree(
        this.state.commentsRes.data.comments,
        !!comment_id,
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
    if (i.state.postRes.state === "success") {
      const id = i.state.postRes.data.post_view.post.id;
      i.context.router.history.push(`/post/${id}`);
    }
  }

  handleViewContext(i: Post) {
    if (i.state.commentsRes.state === "success") {
      const comment = i.state.commentsRes.data.comments.at(0)?.comment;
      const parentId = getCommentParentId(comment);
      if (parentId) {
        i.context.router.history.push(
          `/post/${comment?.post_id}/comment/${parentId}`,
        );
      }
    }
  }

  async handleDeleteCommunityClick(form: DeleteCommunity) {
    const deleteCommunityRes = await HttpService.client.deleteCommunity(form);
    this.updateCommunity(deleteCommunityRes);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    const addModRes = await HttpService.client.addModToCommunity(form);
    this.updateModerators(addModRes);
  }

  async handleFollow(form: FollowCommunity) {
    const followCommunityRes = await HttpService.client.followCommunity(form);
    this.updateCommunity(followCommunityRes);

    // Update myUserInfo
    if (followCommunityRes.state === "success") {
      const communityId = followCommunityRes.data.community_view.community.id;
      const mui = UserService.Instance.myUserInfo;
      if (mui) {
        mui.follows = mui.follows.filter(i => i.community.id !== communityId);
      }
    }
  }

  async handlePurgeCommunity(form: PurgeCommunity) {
    const purgeCommunityRes = await HttpService.client.purgeCommunity(form);
    this.purgeItem(purgeCommunityRes);
  }

  async handlePurgePerson(form: PurgePerson) {
    const purgePersonRes = await HttpService.client.purgePerson(form);
    this.purgeItem(purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    const purgeCommentRes = await HttpService.client.purgeComment(form);
    this.purgeItem(purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    const purgeRes = await HttpService.client.purgePost(form);
    this.purgeItem(purgeRes);
  }

  async handleBlockCommunity(form: BlockCommunity) {
    const blockCommunityRes = await HttpService.client.blockCommunity(form);
    if (blockCommunityRes.state === "success") {
      updateCommunityBlock(blockCommunityRes.data);
      this.setState(s => {
        if (s.postRes.state === "success") {
          s.postRes.data.community_view.blocked =
            blockCommunityRes.data.blocked;
        }
      });
    }
  }

  async handleBlockPerson(form: BlockPerson) {
    const blockPersonRes = await HttpService.client.blockPerson(form);
    if (blockPersonRes.state === "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleModRemoveCommunity(form: RemoveCommunity) {
    const removeCommunityRes = await HttpService.client.removeCommunity(form);
    this.updateCommunity(removeCommunityRes);
  }

  async handleEditCommunity(form: EditCommunity) {
    const res = await HttpService.client.editCommunity(form);
    this.updateCommunity(res);

    return res;
  }

  async handleCreateComment(form: CreateComment) {
    const createCommentRes = await HttpService.client.createComment(form);
    this.createAndUpdateComments(createCommentRes);

    return createCommentRes;
  }

  async handleEditComment(form: EditComment) {
    const editCommentRes = await HttpService.client.editComment(form);
    this.findAndUpdateComment(editCommentRes);

    return editCommentRes;
  }

  async handleDeleteComment(form: DeleteComment) {
    const deleteCommentRes = await HttpService.client.deleteComment(form);
    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    const deleteRes = await HttpService.client.deletePost(form);
    this.updatePost(deleteRes);
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = await HttpService.client.removePost(form);
    this.updatePost(removeRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    const removeCommentRes = await HttpService.client.removeComment(form);
    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    const saveCommentRes = await HttpService.client.saveComment(form);
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    const saveRes = await HttpService.client.savePost(form);
    this.updatePost(saveRes);
  }

  async handleFeaturePost(form: FeaturePost) {
    const featureRes = await HttpService.client.featurePost(form);
    this.updatePost(featureRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(voteRes);
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = await HttpService.client.likePost(form);
    this.updatePost(voteRes);
  }

  async handlePostEdit(form: EditPost) {
    const res = await HttpService.client.editPost(form);
    this.updatePost(res);
  }

  async handleCommentReport(form: CreateCommentReport) {
    const reportRes = await HttpService.client.createCommentReport(form);
    if (reportRes.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    const reportRes = await HttpService.client.createPostReport(form);
    if (reportRes.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    const lockRes = await HttpService.client.lockPost(form);
    this.updatePost(lockRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    const distinguishRes = await HttpService.client.distinguishComment(form);
    this.findAndUpdateComment(distinguishRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = await HttpService.client.addAdmin(form);

    if (addAdminRes.state === "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    const transferCommunityRes = await HttpService.client.transferCommunity(
      form,
    );
    this.updateCommunityFull(transferCommunityRes);
  }

  async handleFetchChildren(form: GetComments) {
    const moreCommentsRes = await HttpService.client.getComments(form);
    if (
      this.state.commentsRes.state === "success" &&
      moreCommentsRes.state === "success"
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
    const readRes = await HttpService.client.markCommentReplyAsRead(form);
    this.findAndUpdateCommentReply(readRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    await HttpService.client.markPersonMentionAsRead(form);
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBan(banRes);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (
          s.postRes.state === "success" &&
          s.postRes.data.post_view.creator.id ===
            banRes.data.person_view.person.id
        ) {
          s.postRes.data.post_view.creator_banned_from_community =
            banRes.data.banned;
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned),
            );
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (
          s.postRes.state === "success" &&
          s.postRes.data.post_view.creator.id ===
            banRes.data.person_view.person.id
        ) {
          s.postRes.data.post_view.creator.banned = banRes.data.banned;
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.comments
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        return s;
      });
    }
  }

  updateCommunity(communityRes: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.postRes.state === "success" && communityRes.state === "success") {
        s.postRes.data.community_view = communityRes.data.community_view;
      }
      return s;
    });
  }

  updateCommunityFull(res: RequestState<GetCommunityResponse>) {
    this.setState(s => {
      if (s.postRes.state === "success" && res.state === "success") {
        s.postRes.data.community_view = res.data.community_view;
        s.postRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }

  updatePost(post: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postRes.state === "success" && post.state === "success") {
        s.postRes.data.post_view = post.data.post_view;
      }
      return s;
    });
  }

  purgeItem(purgeRes: RequestState<PurgeItemResponse>) {
    if (purgeRes.state === "success") {
      toast(I18NextService.i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments.unshift(res.data.comment_view);

        // Set finished for the parent
        s.finished.set(
          getCommentParentId(res.data.comment_view.comment) ?? 0,
          true,
        );
      }
      return s;
    });
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments = editComment(
          res.data.comment_view,
          s.commentsRes.data.comments,
        );
        s.finished.set(res.data.comment_view.comment.id, true);
      }
      return s;
    });
  }

  findAndUpdateCommentReply(res: RequestState<CommentReplyResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments = editWith(
          res.data.comment_reply_view,
          s.commentsRes.data.comments,
        );
      }
      return s;
    });
  }

  updateModerators(res: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    this.setState(s => {
      if (s.postRes.state === "success" && res.state === "success") {
        s.postRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }
}
