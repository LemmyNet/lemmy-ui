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
  myAuth,
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
  communityRes?: GetCommunityResponse;
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
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: State = {
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

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        communityRes: this.isoData.routeData[0] as GetCommunityResponse,
      };
      let postsRes = this.isoData.routeData[1] as GetPostsResponse | undefined;
      let commentsRes = this.isoData.routeData[2] as
        | GetCommentsResponse
        | undefined;

      if (postsRes) {
        this.state = { ...this.state, posts: postsRes.posts };
      }

      if (commentsRes) {
        this.state = { ...this.state, comments: commentsRes.comments };
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
    let form: GetCommunity = {
      name: this.state.communityName,
      auth: myAuth(false),
    };
    WebSocketService.Instance.send(wsClient.getCommunity(form));
  }

  componentDidMount() {
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
    this.subscription?.unsubscribe();
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
    let communityForm: GetCommunity = {
      name: communityName,
      auth: req.auth,
    };
    promises.push(req.client.getCommunity(communityForm));

    let dataType: DataType = pathSplit[4]
      ? DataType[pathSplit[4]]
      : DataType.Post;

    let mui = UserService.Instance.myUserInfo;

    let sort: SortType = pathSplit[6]
      ? SortType[pathSplit[6]]
      : mui
      ? Object.values(SortType)[
          mui.local_user_view.local_user.default_sort_type
        ]
      : SortType.Active;

    let page = pathSplit[8] ? Number(pathSplit[8]) : 1;

    if (dataType == DataType.Post) {
      let getPostsForm: GetPosts = {
        community_name: communityName,
        page,
        limit: fetchLimit,
        sort,
        type_: ListingType.All,
        saved_only: false,
        auth: req.auth,
      };
      promises.push(req.client.getPosts(getPostsForm));
      promises.push(Promise.resolve());
    } else {
      let getCommentsForm: GetComments = {
        community_name: communityName,
        page,
        limit: fetchLimit,
        sort: postToCommentSortType(sort),
        type_: ListingType.All,
        saved_only: false,
        auth: req.auth,
      };
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
    let cRes = this.state.communityRes;
    return cRes
      ? `${cRes.community_view.community.title} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  render() {
    // For some reason, this returns an empty vec if it matches the site langs
    let res = this.state.communityRes;
    let communityLangs =
      res?.discussion_languages.length == 0
        ? this.state.siteRes.all_languages.map(l => l.id)
        : res?.discussion_languages;

    return (
      <div className="container-lg">
        {this.state.communityLoading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          res && (
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
                        {!res.community_view.community.local && res.site && (
                          <SiteSidebar
                            site={res.site}
                            showLocal={showLocal(this.isoData)}
                          />
                        )}
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
                  {!res.community_view.community.local && res.site && (
                    <SiteSidebar
                      site={res.site}
                      showLocal={showLocal(this.isoData)}
                    />
                  )}
                </div>
              </div>
            </>
          )
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
        moderators={this.state.communityRes?.moderators}
        admins={this.state.siteRes.admins}
        allLanguages={this.state.siteRes.all_languages}
        siteLanguages={this.state.siteRes.discussion_languages}
      />
    );
  }

  communityInfo() {
    let community = this.state.communityRes?.community_view.community;
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

  selects() {
    // let communityRss = this.state.communityRes.map(r =>
    //   communityRSSUrl(r.community_view.community.actor_id, this.state.sort)
    // );
    let res = this.state.communityRes;
    let communityRss = res
      ? communityRSSUrl(res.community_view.community.actor_id, this.state.sort)
      : undefined;

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
      let form: GetPosts = {
        page: this.state.page,
        limit: fetchLimit,
        sort: this.state.sort,
        type_: ListingType.All,
        community_name: this.state.communityName,
        saved_only: false,
        auth: myAuth(false),
      };
      WebSocketService.Instance.send(wsClient.getPosts(form));
    } else {
      let form: GetComments = {
        page: this.state.page,
        limit: fetchLimit,
        sort: postToCommentSortType(this.state.sort),
        type_: ListingType.All,
        community_name: this.state.communityName,
        saved_only: false,
        auth: myAuth(false),
      };
      WebSocketService.Instance.send(wsClient.getComments(form));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    let res = this.state.communityRes;
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.context.router.history.push("/");
      return;
    } else if (msg.reconnect) {
      if (res) {
        WebSocketService.Instance.send(
          wsClient.communityJoin({
            community_id: res.community_view.community.id,
          })
        );
      }
      this.fetchData();
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg);
      this.setState({ communityRes: data, communityLoading: false });
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
      let data = wsJsonToRes<CommunityResponse>(msg);
      if (res) {
        res.community_view = data.community_view;
        res.discussion_languages = data.discussion_languages;
      }
      this.setState(this.state);
    } else if (op == UserOperation.FollowCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg);
      if (res) {
        res.community_view.subscribed = data.community_view.subscribed;
        res.community_view.counts.subscribers =
          data.community_view.counts.subscribers;
      }
      this.setState(this.state);
    } else if (op == UserOperation.GetPosts) {
      let data = wsJsonToRes<GetPostsResponse>(msg);
      this.setState({ posts: data.posts, postsLoading: false });
      restoreScrollPosition(this.context);
      setupTippy();
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.FeaturePost ||
      op == UserOperation.SavePost ||
      op == UserOperation.MarkPostAsRead
    ) {
      let data = wsJsonToRes<PostResponse>(msg);
      editPostFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePost) {
      let data = wsJsonToRes<PostResponse>(msg);

      let showPostNotifs =
        UserService.Instance.myUserInfo?.local_user_view.local_user
          .show_new_post_notifs;

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
      let data = wsJsonToRes<PostResponse>(msg);
      createPostLikeFindRes(data.post_view, this.state.posts);
      this.setState(this.state);
    } else if (op == UserOperation.AddModToCommunity) {
      let data = wsJsonToRes<AddModToCommunityResponse>(msg);
      if (res) {
        res.moderators = data.moderators;
      }
      this.setState(this.state);
    } else if (op == UserOperation.BanFromCommunity) {
      let data = wsJsonToRes<BanFromCommunityResponse>(msg);

      // TODO this might be incorrect
      this.state.posts
        .filter(p => p.creator.id == data.person_view.person.id)
        .forEach(p => (p.creator_banned_from_community = data.banned));

      this.setState(this.state);
    } else if (op == UserOperation.GetComments) {
      let data = wsJsonToRes<GetCommentsResponse>(msg);
      this.setState({ comments: data.comments, commentsLoading: false });
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg);
      editCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg);

      // Necessary since it might be a user reply
      if (data.form_id) {
        this.state.comments.unshift(data.comment_view);
        this.setState(this.state);
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      saveCommentRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(data.comment_view, this.state.comments);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.PurgeCommunity) {
      let data = wsJsonToRes<PurgeItemResponse>(msg);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    } else if (op == UserOperation.BlockCommunity) {
      let data = wsJsonToRes<BlockCommunityResponse>(msg);
      if (res) {
        res.community_view.blocked = data.blocked;
      }
      updateCommunityBlock(data);
      this.setState(this.state);
    }
  }
}
