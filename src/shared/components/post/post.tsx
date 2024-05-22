import {
  buildCommentsTree,
  commentsToFlatNodes,
  editComment,
  editWith,
  enableDownvotes,
  enableNsfw,
  getCommentIdFromProps,
  getCommentParentId,
  getDepthFromComment,
  getIdFromProps,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
  voteDisplayMode,
} from "@utils/app";
import { isBrowser } from "@utils/browser";
import {
  debounce,
  getApubName,
  getQueryParams,
  getQueryString,
  randomStr,
  resourcesSettled,
  bareRoutePush,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isImage } from "@utils/media";
import { QueryParams, RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, createRef, linkEvent } from "inferno";
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
  HidePost,
  LemmyHttp,
  LockPost,
  MarkCommentReplyAsRead,
  PostResponse,
  PurgeComment,
  PurgeCommunity,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemoveCommunity,
  RemovePost,
  SaveComment,
  SavePost,
  SuccessResponse,
  TransferCommunity,
} from "lemmy-js-client";
import { commentTreeMaxDepth } from "../../config";
import {
  CommentNodeI,
  CommentViewType,
  InitialFetchRequest,
} from "../../interfaces";
import { FirstLoadService, I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { toast } from "../../toast";
import { CommentForm } from "../comment/comment-form";
import { CommentNodes } from "../comment/comment-nodes";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Sidebar } from "../community/sidebar";
import { PostListing } from "./post-listing";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "../../routes";
import { compareAsc, compareDesc } from "date-fns";

const commentsShownInterval = 15;

type PostData = RouteDataResponse<{
  postRes: GetPostResponse;
  commentsRes: GetCommentsResponse;
}>;

interface PostState {
  postRes: RequestState<GetPostResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
  finished: Map<CommentId, boolean | undefined>;
  isIsomorphic: boolean;
}

const defaultCommentSort: CommentSortType = "Hot";

function getCommentSortTypeFromQuery(source?: string): CommentSortType {
  if (!source) {
    return defaultCommentSort;
  }
  switch (source) {
    case "Hot":
    case "Top":
    case "New":
    case "Old":
    case "Controversial":
      return source;
    default:
      return defaultCommentSort;
  }
}

function getQueryStringFromCommentSortType(
  sort: CommentSortType,
): undefined | string {
  if (sort === defaultCommentSort) {
    return undefined;
  }
  return sort;
}

const defaultCommentView: CommentViewType = CommentViewType.Tree;

function getCommentViewTypeFromQuery(source?: string): CommentViewType {
  switch (source) {
    case "Tree":
      return CommentViewType.Tree;
    case "Flat":
      return CommentViewType.Flat;
    default:
      return defaultCommentView;
  }
}

function getQueryStringFromCommentView(
  view: CommentViewType,
): string | undefined {
  if (view === defaultCommentView) {
    return undefined;
  }
  switch (view) {
    case CommentViewType.Tree:
      return "Tree";
    case CommentViewType.Flat:
      return "Flat";
    default:
      return undefined;
  }
}

interface PostProps {
  sort: CommentSortType;
  view: CommentViewType;
  scrollToComments: boolean;
}
export function getPostQueryParams(source: string | undefined): PostProps {
  return getQueryParams<PostProps>(
    {
      scrollToComments: (s?: string) => !!s,
      sort: getCommentSortTypeFromQuery,
      view: getCommentViewTypeFromQuery,
    },
    source,
  );
}

type PostPathProps = { post_id?: string; comment_id?: string };
type PostRouteProps = RouteComponentProps<PostPathProps> & PostProps;
type PartialPostRouteProps = Partial<
  PostProps & { match: { params: PostPathProps } }
>;
export type PostFetchConfig = IRoutePropsWithFetch<
  PostData,
  PostPathProps,
  PostProps
>;

