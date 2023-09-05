import {
  commentsToFlatNodes,
  communityRSSUrl,
  editComment,
  editPost,
  editWith,
  enableDownvotes,
  enableNsfw,
  getCommentParentId,
  getDataTypeString,
  myAuth,
  postToCommentSortType,
  setIsoData,
  showLocal,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import {
  getPageFromString,
  getQueryParams,
  getQueryString,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component, RefObject, createRef, linkEvent } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
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
  GetCommunity,
  GetCommunityResponse,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  MarkPostAsRead,
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
  SortType,
  TransferCommunity,
} from "lemmy-js-client";
import { fetchLimit, relTags } from "../../config";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { FirstLoadService, I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { setupTippy } from "../../tippy";
import { toast } from "../../toast";
import { CommentNodes } from "../comment/comment-nodes";
import { BannerIconHeader } from "../common/banner-icon-header";
import { DataTypeSelect } from "../common/data-type-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { SortSelect } from "../common/sort-select";
import { Sidebar } from "../community/sidebar";
import { SiteSidebar } from "../home/site-sidebar";
import { PostListings } from "../post/post-listings";
import { CommunityLink } from "./community-link";

type CommunityData = RouteDataResponse<{
  communityRes: GetCommunityResponse;
  postsRes: GetPostsResponse;
  commentsRes: GetCommentsResponse;
}>;

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  postsRes: RequestState<GetPostsResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
  finished: Map<CommentId, boolean | undefined>;
  isIsomorphic: boolean;
}

interface CommunityProps {
  dataType: DataType;
  sort: SortType;
  page: number;
}

function getCommunityQueryParams() {
  return getQueryParams<CommunityProps>({
    dataType: getDataTypeFromQuery,
    page: getPageFromString,
    sort: getSortTypeFromQuery,
  });
}

function getDataTypeFromQuery(type?: string): DataType {
  return type ? DataType[type] : DataType.Post;
}

function getSortTypeFromQuery(type?: string): SortType {
  const mySortType =
    UserService.Instance.myUserInfo?.local_user_view.local_user
      .default_sort_type;

  return type ? (type as SortType) : mySortType ?? "Active";
}

export class Community extends Component<
  RouteComponentProps<{ name: string }>,
  State
