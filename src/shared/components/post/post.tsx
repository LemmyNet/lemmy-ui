import {
  buildCommentsTree,
  editPersonNotes,
  editCommentSlim,
  enableNsfw,
  getCommentIdFromProps,
  getCommentParentId,
  getDepthFromComment,
  getIdFromProps,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
  editCommentsSlimLocked,
  linkTarget,
  reportToast,
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
import {
  ItemIdAndRes,
  itemLoading,
  CommentNodeType,
  QueryParams,
  RouteDataResponse,
} from "@utils/types";
import classNames from "classnames";
import { Component, createRef, FormEvent } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanPerson,
  PersonResponse,
  BlockCommunity,
  BlockPerson,
  CommentId,
  CommentResponse,
  CommentSortType,
  CommunityResponse,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditPost,
  FeaturePost,
  FollowCommunity,
  GetComments,
  PagedResponse,
  CommentView,
  GetCommunityResponse,
  GetPost,
  GetPostResponse,
  GetSiteResponse,
  HidePost,
  LemmyHttp,
  LockComment,
  LockPost,
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PostNotificationsMode,
  PostResponse,
  PostView,
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
  EditCommunityNotifications,
  CommentSlimView,
  PersonId,
  Community,
} from "lemmy-js-client";
import { commentTreeMaxDepth } from "@utils/config";
import { CommentViewType, InitialFetchRequest } from "@utils/types";
import { FirstLoadService } from "@services/FirstLoadService";
import { I18NextService } from "@services/I18NextService";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "@services/HttpService";
import { toast } from "@utils/app";
import { CommentForm } from "@components/comment/comment-form";
import { CommentNodes } from "@components/comment/comment-nodes";
import { HtmlTags } from "@components/common/html-tags";
import { Icon, Spinner } from "@components/common/icon";
import { CommunitySidebar } from "@components/community/community-sidebar";
import { PostListing } from "./post-listing";
import { getHttpBaseInternal } from "@utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { compareAsc, compareDesc } from "date-fns";
import { nowBoolean } from "@utils/date";
import { NoOptionI18nKeys } from "i18next";
import { PostNotificationSelect } from "@components/common/notification-select";
import { Link } from "inferno-router";

const commentsShownInterval = 15;

type PostData = RouteDataResponse<{
  postRes: GetPostResponse;
  commentsRes: PagedResponse<CommentView>;
}>;

interface PostState {
  postRes: RequestState<GetPostResponse>;
  commentsRes: RequestState<PagedResponse<CommentSlimView>>;
  followCommunityRes: RequestState<CommunityResponse>;
  removeCommunityRes: RequestState<CommunityResponse>;
  addModToCommunityRes: RequestState<AddModToCommunityResponse>;
  purgeCommunityRes: RequestState<SuccessResponse>;
  createCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  editCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  maxCommentsShown: number;
  isIsomorphic: boolean;
  lastCreatedCommentId?: CommentId;
  notifications: PostNotificationsMode;
  editLoading: boolean;
}

function getCommentSortTypeFromQuery(
  source: string | undefined,
  fallback: CommentSortType,
): CommentSortType {
  if (!source) {
    return fallback;
  }
  switch (source) {
    case "hot":
    case "top":
    case "new":
    case "old":
    case "controversial":
      return source;
    default:
      return fallback;
  }
}

function getQueryStringFromCommentSortType(
  sort: CommentSortType,
  siteRes: GetSiteResponse,
  myUserInfo?: MyUserInfo,
): undefined | string {
  const local_user = myUserInfo?.local_user_view.local_user;
  const local_site = siteRes.site_view.local_site;
  const defaultSort =
    local_user?.default_comment_sort_type ??
    local_site.default_comment_sort_type;
  if (sort === defaultSort) {
    return undefined;
  }
  return sort;
}

const defaultCommentView: CommentViewType = "tree";