@scrollMixin
export class Post extends Component<PostRouteProps, PostState> {
  private isoData = setIsoData<PostData>(this.context);
  private commentScrollDebounced: () => void;
  private shouldScrollToComments: boolean = false;
  private commentSectionRef = createRef<HTMLDivElement>();
  state: PostState = {
    postRes: EMPTY_REQUEST,
    commentsRes: EMPTY_REQUEST,
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
    maxCommentsShown: commentsShownInterval,
    finished: new Map(),
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.postRes, this.state.commentsRes]);
  }

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
    this.handleHidePost = this.handleHidePost.bind(this);
    this.handleScrollIntoCommentsClick =
      this.handleScrollIntoCommentsClick.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { commentsRes, postRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        postRes,
        commentsRes,
        isIsomorphic: true,
      };
    }
  }

  async fetchPost(props: PostRouteProps) {
    this.setState({
      postRes: LOADING_REQUEST,
    });

    const postRes = await HttpService.client.getPost({
      id: getIdFromProps(props),
      comment_id: getCommentIdFromProps(props),
    });

    this.setState({
      postRes,
    });
  }

  async fetchComments(props: PostRouteProps) {
    const { sort } = props;
    this.setState({
      commentsRes: LOADING_REQUEST,
    });

    const commentsRes = await HttpService.client.getComments({
      post_id: getIdFromProps(props),
      parent_id: getCommentIdFromProps(props),
      max_depth: commentTreeMaxDepth,
      sort,
      type_: "All",
      saved_only: false,
    });

    this.setState({
      commentsRes,
    });
  }

  updateUrl(props: PartialPostRouteProps, replace = false) {
    const {
      view,
      sort,
      match: {
        params: { comment_id, post_id },
      },
    } = {
      ...this.props,
      ...props,
    };

    const query: QueryParams<PostProps> = {
      sort: getQueryStringFromCommentSortType(sort),
      view: getQueryStringFromCommentView(view),
    };

    // Not inheriting old scrollToComments
    if (props.scrollToComments) {
      query.scrollToComments = true.toString();
    }

    let pathname: string | undefined;
    if (comment_id && post_id) {
      pathname = `/post/${post_id}/${comment_id}`;
    } else if (comment_id) {
      pathname = `/comment/${comment_id}`;
    } else {
      pathname = `/post/${post_id}`;
    }

    const location = { pathname, search: getQueryString(query) };
    if (replace || this.props.location.pathname === pathname) {
      this.props.history.replace(location);
    } else {
      this.props.history.push(location);
    }
  }

  static async fetchInitialData({
    headers,
    match,
    query: { sort },
  }: InitialFetchRequest<PostPathProps, PostProps>): Promise<PostData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const postId = getIdFromProps({ match });
    const commentId = getCommentIdFromProps({ match });

    const postForm: GetPost = {
      id: postId,
      comment_id: commentId,
    };

    const commentsForm: GetComments = {
      post_id: postId,
      parent_id: commentId,
      max_depth: commentTreeMaxDepth,
      sort,
      type_: "All",
      saved_only: false,
    };

    const [postRes, commentsRes] = await Promise.all([
      client.getPost(postForm),
      client.getComments(commentsForm),
    ]);

    return {
      postRes,
      commentsRes,
    };
  }

  componentWillUnmount() {
    document.removeEventListener("scroll", this.commentScrollDebounced);
  }

  async componentWillMount() {
    if (isBrowser()) {
      this.shouldScrollToComments = this.props.scrollToComments;
      if (!this.state.isIsomorphic) {
        await Promise.all([
          this.fetchPost(this.props),
          this.fetchComments(this.props),
        ]);
      }
    }
  }

  componentDidMount() {
    this.commentScrollDebounced = debounce(this.trackCommentsBoxScrolling, 100);
    document.addEventListener("scroll", this.commentScrollDebounced);

    if (this.state.isIsomorphic) {
      this.maybeScrollToComments();
    }
  }

  componentWillReceiveProps(nextProps: PostRouteProps): void {
    const { post_id: nextPost, comment_id: nextComment } =
      nextProps.match.params;
    const { post_id: prevPost, comment_id: prevComment } =
      this.props.match.params;

    const newOrder =
      this.props.sort !== nextProps.sort || this.props.view !== nextProps.view;

    // For comment links restore sort type from current props.
    if (
      nextPost === prevPost &&
      nextComment &&
      newOrder &&
      !nextProps.location.search &&
      nextProps.history.action === "PUSH"
    ) {
      this.updateUrl({ match: nextProps.match }, true);
      return;
    }

    const needPost =
      prevPost !== nextPost ||
      (bareRoutePush(this.props, nextProps) && !nextComment);
    const needComments =
      needPost ||
      prevComment !== nextComment ||
      nextProps.sort !== this.props.sort;

    if (needPost) {
      this.fetchPost(nextProps);
    }
    if (needComments) {
      this.fetchComments(nextProps);
    }

    if (
      nextProps.scrollToComments &&
      this.props.scrollToComments !== nextProps.scrollToComments
    ) {
      this.shouldScrollToComments = true;
    }
  }

  componentDidUpdate(): void {
    if (
      this.commentSectionRef.current &&
      this.state.postRes.state === "success" &&
      this.state.commentsRes.state === "success"
    ) {
      this.maybeScrollToComments();
    }
  }

  handleScrollIntoCommentsClick(e: MouseEvent) {
    this.scrollIntoCommentSection();
    e.preventDefault();
  }

  maybeScrollToComments() {
    if (this.shouldScrollToComments) {
      this.shouldScrollToComments = false;
      if (this.props.history.action !== "POP" || this.state.isIsomorphic) {
        this.scrollIntoCommentSection();
      }
    }
  }

  scrollIntoCommentSection() {
    // This doesn't work when in a background tab in firefox.
    this.commentSectionRef.current?.scrollIntoView();
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
        const siteRes = this.state.siteRes;
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
                admins={siteRes.admins}
                enableDownvotes={enableDownvotes(siteRes)}
                voteDisplayMode={voteDisplayMode(siteRes)}
                enableNsfw={enableNsfw(siteRes)}
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
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
                onMarkPostAsRead={() => {}}
                onHidePost={this.handleHidePost}
                onScrollIntoCommentsClick={this.handleScrollIntoCommentsClick}
              />
              <div ref={this.commentSectionRef} className="mb-2" />

              {/* Only show the top level comment form if its not a context view */}
              {!(
                getCommentIdFromProps(this.props) ||
                res.post_view.banned_from_community
              ) && (
                <CommentForm
                  key={
                    this.context.router.history.location.key
                    // reset on new location, otherwise <Prompt /> stops working
                  }
                  node={res.post_view.post.id}
                  disabled={res.post_view.post.locked}
                  allLanguages={siteRes.all_languages}
                  siteLanguages={siteRes.discussion_languages}
                  containerClass="post-comment-container"
                  onUpsertComment={this.handleCreateComment}
                  finished={this.state.finished.get(0)}
                />
              )}
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
              {this.props.view === CommentViewType.Tree && this.commentsTree()}
              {this.props.view === CommentViewType.Flat && this.commentsFlat()}
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
            checked={this.props.sort === "Hot"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-hot`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "Hot",
            })}
          >
            {I18NextService.i18n.t("hot")}
          </label>
          <input
            id={`${radioId}-top`}
            type="radio"
            className="btn-check"
            value={"Top"}
            checked={this.props.sort === "Top"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-top`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "Top",
            })}
          >
            {I18NextService.i18n.t("top")}
          </label>
          <input
            id={`${radioId}-controversial`}
            type="radio"
            className="btn-check"
            value={"Controversial"}
            checked={this.props.sort === "Controversial"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-controversial`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "Controversial",
            })}
          >
            {I18NextService.i18n.t("controversial")}
          </label>
          <input
            id={`${radioId}-new`}
            type="radio"
            className="btn-check"
            value={"New"}
            checked={this.props.sort === "New"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-new`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "New",
            })}
          >
            {I18NextService.i18n.t("new")}
          </label>
          <input
            id={`${radioId}-old`}
            type="radio"
            className="btn-check"
            value={"Old"}
            checked={this.props.sort === "Old"}
            onChange={linkEvent(this, this.handleCommentSortChange)}
          />
          <label
            htmlFor={`${radioId}-old`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "Old",
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
            checked={this.props.view === CommentViewType.Flat}
            onChange={linkEvent(this, this.handleCommentViewTypeChange)}
          />
          <label
            htmlFor={`${radioId}-chat`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.view === CommentViewType.Flat,
            })}
          >
            {I18NextService.i18n.t("chat")}
          </label>
        </div>
      </>
    );
  }

  commentsFlat() {
    if (this.state.commentsRes.state === "loading") {
      return (
        <div className="text-center">
          <Spinner large />
        </div>
      );
    }

    // These are already sorted by new
    const commentsRes = this.state.commentsRes;
    const postRes = this.state.postRes;
    const siteRes = this.state.siteRes;

    if (commentsRes.state === "success" && postRes.state === "success") {
      return (
        <div>
          <CommentNodes
            nodes={this.sortedFlatNodes()}
            viewType={this.props.view}
            maxCommentsShown={this.state.maxCommentsShown}
            isTopLevel
            locked={postRes.data.post_view.post.locked}
            moderators={postRes.data.moderators}
            admins={siteRes.admins}
            enableDownvotes={enableDownvotes(siteRes)}
            voteDisplayMode={voteDisplayMode(siteRes)}
            showContext
            finished={this.state.finished}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
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
            onPersonMentionRead={() => {}}
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

  sortedFlatNodes(): CommentNodeI[] {
    if (this.state.commentsRes.state !== "success") {
      return [];
    }
    const nodeToDate = (node: CommentNodeI) =>
      node.comment_view.comment.published;
    const nodes = commentsToFlatNodes(this.state.commentsRes.data.comments);
    if (this.props.sort === "New") {
      return nodes.sort((a, b) => compareDesc(nodeToDate(a), nodeToDate(b)));
    } else {
      return nodes.sort((a, b) => compareAsc(nodeToDate(a), nodeToDate(b)));
    }
  }

  commentsTree() {
    if (this.state.commentsRes.state === "loading") {
      return (
        <div className="text-center">
          <Spinner large />
        </div>
      );
    }

    const res = this.state.postRes;
    const firstComment = this.commentTree().at(0)?.comment_view.comment;
    const depth = getDepthFromComment(firstComment);
    const showContextButton = depth ? depth > 0 : false;
    const siteRes = this.state.siteRes;

    return (
      res.state === "success" && (
        <div>
          {!!getCommentIdFromProps(this.props) && (
            <>
              <button
                className="ps-0 d-block btn btn-link text-muted"
                onClick={linkEvent(this, this.handleViewAllComments)}
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
            viewType={this.props.view}
            maxCommentsShown={this.state.maxCommentsShown}
            locked={res.data.post_view.post.locked}
            moderators={res.data.moderators}
            admins={siteRes.admins}
            enableDownvotes={enableDownvotes(siteRes)}
            voteDisplayMode={voteDisplayMode(siteRes)}
            finished={this.state.finished}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
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
            onPersonMentionRead={() => {}}
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
      const comments = this.state.commentsRes.data.comments;
      if (comments.length) {
        return buildCommentsTree(comments, !!getCommentIdFromProps(this.props));
      }
    }
    return [];
  }

  async handleCommentSortChange(i: Post, event: any) {
    const sort = event.target.value as CommentSortType;
    const flattenable = sort === "New" || sort === "Old";
    if (flattenable || i.props.view !== CommentViewType.Flat) {
      i.updateUrl({ sort });
    } else {
      i.updateUrl({ sort, view: CommentViewType.Tree });
    }
  }

  handleCommentViewTypeChange(i: Post, event: any) {
    const flattenable = i.props.sort === "New" || i.props.sort === "Old";
    const view: CommentViewType = Number(event.target.value);
    if (flattenable || view !== CommentViewType.Flat) {
      i.updateUrl({ view });
    } else {
      i.updateUrl({ view, sort: "New" });
    }
  }

  handleShowSidebarMobile(i: Post) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  handleViewAllComments(i: Post) {
    const id =
      getIdFromProps(i.props) ||
      (i.state.postRes.state === "success" &&
        i.state.postRes.data.post_view.post.id);
    if (id) {
      i.updateUrl({
        match: { params: { post_id: id.toString() } },
      });
    }
  }

  handleViewContext(i: Post) {
    if (i.state.commentsRes.state === "success") {
      const commentId = getCommentIdFromProps(i.props);
      const commentView = i.state.commentsRes.data.comments.find(
        c => c.comment.id === commentId,
      );

      const parentId = getCommentParentId(commentView?.comment);
      const postId = commentView?.post.id;

      if (parentId && postId) {
        i.updateUrl({
          match: {
            params: {
              post_id: postId.toString(),
              comment_id: parentId.toString(),
            },
          },
        });
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
    if (addModRes.state === "success") {
      toast(
        I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"),
      );
    }
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
    this.findAndUpdateCommentEdit(editCommentRes);

    return editCommentRes;
  }

  async handleDeleteComment(form: DeleteComment) {
    const deleteCommentRes = await HttpService.client.deleteComment(form);
    this.findAndUpdateComment(deleteCommentRes);
    if (deleteCommentRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          form.deleted ? "deleted_comment" : "undeleted_comment",
        ),
      );
    }
  }

  async handleDeletePost(form: DeletePost) {
    const deleteRes = await HttpService.client.deletePost(form);
    this.updatePost(deleteRes);
    if (deleteRes.state === "success") {
      toast(
        I18NextService.i18n.t(form.deleted ? "deleted_post" : "undeleted_post"),
      );
    }
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = await HttpService.client.removePost(form);
    this.updatePost(removeRes);
    if (removeRes.state === "success") {
      toast(
        I18NextService.i18n.t(form.removed ? "removed_post" : "restored_post"),
      );
    }
  }

  async handleRemoveComment(form: RemoveComment) {
    const removeCommentRes = await HttpService.client.removeComment(form);
    this.findAndUpdateComment(removeCommentRes);
    if (removeCommentRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          form.removed ? "removed_comment" : "restored_comment",
        ),
      );
    }
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
    if (featureRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          form.featured ? "featured_post" : "unfeatured_post",
        ),
      );
    }
  }

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(voteRes);
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = await HttpService.client.likePost(form);
    this.updatePost(voteRes);
    return voteRes;
  }

  async handlePostEdit(form: EditPost) {
    const res = await HttpService.client.editPost(form);
    this.updatePost(res);
    return res;
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
    if (lockRes.state === "success") {
      toast(
        I18NextService.i18n.t(form.locked ? "locked_post" : "unlocked_post"),
      );
    }
  }

  async handleDistinguishComment(form: DistinguishComment) {
    const distinguishRes = await HttpService.client.distinguishComment(form);
    this.findAndUpdateComment(distinguishRes);
    if (distinguishRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          form.distinguished
            ? "distinguished_comment"
            : "undistinguished_comment",
        ),
      );
    }
  }

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = await HttpService.client.addAdmin(form);

    if (addAdminRes.state === "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
      toast(
        I18NextService.i18n.t(form.added ? "appointed_admin" : "removed_admin"),
      );
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    const transferCommunityRes =
      await HttpService.client.transferCommunity(form);
    this.updateCommunityFull(transferCommunityRes);
    if (transferCommunityRes.state === "success") {
      toast(I18NextService.i18n.t("transferred_community"));
    }
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

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes);
    if (banRes.state === "success" && this.state.postRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          form.ban ? "banned_from_community" : "unbanned_from_community",
          {
            user: getApubName(banRes.data.person_view.person),
            community: getApubName(this.state.postRes.data.post_view.community),
          },
        ),
      );
    }
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
    if (banRes.state === "success" && this.state.postRes.state === "success") {
      toast(
        I18NextService.i18n.t(
          form.ban ? "banned_from_site" : "unbanned_from_site",
          {
            user: getApubName(banRes.data.person_view.person),
          },
        ),
      );
    }
  }

  async handleHidePost(form: HidePost) {
    const hideRes = await HttpService.client.hidePost(form);

    if (hideRes.state === "success") {
      this.setState(s => {
        if (s.postRes.state === "success") {
          s.postRes.data.post_view.hidden = form.hide;
        }

        return s;
      });

      toast(I18NextService.i18n.t(form.hide ? "post_hidden" : "post_unhidden"));
    }
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

  purgeItem(purgeRes: RequestState<SuccessResponse>) {
    if (purgeRes.state === "success") {
      toast(I18NextService.i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        // The comment must be inserted not at the very beginning of the list,
        // because the buildCommentsTree needs a correct path ordering.
        // It should be inserted right after its parent is found
        const comments = s.commentsRes.data.comments;
        const newComment = res.data.comment_view;
        const newCommentParentId = getCommentParentId(newComment.comment);

        const foundCommentParentIndex = comments.findIndex(
          c => c.comment.id === newCommentParentId,
        );

        comments.splice(foundCommentParentIndex + 1, 0, newComment);

        // Set finished for the parent
        s.finished.set(newCommentParentId ?? 0, true);
      }
      return s;
    });
  }

  findAndUpdateCommentEdit(res: RequestState<CommentResponse>) {
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

  // No need to set finished on a comment vote, save, etc
  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.comments = editComment(
          res.data.comment_view,
          s.commentsRes.data.comments,
        );
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
