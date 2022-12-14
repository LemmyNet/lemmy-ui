import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  BlockCommunityResponse,
  BlockPersonResponse,
  CommentReportResponse,
  CommentResponse,
  CommentView,
  CommunityResponse,
  GetComments,
  GetCommentsResponse,
  GetCommunity,
  GetCommunityResponse,
  GetPosts,
  GetPostsResponse,
  GetSiteResponse,
  ListingType,
  PostReportResponse,
  PostResponse,
  PostView,
  PurgeItemResponse,
  SortType,
  toOption,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  commentsToFlatNodes,
  communityRSSUrl,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  getDataTypeFromProps,
  getPageFromProps,
  getSortTypeFromProps,
  isPostBlocked,
  notifyPost,
  nsfwCheck,
  postToCommentSortType,
  relTags,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  showLocal,
  toast,
  updateCommunityBlock,
  updatePersonBlock,
  wsClient,
  wsSubscribe,
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
  communityRes: Option<GetCommunityResponse>;
  siteRes: GetSiteResponse;
  communityName: string;
  communityLoading: boolean;
  postsLoading: boolean;
  commentsLoading: boolean;
  posts: PostView[];
  comments: CommentView[];
  dataType: DataType;
  sort: SortType;
  page: number;
  showSidebarMobile: boolean;
}

interface CommunityProps {
  dataType: DataType;
  sort: SortType;
  page: number;
}

interface UrlParams {
  dataType?: string;
  sort?: SortType;
  page?: number;
}

export class Community extends Component<any, State> {
  private isoData = setIsoData(
    this.context,
    GetCommunityResponse,
    GetPostsResponse,
    GetCommentsResponse
  );
  private subscription: Subscription;
  private emptyState: State = {
    communityRes: None,
    communityName: this.props.match.params.name,
    communityLoading: true,
    postsLoading: true,
    commentsLoading: true,
    posts: [],
    comments: [],
    dataType: getDataTypeFromProps(this.props),
    sort: getSortTypeFromProps(this.props),
    page: getPageFromProps(this.props),
    siteRes: this.isoData.site_res,
    showSidebarMobile: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        communityRes: Some(this.isoData.routeData[0] as GetCommunityResponse),
      };
      let postsRes = Some(this.isoData.routeData[1] as GetPostsResponse);
      let commentsRes = Some(this.isoData.routeData[2] as GetCommentsResponse);

      if (postsRes.isSome()) {
        this.state = { ...this.state, posts: postsRes.unwrap().posts };
      }

      if (commentsRes.isSome()) {
        this.state = { ...this.state, comments: commentsRes.unwrap().comments };
      }