function getCommentViewTypeFromQuery(source?: string): CommentViewType {
  switch (source) {
    case "Tree":
      return "tree";
    case "Flat":
      return "flat";
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
    case "tree":
      return "Tree";
    case "flat":
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

type Fallbacks = {
  sort: CommentSortType;
};

export function getPostQueryParams(
  source: string | undefined,
  siteRes: GetSiteResponse,
  myUserInfo?: MyUserInfo,
): PostProps {
  const local_user = myUserInfo?.local_user_view.local_user;
  const local_site = siteRes.site_view.local_site;

  return getQueryParams<PostProps, Fallbacks>(
    {
      scrollToComments: (s?: string) => !!s,
      sort: getCommentSortTypeFromQuery,
      view: getCommentViewTypeFromQuery,
    },
    source,
    {
      sort:
        local_user?.default_comment_sort_type ??
        local_site.default_comment_sort_type,
    },
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
    addModToCommunityRes: EMPTY_REQUEST,
    followCommunityRes: EMPTY_REQUEST,
    removeCommunityRes: EMPTY_REQUEST,
    purgeCommunityRes: EMPTY_REQUEST,
    createCommentRes: { id: 0, res: EMPTY_REQUEST },
    editCommentRes: { id: 0, res: EMPTY_REQUEST },
    siteRes: this.isoData.siteRes,
    showSidebarMobile: false,
    maxCommentsShown: commentsShownInterval,
    isIsomorphic: false,
    notifications: "replies_and_mentions",
    editLoading: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.postRes, this.state.commentsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

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

    if (this.state.postRes.state === "success") {
      this.state = {
        ...this.state,
        notifications:
          this.state.postRes.data.post_view.post_actions?.notifications ??
          "replies_and_mentions",
      };
    }
  }

  fetchPostToken?: symbol;
  async fetchPost(props: PostRouteProps) {
    const token = (this.fetchPostToken = Symbol());
    this.setState({ postRes: LOADING_REQUEST });
    const postRes = await HttpService.client.getPost({
      id: getIdFromProps(props),
      comment_id: getCommentIdFromProps(props),
    });
    if (token === this.fetchPostToken) {
      this.setState({ postRes });

      if (this.state.postRes.state === "success") {
        this.setState({
          notifications:
            this.state.postRes.data.post_view.post_actions?.notifications ??
            "replies_and_mentions",
        });
      }
    }
  }

  fetchCommentsToken?: symbol;
  async fetchComments(props: PostRouteProps) {
    const token = (this.fetchCommentsToken = Symbol());
    const { sort } = props;
    this.setState({ commentsRes: LOADING_REQUEST });
    const commentsRes = await HttpService.client.getCommentsSlim({
      post_id: getIdFromProps(props),
      parent_id: getCommentIdFromProps(props),
      max_depth: commentTreeMaxDepth,
      sort,
      type_: "all",
    });
    if (token === this.fetchCommentsToken) {
      this.setState({ commentsRes });
    }
  }

  updateUrl(props: PartialPostRouteProps, replace = false) {
    const location = this.buildUrl(props);
    if (replace || this.props.location.pathname === location.pathname) {
      this.props.history.replace(location);
    } else {
      this.props.history.push(location);
    }
  }

  buildUrl(props: PartialPostRouteProps): { pathname: string; search: string } {
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
      sort: getQueryStringFromCommentSortType(sort, this.state.siteRes),
      view: getQueryStringFromCommentView(view),
    };

    // Not inheriting old scrollToComments
    if (props.scrollToComments) {
      query.scrollToComments = true.toString();
    }

    let pathname: string | undefined;
    if (comment_id && post_id) {
      pathname = `/post/${post_id}/${comment_id}#comment-${comment_id}`;
    } else if (comment_id) {
      pathname = `/comment/${comment_id}#comment-${comment_id}`;
    } else {
      pathname = `/post/${post_id}`;
    }

    return { pathname, search: getQueryString(query) };
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
      type_: "all",
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
          ? this.state.commentsRes.data.items.length
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
    const myUserInfo = this.isoData.myUserInfo;

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
            <div className="col-12 col-md-8 col-lg-9 mb-3">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                canonicalPath={res.post_view.post.ap_id}
                image={this.imageTag}
                description={res.post_view.post.body}
              />
              <PostListing
                postView={res.post_view}
                crossPosts={res.cross_posts}
                communityTags={res.community_view.tags}
                showCrossPosts="expanded"
                showBody="full"
                showCommunity
                admins={siteRes.admins}
                enableNsfw={enableNsfw(siteRes)}
                showAdultConsentModal={this.isoData.showAdultConsentModal}
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
                myUserInfo={myUserInfo}
                localSite={siteRes.site_view.local_site}
                hideImage={false}
                viewOnly={false}
                disableAutoMarkAsRead={false}
                editLoading={this.state.editLoading}
                onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
                onBlockCommunity={form =>
                  handleBlockCommunity(this, form, myUserInfo)
                }
                onPostEdit={form => handlePostEdit(this, form)}
                onPostVote={form => handlePostVote(this, form)}
                onPostReport={form => handlePostReport(form)}
                onLockPost={form => handleLockPost(this, form)}
                onDeletePost={form => handleDeletePost(this, form)}
                onRemovePost={form => handleRemovePost(this, form)}
                onSavePost={form => handleSavePost(this, form)}
                onPurgePerson={form => handlePurgePerson(this, form)}
                onPurgePost={form => handlePurgePost(this, form)}
                onBanPerson={form => handleBanPerson(this, form)}
                onBanPersonFromCommunity={form =>
                  handleBanFromCommunity(this, form)
                }
                onAddModToCommunity={form =>
                  handleAddModToCommunity(this, form)
                }
                onAddAdmin={form => handleAddAdmin(this, form)}
                onTransferCommunity={form =>
                  handleTransferCommunity(this, form)
                }
                onFeaturePost={form => handleFeaturePost(this, form)}
                onHidePost={form => handleHidePost(this, form, myUserInfo)}
                onScrollIntoCommentsClick={e =>
                  handleScrollIntoCommentsClick(this, e)
                }
                markable
                onMarkPostAsRead={form =>
                  handleMarkPostAsRead(this, form, myUserInfo)
                }
                onPersonNote={form => handlePersonNote(this, form)}
                postListingMode="small_card"
              />
              <div ref={this.commentSectionRef} className="mb-2" />

              {/* Only show the top level comment form if its not a context view */}
              {!(
                getCommentIdFromProps(this.props) ||
                res.post_view.community_actions?.received_ban_at
              ) && (
                <CommentForm
                  key={
                    this.context.router.history.location.key +
                    this.state.lastCreatedCommentId
                    // reset on new location, otherwise <Prompt /> stops working
                  }
                  node={res.post_view.post.id}
                  disabled={postLockedDeletedOrRemoved(res.post_view)}
                  allLanguages={siteRes.all_languages}
                  siteLanguages={siteRes.discussion_languages}
                  containerClass="post-comment-container"
                  myUserInfo={myUserInfo}
                  onCreateComment={form =>
                    handleCreateToplevelComment(this, form)
                  }
                  onEditComment={() => {}}
                  loading={itemLoading(this.state.createCommentRes) === 0}
                />
              )}
              <div className="d-block d-md-none">
                <button
                  className="btn btn-secondary d-inline-block mb-2 me-3"
                  onClick={() => handleShowSidebarMobile(this)}
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
              <div className="col-12 d-flex flex-wrap">
                {this.sortRadios()}
                <div className="flex-grow-1"></div>
                <div className="btn-group w-auto mb-2" role="group">
                  <PostNotificationSelect
                    current={this.state.notifications}
                    onChange={val => handleNotificationChange(this, val)}
                  />
                </div>
              </div>
              {this.props.view === "tree" && this.commentsTree()}
              {this.props.view === "flat" && this.commentsFlat()}
            </div>
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
            value={"hot"}
            checked={this.props.sort === "hot"}
            onChange={e => handleCommentSortChange(this, e)}
          />
          <label
            htmlFor={`${radioId}-hot`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "hot",
            })}
          >
            {I18NextService.i18n.t("hot")}
          </label>
          <input
            id={`${radioId}-top`}
            type="radio"
            className="btn-check"
            value={"top"}
            checked={this.props.sort === "top"}
            onChange={e => handleCommentSortChange(this, e)}
          />
          <label
            htmlFor={`${radioId}-top`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "top",
            })}
          >
            {I18NextService.i18n.t("top")}
          </label>
          <input
            id={`${radioId}-controversial`}
            type="radio"
            className="btn-check"
            value={"controversial"}
            checked={this.props.sort === "controversial"}
            onChange={e => handleCommentSortChange(this, e)}
          />
          <label
            htmlFor={`${radioId}-controversial`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "controversial",
            })}
          >
            {I18NextService.i18n.t("controversial")}
          </label>
          <input
            id={`${radioId}-new`}
            type="radio"
            className="btn-check"
            value={"new"}
            checked={this.props.sort === "new"}
            onChange={e => handleCommentSortChange(this, e)}
          />
          <label
            htmlFor={`${radioId}-new`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "new",
            })}
          >
            {I18NextService.i18n.t("new")}
          </label>
          <input
            id={`${radioId}-old`}
            type="radio"
            className="btn-check"
            value={"old"}
            checked={this.props.sort === "old"}
            onChange={e => handleCommentSortChange(this, e)}
          />
          <label
            htmlFor={`${radioId}-old`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.sort === "old",
            })}
          >
            {I18NextService.i18n.t("old")}
          </label>
        </div>
        <div
          className="btn-group btn-group-toggle flex-wrap mb-2 me-3"
          role="group"
        >
          <input
            id={`${radioId}-chat`}
            type="radio"
            className="btn-check"
            value={"flat"}
            checked={this.props.view === "flat"}
            onChange={e => handleCommentViewTypeChange(this, e)}
          />
          <label
            htmlFor={`${radioId}-chat`}
            className={classNames("btn btn-outline-secondary pointer", {
              active: this.props.view === "flat",
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
    const myUserInfo = this.isoData.myUserInfo;

    if (commentsRes.state === "success" && postRes.state === "success") {
      return (
        <div>
          <CommentNodes
            nodes={sortedFlatNodes(
              commentsRes.data.items,
              postRes.data.post_view.post.creator_id,
              postRes.data.community_view.community,
              this.props.sort,
            )}
            showCommunity={false}
            postCreatorId={postRes.data.post_view.post.creator_id}
            community={postRes.data.community_view.community}
            viewType={this.props.view}
            maxCommentsShown={this.state.maxCommentsShown}
            isTopLevel
            postLockedOrRemovedOrDeleted={postLockedDeletedOrRemoved(
              postRes.data.post_view,
            )}
            createLoading={itemLoading(this.state.createCommentRes)}
            editLoading={itemLoading(this.state.editCommentRes)}
            admins={siteRes.admins}
            readCommentsAt={
              postRes.data.post_view.post_actions?.read_comments_at
            }
            showContext
            hideImages={false}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={myUserInfo}
            localSite={siteRes.site_view.local_site}
            onSaveComment={form => handleSaveComment(this, form)}
            onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
            onBlockCommunity={form =>
              handleBlockCommunity(this, form, myUserInfo)
            }
            onDeleteComment={form => handleDeleteComment(this, form)}
            onRemoveComment={form => handleRemoveComment(this, form)}
            onCommentVote={form => handleCommentVote(this, form)}
            onCommentReport={form => handleCommentReport(form)}
            onDistinguishComment={form => handleDistinguishComment(this, form)}
            onAddModToCommunity={form => handleAddModToCommunity(this, form)}
            onAddAdmin={form => handleAddAdmin(this, form)}
            onTransferCommunity={form => handleTransferCommunity(this, form)}
            onFetchChildren={form => handleFetchChildren(this, form)}
            onPurgeComment={form => handlePurgeComment(this, form)}
            onPurgePerson={form => handlePurgePerson(this, form)}
            onBanPersonFromCommunity={form =>
              handleBanFromCommunity(this, form)
            }
            onBanPerson={form => handleBanPerson(this, form)}
            onCreateComment={form => handleCreateComment(this, form)}
            onEditComment={form => handleEditComment(this, form)}
            onPersonNote={form => handlePersonNote(this, form)}
            onLockComment={form => handleLockComment(this, form)}
          />
        </div>
      );
    }
  }

  sidebar() {
    const res = this.state.postRes;
    const myUserInfo = this.isoData.myUserInfo;

    if (res.state === "success") {
      return (
        <CommunitySidebar
          communityView={res.data.community_view}
          moderators={[]} // TODO: fetch GetCommunityResponse?
          admins={this.state.siteRes.admins}
          enableNsfw={enableNsfw(this.state.siteRes)}
          showIcon
          allLanguages={this.state.siteRes.all_languages}
          siteLanguages={this.state.siteRes.discussion_languages}
          myUserInfo={this.isoData.myUserInfo}
          onFollow={form => handleFollow(this, form, myUserInfo)}
          onBlock={form => handleBlockCommunity(this, form, myUserInfo)}
          onEditNotifs={form => handleEditCommunityNotifs(form)}
          onRemove={form => handleModRemoveCommunity(this, form)}
          onPurge={form => handlePurgeCommunity(this, form)}
          removeLoading={this.state.removeCommunityRes.state === "loading"}
          purgeLoading={this.state.purgeCommunityRes.state === "loading"}
          followLoading={this.state.followCommunityRes.state === "loading"}
        />
      );
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
    const postRes = this.state.postRes;
    const commentsRes = this.state.commentsRes;
    const siteRes = this.state.siteRes;
    const myUserInfo = this.isoData.myUserInfo;
    const commentIdFromProps = getCommentIdFromProps(this.props);

    return (
      postRes.state === "success" &&
      commentsRes.state === "success" && (
        <div>
          {!!getCommentIdFromProps(this.props) && (
            <>
              <Link
                className="ps-0 d-block btn btn-link text-muted text-start"
                to={handleViewAllComments(this)}
                target={linkTarget(myUserInfo)}
              >
                {I18NextService.i18n.t("view_all_comments")} ➔
              </Link>
              {showContextButton(
                commentsRes.data.items,
                postRes.data.post_view.post.creator_id,
                postRes.data.community_view.community,
                commentIdFromProps,
              ) && (
                <Link
                  className="ps-0 d-block btn btn-link text-muted text-start"
                  to={handleViewContext(this)}
                  target={linkTarget(myUserInfo)}
                >
                  {I18NextService.i18n.t("show_context")} ➔
                </Link>
              )}
            </>
          )}
          <CommentNodes
            nodes={commentTree(
              commentsRes.data.items,
              postRes.data.post_view.post.creator_id,
              postRes.data.community_view.community,
              commentIdFromProps,
            )}
            showCommunity={false}
            postCreatorId={postRes.data.post_view.post.creator_id}
            community={postRes.data.community_view.community}
            viewType={this.props.view}
            maxCommentsShown={this.state.maxCommentsShown}
            postLockedOrRemovedOrDeleted={postLockedDeletedOrRemoved(
              postRes.data.post_view,
            )}
            createLoading={itemLoading(this.state.createCommentRes)}
            editLoading={itemLoading(this.state.editCommentRes)}
            admins={siteRes.admins}
            readCommentsAt={
              postRes.data.post_view.post_actions?.read_comments_at
            }
            showContext={false}
            hideImages={false}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={myUserInfo}
            localSite={siteRes.site_view.local_site}
            onSaveComment={form => handleSaveComment(this, form)}
            onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
            onBlockCommunity={form =>
              handleBlockCommunity(this, form, myUserInfo)
            }
            onDeleteComment={form => handleDeleteComment(this, form)}
            onRemoveComment={form => handleRemoveComment(this, form)}
            onCommentVote={form => handleCommentVote(this, form)}
            onCommentReport={form => handleCommentReport(form)}
            onDistinguishComment={form => handleDistinguishComment(this, form)}
            onAddModToCommunity={form => handleAddModToCommunity(this, form)}
            onAddAdmin={form => handleAddAdmin(this, form)}
            onTransferCommunity={form => handleTransferCommunity(this, form)}
            onFetchChildren={form => handleFetchChildren(this, form)}
            onPurgeComment={form => handlePurgeComment(this, form)}
            onPurgePerson={form => handlePurgePerson(this, form)}
            onBanPersonFromCommunity={form =>
              handleBanFromCommunity(this, form)
            }
            onBanPerson={form => handleBanPerson(this, form)}
            onCreateComment={form => handleCreateComment(this, form)}
            onEditComment={form => handleEditComment(this, form)}
            onPersonNote={form => handlePersonNote(this, form)}
            onLockComment={form => handleLockComment(this, form)}
          />
        </div>
      )
    );
  }

  updateBanFromCommunity(
    banRes: RequestState<PersonResponse>,
    banned: boolean,
  ) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (
          s.postRes.state === "success" &&
          s.postRes.data.post_view.creator.id ===
            banRes.data.person_view.person.id
        ) {
          const pv = s.postRes.data.post_view;
          pv.creator_banned_from_community = banned;
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.items
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => {
              c.creator_banned_from_community = banned;
            });
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<PersonResponse>, banned: boolean) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (
          s.postRes.state === "success" &&
          s.postRes.data.post_view.creator.id ===
            banRes.data.person_view.person.id
        ) {
          s.postRes.data.post_view.creator_banned = banned;
        }
        if (s.commentsRes.state === "success") {
          s.commentsRes.data.items
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator_banned = banned));
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
        const comments = s.commentsRes.data.items;
        const newComment = res.data.comment_view;
        const newCommentParentId = getCommentParentId(newComment.comment);

        const foundCommentParentIndex = comments.findIndex(
          c => c.comment.id === newCommentParentId,
        );

        comments.splice(foundCommentParentIndex + 1, 0, newComment);
      }
      return s;
    });
    if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }
  }

  findAndUpdateCommentEdit(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.items = editCommentSlim(
          res.data.comment_view,
          s.commentsRes.data.items,
        );
      }
      return s;
    });
    if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.commentsRes.state === "success" && res.state === "success") {
        s.commentsRes.data.items = editCommentSlim(
          res.data.comment_view,
          s.commentsRes.data.items,
        );
      }
      return s;
    });
    if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }
  }

  updateModerators(_: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    // TODO: update GetCommunityResponse?
  }
}

