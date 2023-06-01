import { Component, linkEvent } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
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
  GetCommunity,
  GetCommunityResponse,
  GetPosts,
  GetPostsResponse,
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
  SortType,
  TransferCommunity,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService } from "../../services";
import {
  HttpService,
  RequestState,
  apiWrapper,
  apiWrapperIso,
} from "../../services/HttpService";
import {
  QueryParams,
  commentsToFlatNodes,
  communityRSSUrl,
  editCommentWithCommentReplies,
  editComments,
  editPosts,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  getDataTypeString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  isInitialRoute,
  myAuth,
  postToCommentSortType,
  relTags,
  restoreScrollPosition,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  showLocal,
  toast,
  updateCommunityBlock,
  updatePersonBlock,
} from "../../utils";
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

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  postsRes: RequestState<GetPostsResponse>;
  commentsRes: RequestState<GetCommentsResponse>;

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

  siteRes: GetSiteResponse;
  showSidebarMobile: boolean;
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
  private isoData = setIsoData(this.context);
  state: State = {
    communityRes: { state: "empty" },
    postsRes: { state: "empty" },
    commentsRes: { state: "empty" },
    editCommunityRes: { state: "empty" },
    deleteCommunityRes: { state: "empty" },
    removeCommunityRes: { state: "empty" },
    followRes: { state: "empty" },
    addModRes: { state: "empty" },
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
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
  };

  constructor(props: RouteComponentProps<{ name: string }>, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    // All of the action binds
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

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        communityRes: apiWrapperIso(
          this.isoData.routeData[0] as GetCommunityResponse
        ),
      };
      const postsRes = this.isoData.routeData[1] as
        | GetPostsResponse
        | undefined;
      const commentsRes = this.isoData.routeData[2] as
        | GetCommentsResponse
        | undefined;

      if (postsRes) {
        this.state = { ...this.state, postsRes: apiWrapperIso(postsRes) };
      }

      if (commentsRes) {
        this.state = {
          ...this.state,
          commentsRes: apiWrapperIso(commentsRes),
        };
      }
    }
  }

  async fetchCommunity() {
    this.setState({ communityRes: { state: "loading" } });
    this.setState({
      communityRes: await apiWrapper(
        HttpService.client.getCommunity({
          name: this.props.match.params.name,
          auth: myAuth(),
        })
      ),
    });
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.fetchCommunity();
      await this.fetchData();
    }
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
  }

  static fetchInitialData({
    client,
    path,
    query: { dataType: urlDataType, page: urlPage, sort: urlSort },
    auth,
  }: InitialFetchRequest<QueryParams<CommunityProps>>): Promise<any>[] {
    const pathSplit = path.split("/");
    const promises: Promise<any>[] = [];

    const communityName = pathSplit[2];
    const communityForm: GetCommunity = {
      name: communityName,
      auth,
    };
    promises.push(client.getCommunity(communityForm));

    const dataType = getDataTypeFromQuery(urlDataType);

    const sort = getSortTypeFromQuery(urlSort);

    const page = getPageFromString(urlPage);

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
      promises.push(client.getPosts(getPostsForm));
      promises.push(Promise.resolve());
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
      promises.push(Promise.resolve());
      promises.push(client.getComments(getCommentsForm));
    }

    return promises;
  }

  get documentTitle(): string {
    const cRes = this.state.communityRes;
    return cRes.state == "success"
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
              description={res.community_view.community.description}
              image={res.community_view.community.icon}
            />

            <div className="row">
              <div className="col-12 col-md-8">
                {this.communityInfo(res)}
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
                  {this.state.showSidebarMobile && this.sidebar(res)}
                </div>
                {this.selects(res)}
                {this.listings(res)}
                <Paginator page={page} onChange={this.handlePageChange} />
              </div>
              <div className="d-none d-md-block col-md-4">
                {this.sidebar(res)}
              </div>
            </div>
          </>
        );
      }
    }
  }

  render() {
    return <div className="container-lg">{this.renderCommunity()}</div>;
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
          online={res.online}
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
          editCommunityLoading={this.state.editCommunityRes.state == "loading"}
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
              noIndent
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
          <h5 className="mb-0 overflow-wrap-anywhere">{community.title}</h5>
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
        <span className="mr-3">
          <DataTypeSelect
            type_={dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span className="mr-2">
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
      `/c/${this.props.match.params.name}${getQueryString(queryParams)}`
    );

    await this.fetchData();
  }

  async fetchData() {
    const { dataType, page, sort } = getCommunityQueryParams();
    const { name } = this.props.match.params;

    if (dataType === DataType.Post) {
      this.setState({ postsRes: { state: "loading" } });
      this.setState({
        postsRes: await apiWrapper(
          HttpService.client.getPosts({
            page,
            limit: fetchLimit,
            sort,
            type_: "All",
            community_name: name,
            saved_only: false,
            auth: myAuth(),
          })
        ),
      });
    } else {
      this.setState({ commentsRes: { state: "loading" } });
      this.setState({
        commentsRes: await apiWrapper(
          HttpService.client.getComments({
            page,
            limit: fetchLimit,
            sort: postToCommentSortType(sort),
            type_: "All",
            community_name: name,
            saved_only: false,
            auth: myAuth(),
          })
        ),
      });
    }

    restoreScrollPosition(this.context);
    setupTippy();
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
    this.findAndUpdatePost(deletePostRes);
  }

  async handleRemovePost(form: RemovePost) {
    this.setState({ removePostRes: { state: "loading" } });
    const removePostRes = await apiWrapper(HttpService.client.removePost(form));
    this.setState({ removePostRes });
    this.findAndUpdatePost(removePostRes);
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
    this.findAndUpdatePost(savePostRes);
  }

  async handleFeaturePostLocal(form: FeaturePost) {
    this.setState({ featurePostLocalRes: { state: "loading" } });
    const featurePostLocalRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostLocalRes });
    this.findAndUpdatePost(featurePostLocalRes);
  }

  async handleFeaturePostCommunity(form: FeaturePost) {
    this.setState({ featurePostCommunityRes: { state: "loading" } });
    const featurePostCommunityRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostCommunityRes });
    this.findAndUpdatePost(featurePostCommunityRes);
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
    this.findAndUpdatePost(votePostRes);
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

    this.findAndUpdatePost(lockPostRes);
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

  async handleTransferCommunity(form: TransferCommunity) {
    this.setState({ transferCommunityRes: { state: "loading" } });
    const transferCommunityRes = await apiWrapper(
      HttpService.client.transferCommunity(form)
    );
    this.setState({ transferCommunityRes });
    toast(i18n.t("transfer_community"));
    this.updateCommunityFull(transferCommunityRes);
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

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.postsRes.state == "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
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
        if (s.postsRes.state == "success") {
          s.postsRes.data.posts
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
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

  updateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state == "success" && res.state == "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.discussion_languages =
          res.data.discussion_languages;
      }
      return s;
    });
  }

  updateCommunityFull(res: RequestState<GetCommunityResponse>) {
    this.setState(s => {
      if (s.communityRes.state == "success" && res.state == "success") {
        s.communityRes.data.community_view = res.data.community_view;
        s.communityRes.data.moderators = res.data.moderators;
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

  findAndUpdatePost(res: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.postsRes.state == "success" && res.state == "success") {
        s.postsRes.data.posts = editPosts(
          res.data.post_view,
          s.postsRes.data.posts
        );
      }
      return s;
    });
  }

  updateModerators(res: RequestState<AddModToCommunityResponse>) {
    // Update the moderators
    this.setState(s => {
      if (s.communityRes.state == "success" && res.state == "success") {
        s.communityRes.data.moderators = res.data.moderators;
      }
      return s;
    });
  }
}