      this.state = {
        ...this.state,
        communityLoading: false,
        postsLoading: false,
        commentsLoading: false,
      };
    } else {
      this.fetchCommunity();
      this.fetchData();
    }
  }

  fetchCommunity() {
    let form = new GetCommunity({
      name: Some(this.state.communityName),
      id: None,
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(wsClient.getCommunity(form));
  }

  componentDidMount() {
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
    this.subscription.unsubscribe();
  }

  static getDerivedStateFromProps(props: any): CommunityProps {
    return {
      dataType: getDataTypeFromProps(props),
      sort: getSortTypeFromProps(props),
      page: getPageFromProps(props),
    };
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let communityName = pathSplit[2];
    let communityForm = new GetCommunity({
      name: Some(communityName),
      id: None,
      auth: req.auth,
    });
    promises.push(req.client.getCommunity(communityForm));

    let dataType: DataType = pathSplit[4]
      ? DataType[pathSplit[4]]
      : DataType.Post;

    let sort: Option<SortType> = toOption(
      pathSplit[6]
        ? SortType[pathSplit[6]]
        : UserService.Instance.myUserInfo.match({
            some: mui =>
              Object.values(SortType)[
                mui.local_user_view.local_user.default_sort_type
              ],
            none: SortType.Active,
          })
    );

    let page = toOption(pathSplit[8] ? Number(pathSplit[8]) : 1);

    if (dataType == DataType.Post) {
      let getPostsForm = new GetPosts({
        community_name: Some(communityName),
        community_id: None,
        page,
        limit: Some(fetchLimit),
        sort,
        type_: Some(ListingType.All),
        saved_only: Some(false),
        auth: req.auth,
      });
      promises.push(req.client.getPosts(getPostsForm));
      promises.push(Promise.resolve());
    } else {
      let getCommentsForm = new GetComments({
        community_name: Some(communityName),
        community_id: None,
        page,
        limit: Some(fetchLimit),
        max_depth: None,
        sort: sort.map(postToCommentSortType),
        type_: Some(ListingType.All),
        saved_only: Some(false),
        post_id: None,
        parent_id: None,
        auth: req.auth,
      });
      promises.push(Promise.resolve());
      promises.push(req.client.getComments(getCommentsForm));
    }

    return promises;
  }

  componentDidUpdate(_: any, lastState: State) {
    if (
      lastState.dataType !== this.state.dataType ||
      lastState.sort !== this.state.sort ||
      lastState.page !== this.state.page
    ) {
      this.setState({ postsLoading: true, commentsLoading: true });
      this.fetchData();
    }
  }

  get documentTitle(): string {
    return this.state.communityRes.match({
      some: res =>
        `${res.community_view.community.title} - ${this.state.siteRes.site_view.site.name}`,
      none: "",
    });
  }

  render() {
    // For some reason, this returns an empty vec if it matches the site langs
    let communityLangs = this.state.communityRes.map(r => {
      let langs = r.discussion_languages;
      if (langs.length == 0) {
        return this.state.siteRes.all_languages.map(l => l.id);
      } else {
        return langs;
      }
    });

    return (
      <div className="container-lg">
        {this.state.communityLoading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          this.state.communityRes.match({
            some: res => (
              <>
                <HtmlTags
                  title={this.documentTitle}
                  path={this.context.router.route.match.url}
                  description={res.community_view.community.description}
                  image={res.community_view.community.icon}
                />

                <div className="row">
                  <div className="col-12 col-md-8">
                    {this.communityInfo()}
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
                      {this.state.showSidebarMobile && (
                        <>
                          <Sidebar
                            community_view={res.community_view}
                            moderators={res.moderators}
                            admins={this.state.siteRes.admins}
                            online={res.online}
                            enableNsfw={enableNsfw(this.state.siteRes)}
                            editable
                            allLanguages={this.state.siteRes.all_languages}
                            siteLanguages={
                              this.state.siteRes.discussion_languages
                            }
                            communityLanguages={communityLangs}
                          />
                          {!res.community_view.community.local &&
                            res.site.match({
                              some: site => (
                                <SiteSidebar
                                  site={site}
                                  showLocal={showLocal(this.isoData)}
                                  admins={None}
                                  counts={None}
                                  online={None}
                                />
                              ),
                              none: <></>,
                            })}
                        </>
                      )}
                    </div>
                    {this.selects()}
                    {this.listings()}
                    <Paginator
                      page={this.state.page}
                      onChange={this.handlePageChange}
                    />
                  </div>
                  <div className="d-none d-md-block col-md-4">
                    <Sidebar
                      community_view={res.community_view}
                      moderators={res.moderators}
                      admins={this.state.siteRes.admins}
                      online={res.online}
                      enableNsfw={enableNsfw(this.state.siteRes)}
                      editable
                      allLanguages={this.state.siteRes.all_languages}
                      siteLanguages={this.state.siteRes.discussion_languages}
                      communityLanguages={communityLangs}
                    />
                    {!res.community_view.community.local &&
                      res.site.match({
                        some: site => (
                          <SiteSidebar
                            site={site}
                            showLocal={showLocal(this.isoData)}
                            admins={None}
                            counts={None}
                            online={None}
                          />
                        ),
                        none: <></>,
                      })}
                  </div>
                </div>
              </>
            ),
            none: <></>,
          })
        )}
      </div>
    );
  }

  listings() {
    return this.state.dataType == DataType.Post ? (
      this.state.postsLoading ? (
        <h5>
          <Spinner large />
        </h5>
      ) : (
        <PostListings
          posts={this.state.posts}
          removeDuplicates
          enableDownvotes={enableDownvotes(this.state.siteRes)}
          enableNsfw={enableNsfw(this.state.siteRes)}
          allLanguages={this.state.siteRes.all_languages}
          siteLanguages={this.state.siteRes.discussion_languages}
        />
      )
    ) : this.state.commentsLoading ? (
      <h5>
        <Spinner large />
      </h5>
    ) : (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.comments)}
        viewType={CommentViewType.Flat}
        noIndent
        showContext
        enableDownvotes={enableDownvotes(this.state.siteRes)}
        moderators={this.state.communityRes.map(r => r.moderators)}
        admins={Some(this.state.siteRes.admins)}
        maxCommentsShown={None}
        allLanguages={this.state.siteRes.all_languages}
        siteLanguages={this.state.siteRes.discussion_languages}
      />
    );
  }

  communityInfo() {
    return this.state.communityRes
      .map(r => r.community_view.community)
      .match({
        some: community => (
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
        ),
        none: <></>,
      });
  }

  selects() {
    let communityRss = this.state.communityRes.map(r =>
      communityRSSUrl(r.community_view.community.actor_id, this.state.sort)
    );
    return (
      <div className="mb-3">
        <span className="mr-3">
          <DataTypeSelect
            type_={this.state.dataType}
            onChange={this.handleDataTypeChange}
          />
        </span>
        <span className="mr-2">
          <SortSelect sort={this.state.sort} onChange={this.handleSortChange} />
        </span>
        {communityRss.match({
          some: rss => (
            <>
              <a href={rss} title="RSS" rel={relTags}>
                <Icon icon="rss" classes="text-muted small" />
              </a>
              <link rel="alternate" type="application/atom+xml" href={rss} />
            </>
          ),
          none: <></>,
        })}
      </div>
    );
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
    window.scrollTo(0, 0);
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
    window.scrollTo(0, 0);
  }

  handleDataTypeChange(val: DataType) {
    this.updateUrl({ dataType: DataType[val], page: 1 });
    window.scrollTo(0, 0);
  }

  handleShowSidebarMobile(i: Community) {
    i.setState({ showSidebarMobile: !i.state.showSidebarMobile });
  }

  updateUrl(paramUpdates: UrlParams) {
    const dataTypeStr = paramUpdates.dataType || DataType[this.state.dataType];
    const sortStr = paramUpdates.sort || this.state.sort;
    const page = paramUpdates.page || this.state.page;

    let typeView = `/c/${this.state.communityName}`;

    this.props.history.push(
      `${typeView}/data_type/${dataTypeStr}/sort/${sortStr}/page/${page}`
    );
  }

  fetchData() {
    if (this.state.dataType == DataType.Post) {
      let form = new GetPosts({
        page: Some(this.state.page),
        limit: Some(fetchLimit),
        sort: Some(this.state.sort),
        type_: Some(ListingType.All),
        community_name: Some(this.state.communityName),
        community_id: None,
        saved_only: Some(false),
        auth: auth(false).ok(),
      });
      WebSocketService.Instance.send(wsClient.getPosts(form));
    } else {
      let form = new GetComments({
        page: Some(this.state.page),
        limit: Some(fetchLimit),
        max_depth: None,
        sort: Some(postToCommentSortType(this.state.sort)),
        type_: Some(ListingType.All),
        community_name: Some(this.state.communityName),
        community_id: None,
        saved_only: Some(false),
        post_id: None,
        parent_id: None,
        auth: auth(false).ok(),
      });
      WebSocketService.Instance.send(wsClient.getComments(form));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.context.router.history.push("/");
      return;
    } else if (msg.reconnect) {
      this.state.communityRes.match({
        some: res => {
          WebSocketService.Instance.send(
            wsClient.communityJoin({
              community_id: res.community_view.community.id,
            })
          );
        },
        none: void 0,
      });
      this.fetchData();
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg, GetCommunityResponse);
      this.setState({ communityRes: Some(data), communityLoading: false });
      // TODO why is there no auth in this form?
      WebSocketService.Instance.send(
        wsClient.communityJoin({
          community_id: data.community_view.community.id,
        })
      );
    } else if (
      op == UserOperation.EditCommunity ||
      op == UserOperation.DeleteCommunity ||
      op == UserOperation.RemoveCommunity
    ) {
      let data = wsJsonToRes<CommunityResponse>(msg, CommunityResponse);
      this.state.communityRes.match({
        some: res => {
          res.community_view = data.community_view;
          res.discussion_languages = data.discussion_languages;
        },
        none: void 0,
      });
      this.setState(this.state);
    } else if (op == UserOperation.FollowCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg, CommunityResponse);
      this.state.communityRes.match({
        some: res => {
          res.community_view.subscribed = data.community_view.subscribed;
          res.community_view.counts.subscribers =
            data.community_view.counts.subscribers;
        },
        none: void 0,
      });
      this.setState(this.state);
    } else if (op == UserOperation.GetPosts) {
      let data = wsJsonToRes<GetPostsResponse>(msg, GetPostsResponse);
      this.setState({ posts: data.posts, postsLoading: false });
      restoreScrollPosition(this.context);
      setupTippy();
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.FeaturePost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      editPostFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);

      let showPostNotifs = UserService.Instance.myUserInfo
        .map(m => m.local_user_view.local_user.show_new_post_notifs)
        .unwrapOr(false);

      // Only push these if you're on the first page, you pass the nsfw check, and it isn't blocked
      //
      if (
        this.state.page == 1 &&
        nsfwCheck(data.post_view) &&
        !isPostBlocked(data.post_view)
      ) {
        this.state.posts.unshift(data.post_view);
        if (showPostNotifs) {
          notifyPost(data.post_view, this.context.router);
        }
        this.setState(this.state);
      }
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      createPostLikeFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(
        msg,
        AddModToCommunityResponse
      );
      this.state.communityRes.match({
        some: res => (res.moderators = data.moderators),
        none: void 0,
      });
      this.setState(this.state);
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(
        msg,
        BanFromCommunityResponse
      );

      // TODO this might be incorrect
      this.state.posts
        .filter(p => p.creator.id == data.person_view.person.id)
        .forEach(p => (p.creator_banned_from_community = data.banned));

      this.setState(this.state);
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg, GetCommentsResponse);
      this.setState({ comments: data.comments, commentsLoading: false });
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      editCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);

      // Necessary since it might be a user reply
      if (data.form_id) {
        this.state.comments.unshift(data.comment_view);
        this.setState(this.state);
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      saveCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      createCommentLikeRes(data.comment_view, this.state.comments);
      this.setState(this.state);
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
    } else if (op == UserOperation.PurgeCommunity) {
      let data = wsJsonToRes<PurgeItemResponse>(msg, PurgeItemResponse);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    } else if (op == UserOperation.BlockCommunity) {
      let data = wsJsonToRes<BlockCommunityResponse>(
        msg,
        BlockCommunityResponse
      );
      this.state.communityRes.match({
        some: res => (res.community_view.blocked = data.blocked),
        none: void 0,
      });
      updateCommunityBlock(data);
      this.setState(this.state);
    }
  }
}