async function handleCommentSortChange(
  i: Post,
  event: FormEvent<HTMLInputElement>,
) {
  const sort = event.target.value as CommentSortType;
  const flattenable = sort === "new" || sort === "old";
  if (flattenable || i.props.view !== "flat") {
    i.updateUrl({ sort });
  } else {
    i.updateUrl({ sort, view: "tree" });
  }
}

function handleCommentViewTypeChange(
  i: Post,
  event: FormEvent<HTMLInputElement>,
) {
  const flattenable = i.props.sort === "new" || i.props.sort === "old";
  const view = event.target.value as CommentViewType;
  if (flattenable || view !== "flat") {
    i.updateUrl({ view });
  } else {
    i.updateUrl({ view, sort: "new" });
  }
}

function handleShowSidebarMobile(i: Post) {
  i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
}

function handleViewAllComments(i: Post): string {
  const id =
    getIdFromProps(i.props) ||
    (i.state.postRes.state === "success" &&
      i.state.postRes.data.post_view.post.id);
  if (id) {
    const location = i.buildUrl({
      match: { params: { post_id: id.toString() } },
    });
    return location.pathname + location.search;
  }
  return ".";
}

function handleViewContext(i: Post): string {
  if (i.state.commentsRes.state === "success") {
    const commentId = getCommentIdFromProps(i.props);
    const commentView = i.state.commentsRes.data.items.find(
      c => c.comment.id === commentId,
    );

    const parentId = getCommentParentId(commentView?.comment);
    const postId = commentView?.comment.post_id;

    if (parentId && postId) {
      const location = i.buildUrl({
        match: {
          params: {
            post_id: postId.toString(),
            comment_id: parentId.toString(),
          },
        },
      });
      return location.pathname + location.search;
    }
  }
  return ".";
}