> {
  private isoData = setIsoData<CommunityData>(this.context);
  state: State = {
    communityRes: { state: "empty" },
    postsRes: { state: "empty" },
    commentsRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
    finished: new Map(),
    isIsomorphic: false,
  };
  private readonly mainContentRef: RefObject<HTMLElement>;
  constructor(props: RouteComponentProps<{ name: string }>, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    // All of the action binds
    this.handleDeleteCommunity = this.handleDeleteCommunity.bind(this);
    this.handleEditCommunity = this.handleEditCommunity.bind(this);
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
    this.handleCommentReplyRead = this.handleCommentReplyRead.bind(this);
    this.handlePersonMentionRead = this.handlePersonMentionRead.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePost = this.handleFeaturePost.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.mainContentRef = createRef();
    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { communityRes, commentsRes, postsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
        commentsRes,
        communityRes,
        postsRes,
      };
    }
  }

  async fetchCommunity() {
    this.setState({ communityRes: { state: "loading" } });
    this.setState({
      communityRes: await HttpService.client.getCommunity({
        name: this.props.match.params.name,
        auth: myAuth(),
      }),
    });
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await Promise.all([this.fetchCommunity(), this.fetchData()]);
    }

    setupTippy();
  }

  static async fetchInitialData({
    client,
    path,
    query: { dataType: urlDataType, page: urlPage, sort: urlSort },
    auth,
  }: InitialFetchRequest<QueryParams<CommunityProps>>): Promise<
    Promise<CommunityData>
  > {
    const pathSplit = path.split("/");

    const communityName = pathSplit[2];
    const communityForm: GetCommunity = {
      name: communityName,
      auth,
    };

    const dataType = getDataTypeFromQuery(urlDataType);

    const sort = getSortTypeFromQuery(urlSort);

    const page = getPageFromString(urlPage);

    let postsResponse: RequestState<GetPostsResponse> = { state: "empty" };
    let commentsResponse: RequestState<GetCommentsResponse> = {
      state: "empty",
    };

    if (dataType === DataType.Post) {
      const getPostsForm: GetPosts = {
        community_name: communityName,
        page,
        limit: fetchLimit,
        sort,
        type_: "All",
        saved_only: false,
        auth,
      };

      postsResponse = await client.getPosts(getPostsForm);
    } else {
      const getCommentsForm: GetComments = {
        community_name: communityName,
        page,
        limit: fetchLimit,
        sort: postToCommentSortType(sort),
        type_: "All",
        saved_only: false,
        auth,
      };

      commentsResponse = await client.getComments(getCommentsForm);
    }

    return {
      communityRes: await client.getCommunity(communityForm),
      commentsRes: commentsResponse,
      postsRes: postsResponse,
    };
  }

  get documentTitle(): string {
    const cRes = this.state.communityRes;
    return cRes.state === "success"
      ? `${cRes.data.community_view.community.title} - ${this.isoData.site_res.site_view.site.name}`
      : "";
  }

  renderCommunity() {
    switch (this.state.communityRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const res = this.state.communityRes.data;
        const { page } = getCommunityQueryParams();

        return (
          <>
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
              canonicalPath={res.community_view.community.actor_id}
              description={res.community_view.community.description}
              image={res.community_view.community.icon}
            />

            <div className="row">
              <main
                className="col-12 col-md-8 col-lg-9"
                ref={this.mainContentRef}
              >
                {this.communityInfo(res)}
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
                  {this.state.showSidebarMobile && this.sidebar(res)}
                </div>
                {this.selects(res)}
                {this.listings(res)}
                <Paginator
                  page={page}
                  onChange={this.handlePageChange}
                  nextDisabled={
                    this.state.postsRes.state !== "success" ||
                    fetchLimit > this.state.postsRes.data.posts.length
                  }
                />
              </main>
              <aside className="d-none d-md-block col-md-4 col-lg-3">
                {this.sidebar(res)}
              </aside>
            </div>
          </>
        );
      }
    }
  }

  render() {
    return (
      <div className="community container-lg">{this.renderCommunity()}</div>
    );
  }

  sidebar(res: GetCommunityResponse) {
    const { site_res } = this.isoData;
    // For some reason, this returns an empty vec if it matches the site langs
    const communityLangs =
      res.discussion_languages.length === 0
        ? site_res.all_languages.map(({ id }) => id)
        : res.discussion_languages;

    return (
      <>
        <Sidebar
          community_view={res.community_view}
          moderators={res.moderators}
          admins={site_res.admins}
          enableNsfw={enableNsfw(site_res)}
          editable
          allLanguages={site_res.all_languages}
          siteLanguages={site_res.discussion_languages}
          communityLanguages={communityLangs}
          onDeleteCommunity={this.handleDeleteCommunity}
          onRemoveCommunity={this.handleRemoveCommunity}
          onLeaveModTeam={this.handleAddModToCommunity}
          onFollowCommunity={this.handleFollow}
          onBlockCommunity={this.handleBlockCommunity}
          onPurgeCommunity={this.handlePurgeCommunity}
          onEditCommunity={this.handleEditCommunity}
        />
        {!res.community_view.community.local && res.site && (
          <SiteSidebar site={res.site} showLocal={showLocal(this.isoData)} />
        )}
      </>
    );
  }

  listings(communityRes: GetCommunityResponse) {
    const { dataType } = getCommunityQueryParams();
    const { site_res } = this.isoData;

    if (dataType === DataType.Post) {
      switch (this.state.postsRes.state) {
        case "loading":
          return (
            <h5>
              <Spinner large />
            </h5>
          );
        case "success":
          return (
            <PostListings
              posts={this.state.postsRes.data.posts}
              removeDuplicates
              enableDownvotes={enableDownvotes(site_res)}
              enableNsfw={enableNsfw(site_res)}
              allLanguages={site_res.all_languages}
              siteLanguages={site_res.discussion_languages}
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
              onMarkPostAsRead={this.handleMarkPostAsRead}
            />
          );
      }
    } else {
      switch (this.state.commentsRes.state) {
        case "loading":
          return (
            <h5>
              <Spinner large />
            </h5>
          );
        case "success":
          return (
            <CommentNodes
              nodes={commentsToFlatNodes(this.state.commentsRes.data.comments)}
              viewType={CommentViewType.Flat}
              finished={this.state.finished}
              isTopLevel
              showContext
              enableDownvotes={enableDownvotes(site_res)}
              moderators={communityRes.moderators}
              admins={site_res.admins}
              allLanguages={site_res.all_languages}
              siteLanguages={site_res.discussion_languages}
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
              onPurgeComment={this.handlePurgeComment}
              onPurgePerson={this.handlePurgePerson}
              onCommentReplyRead={this.handleCommentReplyRead}
              onPersonMentionRead={this.handlePersonMentionRead}
              onBanPersonFromCommunity={this.handleBanFromCommunity}
              onBanPerson={this.handleBanPerson}
              onCreateComment={this.handleCreateComment}
              onEditComment={this.handleEditComment}
            />
          );
      }
    }
  }

  communityInfo(res: GetCommunityResponse) {
    const community = res.community_view.community;

    return (
      community && (
        <div className="mb-2">
          <BannerIconHeader banner={community.banner} icon={community.icon} />
          <h1 className="h4 mb-0 overflow-wrap-anywhere">{community.title}</h1>
          <CommunityLink
            community={community}
            realLink
            useApubName
            muted
            hideAvatar
          />
        </div>
      )
    );
  }

  selects(res: GetCommunityResponse) {
    // let communityRss = this.state.communityRes.map(r =>
    //   communityRSSUrl(r.community_view.community.actor_id, this.state.sort)
    // );
    const { dataType, sort } = getCommunityQueryParams();
    const communityRss = res
      ? communityRSSUrl(res.community_view.community.actor_id, sort)
      : undefined;

    return (
      <div className="mb-3">
        <span className="me-3">
          <DataTypeSelect
            type_={dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span className="me-2">
          <SortSelect sort={sort} onChange={this.handleSortChange} />
        </span>
        {communityRss && (
          <>
            <a href={communityRss} title="RSS" rel={relTags}>
              <Icon icon="rss" classes="text-muted small" />
            </a>
            <link
              rel="alternate"
              type="application/atom+xml"
              href={communityRss}
            />
          </>
        )}
      </div>
    );
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
    window.scrollTo(0, 0);
  }

  handleSortChange(sort: SortType) {
    this.updateUrl({ sort, page: 1 });
    window.scrollTo(0, 0);
  }

  handleDataTypeChange(dataType: DataType) {
    this.updateUrl({ dataType, page: 1 });
    window.scrollTo(0, 0);
  }

  handleShowSidebarMobile(i: Community) {
    i.setState(({ showSidebarMobile }) => ({
      showSidebarMobile: !showSidebarMobile,
    }));
  }

  async updateUrl({ dataType, page, sort }: Partial<CommunityProps>) {
    const {
      dataType: urlDataType,
      page: urlPage,
      sort: urlSort,
    } = getCommunityQueryParams();

    const queryParams: QueryParams<CommunityProps> = {
      dataType: getDataTypeString(dataType ?? urlDataType),
      page: (page ?? urlPage).toString(),
      sort: sort ?? urlSort,
    };

    this.props.history.push(
      `/c/${this.props.match.params.name}${getQueryString(queryParams)}`,
    );

    await this.fetchData();
  }

  async fetchData() {
    const { dataType, page, sort } = getCommunityQueryParams();
    const { name } = this.props.match.params;

    if (dataType === DataType.Post) {
      this.setState({ postsRes: { state: "loading" } });
      this.setState({
        postsRes: await HttpService.client.getPosts({
          page,
          limit: fetchLimit,
          sort,
          type_: "All",
          community_name: name,
          saved_only: false,
          auth: myAuth(),
        }),
      });
    } else {
      this.setState({ commentsRes: { state: "loading" } });
      this.setState({
        commentsRes: await HttpService.client.getComments({
          page,
          limit: fetchLimit,
          sort: postToCommentSortType(sort),
          type_: "All",
          community_name: name,
          saved_only: false,
          auth: myAuth(),
        }),
      });
    }

    setupTippy();
  }

  async handleDeleteCommunity(form: DeleteCommunity) {
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
        if (s.communityRes.state === "success") {
          s.communityRes.data.community_view.blocked =
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

  async handleRemoveCommunity(form: RemoveCommunity) {
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
    this.findAndUpdatePost(deleteRes);
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = await HttpService.client.removePost(form);
    this.findAndUpdatePost(removeRes);
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
    this.findAndUpdatePost(saveRes);
  }

  async handleFeaturePost(form: FeaturePost) {
    const featureRes = await HttpService.client.featurePost(form);
    this.findAndUpdatePost(featureRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(voteRes);
  }

  async handlePostEdit(form: EditPost) {
    const res = await HttpService.client.editPost(form);
    this.findAndUpdatePost(res);
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = await HttpService.client.likePost(form);
    this.findAndUpdatePost(voteRes);
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
    this.findAndUpdatePost(lockRes);
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
    toast(I18NextService.i18n.t("transfer_community"));
    this.updateCommunityFull(transferCommunityRes);
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    const readRes = await HttpService.client.markCommentReplyAsRead(form);
    this.findAndUpdateCommentReply(readRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    await HttpService.client.markPersonMentionAsRead(form);
  }

  async handleMarkPostAsRead(form: MarkPostAsRead) {
    const res = await HttpService.client.markPostAsRead(form);
    this.findAndUpdatePost(res);
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned),
            );
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
        if (s.postsRes.state === "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id === banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
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

  updateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.discussion_languages =
          res.data.discussion_languages;
      }
      return s;
    });
  }

  updateCommunityFull(res: RequestState<GetCommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.moderators = res.data.moderators;
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

  findAndUpdatePost(res: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postsRes.state === "success" && res.state === "success") {
        s.postsRes.data.posts = editPost(
          res.data.post_view,
          s.postsRes.data.posts,
        );
      }
      return s;
    });
  }

  updateModerators(res: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    this.setState(s => {
      if (s.communityRes.state === "success" && res.state === "success") {
        s.communityRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }
}