async function handleAddModToCommunity(i: Post, form: AddModToCommunity) {
  i.setState({ addModToCommunityRes: LOADING_REQUEST });
  const addModToCommunityRes = await HttpService.client.addModToCommunity(form);

  i.setState({ addModToCommunityRes });

  i.updateModerators(addModToCommunityRes);
  if (addModToCommunityRes.state === "success") {
    toast(I18NextService.i18n.t(form.added ? "appointed_mod" : "removed_mod"));
  }
}

async function handleFollow(
  i: Post,
  form: FollowCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  i.setState({ followCommunityRes: LOADING_REQUEST });
  const followCommunityRes = await HttpService.client.followCommunity(form);
  i.setState({ followCommunityRes });

  i.updateCommunity(followCommunityRes);

  // Update myUserInfo
  if (followCommunityRes.state === "success") {
    const communityId = followCommunityRes.data.community_view.community.id;
    const mui = myUserInfo;
    if (mui) {
      mui.follows = mui.follows.filter(i => i.community.id !== communityId);
    }
  }
}

async function handlePurgeCommunity(i: Post, form: PurgeCommunity) {
  i.setState({ purgeCommunityRes: LOADING_REQUEST });
  const purgeCommunityRes = await HttpService.client.purgeCommunity(form);
  i.setState({ purgeCommunityRes });

  i.purgeItem(purgeCommunityRes);
}

async function handlePurgePerson(i: Post, form: PurgePerson) {
  const purgePersonRes = await HttpService.client.purgePerson(form);
  i.purgeItem(purgePersonRes);
}

async function handlePurgeComment(i: Post, form: PurgeComment) {
  const purgeCommentRes = await HttpService.client.purgeComment(form);
  i.purgeItem(purgeCommentRes);
}

async function handlePurgePost(i: Post, form: PurgePost) {
  const purgeRes = await HttpService.client.purgePost(form);
  i.purgeItem(purgeRes);
}

async function handleBlockCommunity(
  i: Post,
  form: BlockCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockCommunityRes = await HttpService.client.blockCommunity(form);
  if (blockCommunityRes.state === "success") {
    updateCommunityBlock(blockCommunityRes.data, form.block, myUserInfo);
    i.setState(s => {
      if (s.postRes.state === "success" && myUserInfo) {
        const pv = s.postRes.data.post_view;
        if (!pv.community_actions) {
          pv.community_actions = {};
        }
        pv.community_actions.blocked_at = nowBoolean(form.block);
      }
    });
  }
}

async function handleBlockPerson(
  form: BlockPerson,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockPersonRes = await HttpService.client.blockPerson(form);
  if (blockPersonRes.state === "success") {
    updatePersonBlock(blockPersonRes.data, form.block, myUserInfo);
  }
}

async function handleModRemoveCommunity(i: Post, form: RemoveCommunity) {
  i.setState({ removeCommunityRes: LOADING_REQUEST });
  const removeCommunityRes = await HttpService.client.removeCommunity(form);
  i.setState({ removeCommunityRes });
  i.updateCommunity(removeCommunityRes);
}

async function handleEditCommunityNotifs(form: EditCommunityNotifications) {
  const res = await HttpService.client.editCommunityNotifications(form);
  if (res.state === "success") {
    toast(I18NextService.i18n.t("notifications_updated"));
  }
}

async function handleCreateToplevelComment(i: Post, form: CreateComment) {
  const res = await handleCreateComment(i, form);
  if (res.state === "success") {
    i.setState({ lastCreatedCommentId: res.data.comment_view.comment.id });
  }
  return res;
}

async function handleCreateComment(i: Post, form: CreateComment) {
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res: LOADING_REQUEST,
    },
  });
  const res = await HttpService.client.createComment(form);
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res,
    },
  });
  i.createAndUpdateComments(res);

  return res;
}

async function handleEditComment(i: Post, form: EditComment) {
  i.setState({
    editCommentRes: { id: form.comment_id, res: LOADING_REQUEST },
  });

  const res = await HttpService.client.editComment(form);
  i.setState({
    editCommentRes: { id: form.comment_id, res },
  });

  i.findAndUpdateCommentEdit(res);

  return res;
}

async function handlePersonNote(i: Post, form: NotePerson) {
  const res = await HttpService.client.notePerson(form);

  if (res.state === "success") {
    i.setState(s => {
      if (s.commentsRes.state === "success") {
        s.commentsRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.commentsRes.data.items,
        );
      }
      if (s.postRes.state === "success") {
        s.postRes.data.post_view = editPersonNotes(form.note, form.person_id, [
          s.postRes.data.post_view,
        ])[0];
      }
      toast(I18NextService.i18n.t(form.note ? "note_created" : "note_deleted"));
      return s;
    });
  }
}

async function handleDeleteComment(i: Post, form: DeleteComment) {
  const deleteCommentRes = await HttpService.client.deleteComment(form);
  i.findAndUpdateComment(deleteCommentRes);
  if (deleteCommentRes.state === "success") {
    toast(
      I18NextService.i18n.t(
        form.deleted ? "deleted_comment" : "undeleted_comment",
      ),
    );
  }
}

async function handleDeletePost(i: Post, form: DeletePost) {
  const deleteRes = await HttpService.client.deletePost(form);
  i.updatePost(deleteRes);
  if (deleteRes.state === "success") {
    toast(
      I18NextService.i18n.t(form.deleted ? "deleted_post" : "undeleted_post"),
    );
  }
}

async function handleRemovePost(i: Post, form: RemovePost) {
  const removeRes = await HttpService.client.removePost(form);
  i.updatePost(removeRes);
  if (removeRes.state === "success") {
    toast(
      I18NextService.i18n.t(form.removed ? "removed_post" : "restored_post"),
    );
  }
}

async function handleRemoveComment(i: Post, form: RemoveComment) {
  const removeCommentRes = await HttpService.client.removeComment(form);
  i.findAndUpdateComment(removeCommentRes);
  if (removeCommentRes.state === "success") {
    toast(
      I18NextService.i18n.t(
        form.removed ? "removed_comment" : "restored_comment",
      ),
    );
  }
}

async function handleLockComment(i: Post, form: LockComment) {
  const res = await HttpService.client.lockComment(form);

  i.setState(s => {
    if (res.state === "success" && s.commentsRes.state === "success") {
      s.commentsRes.data.items = editCommentsSlimLocked(
        res.data.comment_view.comment.path,
        form.locked,
        s.commentsRes.data.items,
      );
      toast(I18NextService.i18n.t(form.locked ? "locked" : "unlocked"));
    }
    return s;
  });
}

async function handleSaveComment(i: Post, form: SaveComment) {
  const saveCommentRes = await HttpService.client.saveComment(form);
  i.findAndUpdateComment(saveCommentRes);
}

async function handleSavePost(i: Post, form: SavePost) {
  const saveRes = await HttpService.client.savePost(form);
  i.updatePost(saveRes);
}

async function handleFeaturePost(i: Post, form: FeaturePost) {
  const featureRes = await HttpService.client.featurePost(form);
  i.updatePost(featureRes);
  if (featureRes.state === "success") {
    toast(
      I18NextService.i18n.t(
        form.featured ? "featured_post" : "unfeatured_post",
      ),
    );
  }
}

async function handleCommentVote(i: Post, form: CreateCommentLike) {
  const voteRes = await HttpService.client.likeComment(form);
  i.findAndUpdateComment(voteRes);
}

async function handlePostVote(i: Post, form: CreatePostLike) {
  const voteRes = await HttpService.client.likePost(form);
  i.updatePost(voteRes);
  return voteRes;
}

async function handlePostEdit(i: Post, form: EditPost) {
  i.setState({ editLoading: true });
  const res = await HttpService.client.editPost(form);
  i.updatePost(res);
  if (res.state === "success") {
    toast(I18NextService.i18n.t("edited_post"));
  }
  i.setState({ editLoading: false });
  return res;
}

async function handleCommentReport(form: CreateCommentReport) {
  const reportRes = await HttpService.client.createCommentReport(form);
  reportToast(reportRes);
}

async function handlePostReport(form: CreatePostReport) {
  const reportRes = await HttpService.client.createPostReport(form);
  reportToast(reportRes);
}

async function handleLockPost(i: Post, form: LockPost) {
  const lockRes = await HttpService.client.lockPost(form);
  i.updatePost(lockRes);
  if (lockRes.state === "success") {
    toast(I18NextService.i18n.t(form.locked ? "locked_post" : "unlocked_post"));
  }
}

async function handleDistinguishComment(i: Post, form: DistinguishComment) {
  const distinguishRes = await HttpService.client.distinguishComment(form);
  i.findAndUpdateComment(distinguishRes);
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

async function handleAddAdmin(i: Post, form: AddAdmin) {
  const addAdminRes = await HttpService.client.addAdmin(form);

  if (addAdminRes.state === "success") {
    i.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    toast(
      I18NextService.i18n.t(form.added ? "appointed_admin" : "removed_admin"),
    );
  }
}

async function handleTransferCommunity(i: Post, form: TransferCommunity) {
  const transferCommunityRes = await HttpService.client.transferCommunity(form);
  i.updateCommunityFull(transferCommunityRes);
  if (transferCommunityRes.state === "success") {
    toast(I18NextService.i18n.t("transfered_community"));
  }
}

async function handleFetchChildren(i: Post, form: GetComments) {
  const moreCommentsRes = await HttpService.client.getCommentsSlim(form);
  if (
    i.state.commentsRes.state === "success" &&
    moreCommentsRes.state === "success"
  ) {
    const newComments = moreCommentsRes.data.items;
    // Remove the first comment, since it is the parent
    newComments.shift();
    const newRes = i.state.commentsRes;
    newRes.data.items.push(...newComments);
    i.setState({ commentsRes: newRes });
  }
}

async function handleMarkPostAsRead(
  i: Post,
  form: MarkPostAsRead,
  myUserInfo: MyUserInfo | undefined,
) {
  const res = await HttpService.client.markPostAsRead(form);
  if (res.state === "success") {
    i.setState(s => {
      if (s.postRes.state === "success" && myUserInfo) {
        const pv = s.postRes.data.post_view;
        if (!pv.post_actions) {
          pv.post_actions = {};
        }
        pv.post_actions.read_at = nowBoolean(form.read);
      }
      return { postRes: s.postRes };
    });
  }
}

async function handleBanFromCommunity(i: Post, form: BanFromCommunity) {
  const banRes = await HttpService.client.banFromCommunity(form);
  i.updateBanFromCommunity(banRes, form.ban);
  if (banRes.state === "success" && i.state.postRes.state === "success") {
    toast(
      I18NextService.i18n.t(
        form.ban ? "banned_from_community" : "unbanned_from_community",
        {
          user: getApubName(banRes.data.person_view.person),
          community: getApubName(i.state.postRes.data.post_view.community),
        },
      ),
    );
  }
}

async function handleBanPerson(i: Post, form: BanPerson) {
  const banRes = await HttpService.client.banPerson(form);
  i.updateBan(banRes, form.ban);
  if (banRes.state === "success" && i.state.postRes.state === "success") {
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

async function handleHidePost(
  i: Post,
  form: HidePost,
  myUserInfo: MyUserInfo | undefined,
) {
  const hideRes = await HttpService.client.hidePost(form);

  if (hideRes.state === "success") {
    i.setState(s => {
      if (s.postRes.state === "success" && myUserInfo) {
        const pv = s.postRes.data.post_view;
        if (!pv.post_actions) {
          pv.post_actions = {};
        }
        pv.post_actions.hidden_at = nowBoolean(form.hide);
      }

      return s;
    });

    toast(I18NextService.i18n.t(form.hide ? "post_hidden" : "post_unhidden"));
  }
}

async function handleNotificationChange(i: Post, val: PostNotificationsMode) {
  if (i.state.postRes.state === "success") {
    const form = {
      post_id: i.state.postRes.data.post_view.post.id,
      mode: val,
    };
    i.setState({ notifications: form.mode });
    const res = await HttpService.client.editPostNotifications(form);
    if (res.state === "success") {
      toast(I18NextService.i18n.t("notifications_updated"));
    }
  }
}

function handleScrollIntoCommentsClick(i: Post, e: MouseEvent) {
  i.scrollIntoCommentSection();
  e.preventDefault();
}

function postLockedDeletedOrRemoved(post_view: PostView): boolean {
  return (
    post_view.post.locked || post_view.post.deleted || post_view.post.removed
  );
}

function commentsSlimToFlatNodes(
  comments: CommentSlimView[],
  postCreatorId: PersonId,
  community: Community,
): CommentNodeType[] {
  return comments.map(c => {
    return {
      view: { comment_view: c, children: [], depth: 0 },
      postCreatorId,
      community,
    };
  });
}

function sortedFlatNodes(
  comments: CommentSlimView[],
  postCreatorId: PersonId,
  community: Community,
  sort: CommentSortType,
): CommentNodeType[] {
  const nodeToDate = (node: CommentNodeType) =>
    node.view.comment_view.comment.published_at;
  const nodes = commentsSlimToFlatNodes(comments, postCreatorId, community);
  if (sort === "new") {
    return nodes.sort((a, b) => compareDesc(nodeToDate(a), nodeToDate(b)));
  } else {
    return nodes.sort((a, b) => compareAsc(nodeToDate(a), nodeToDate(b)));
  }
}

function commentTree(
  comments: CommentSlimView[],
  postCreatorId: PersonId,
  community: Community,
  commentIdFromProps: CommentId | undefined,
): CommentNodeType[] {
  if (comments.length) {
    const tree = buildCommentsTree(comments, commentIdFromProps);
    const treeNodes: CommentNodeType[] = tree.map(v => {
      return { view: v, postCreatorId, community };
    });
    return treeNodes;
  } else {
    return [];
  }
}

function showContextButton(
  comments: CommentSlimView[],
  postCreatorId: PersonId,
  community: Community,
  commentIdFromProps: CommentId | undefined,
): boolean {
  const firstComment = commentTree(
    comments,
    postCreatorId,
    community,
    commentIdFromProps,
  ).at(0)?.view.comment_view.comment;
  const depth = getDepthFromComment(firstComment);
  return depth ? depth > 0 : false;
}
