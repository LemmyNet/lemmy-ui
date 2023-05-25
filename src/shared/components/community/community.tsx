import { Component, linkEvent } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddModToCommunityResponse,
  BanFromCommunityResponse,
  BlockCommunityResponse,
  BlockPersonResponse,
  CommentResponse,
  CommunityResponse,
  GetComments,
  GetCommentsResponse,
  GetCommunity,
  GetCommunityResponse,
  GetPosts,
  GetPostsResponse,
  PostReportResponse,
  PostResponse,
  PurgeItemResponse,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import {
  CommentViewType,
  DataType,
  InitialFetchRequest,
} from "../../interfaces";
import { UserService } from "../../services";
import {
  QueryParams,
  commentsToFlatNodes,
  communityRSSUrl,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  getDataTypeString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  isInitialRoute,
  isPostBlocked,
  myAuth,
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
import {
  HttpService,
  RequestState,
  apiWrapper,
} from "../../services/HttpService";

interface State {
  communityRes: RequestState<GetCommunityResponse>;
  postsRes: RequestState<GetPostsResponse>;
  commentsRes: RequestState<GetCommentsResponse>;
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
    showSidebarMobile: false,
  };

  constructor(props: RouteComponentProps<{ name: string }>, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleDataTypeChange = this.handleDataTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        communityRes: apiWrapper(
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
        this.state = { ...this.state, postsRes: apiWrapper(postsRes) };
      }

      if (commentsRes) {
        this.state = {
          ...this.state,
          commentsRes: apiWrapper(commentsRes),
        };
      }
    }
  }

  async fetchCommunity() {
    this.setState({ communityRes: { state: "loading" } });
    this.setState({
      communityRes: apiWrapper(
        await HttpService.client.getCommunity({
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
      case "success":
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
        postsRes: apiWrapper(
          await HttpService.client.getPosts({
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
        commentsRes: apiWrapper(
          await HttpService.client.getComments({
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

  parseMessage(msg: any) {
    const { page } = getCommunityQueryParams();
    const op = wsUserOp(msg);
    console.log(msg);
    const res = this.state.communityRes;

    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.context.router.history.push("/");
    } else if (msg.reconnect) {
      if (res) {
        WebSocketService.Instance.send(
          wsClient.communityJoin({
            community_id: res.community_view.community.id,
          })
        );
      }

      this.fetchData();
    } else {
      switch (op) {
        case UserOperation.GetCommunity: {
          const data = wsJsonToRes<GetCommunityResponse>(msg);

          this.setState({ communityRes: data, communityLoading: false });
          // TODO why is there no auth in this form?
          WebSocketService.Instance.send(
            wsClient.communityJoin({
              community_id: data.community_view.community.id,
            })
          );

          break;
        }

        case UserOperation.EditCommunity:
        case UserOperation.DeleteCommunity:
        case UserOperation.RemoveCommunity: {
          const { community_view, discussion_languages } =
            wsJsonToRes<CommunityResponse>(msg);

          if (res) {
            res.community_view = community_view;
            res.discussion_languages = discussion_languages;
            this.setState(this.state);
          }

          break;
        }

        case UserOperation.FollowCommunity: {
          const {
            community_view: {
              subscribed,
              counts: { subscribers },
            },
          } = wsJsonToRes<CommunityResponse>(msg);

          if (res) {
            res.community_view.subscribed = subscribed;
            res.community_view.counts.subscribers = subscribers;
            this.setState(this.state);
          }

          break;
        }

        case UserOperation.GetPosts: {
          const { posts } = wsJsonToRes<GetPostsResponse>(msg);

          this.setState({ posts, listingsLoading: false });
          restoreScrollPosition(this.context);
          setupTippy();

          break;
        }

        case UserOperation.EditPost:
        case UserOperation.DeletePost:
        case UserOperation.RemovePost:
        case UserOperation.LockPost:
        case UserOperation.FeaturePost:
        case UserOperation.SavePost: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);

          editPostFindRes(post_view, this.state.posts);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreatePost: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);

          const showPostNotifs =
            UserService.Instance.myUserInfo?.local_user_view.local_user
              .show_new_post_notifs;

          // Only push these if you're on the first page, you pass the nsfw check, and it isn't blocked
          if (page === 1 && nsfwCheck(post_view) && !isPostBlocked(post_view)) {
            this.state.posts.unshift(post_view);
            if (showPostNotifs) {
              notifyPost(post_view, this.context.router);
            }
            this.setState(this.state);
          }

          break;
        }

        case UserOperation.CreatePostLike: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);

          createPostLikeFindRes(post_view, this.state.posts);
          this.setState(this.state);

          break;
        }

        case UserOperation.AddModToCommunity: {
          const { moderators } = wsJsonToRes<AddModToCommunityResponse>(msg);

          if (res) {
            res.moderators = moderators;
            this.setState(this.state);
          }

          break;
        }

        case UserOperation.BanFromCommunity: {
          const {
            person_view: {
              person: { id: personId },
            },
            banned,
          } = wsJsonToRes<BanFromCommunityResponse>(msg);

          // TODO this might be incorrect
          this.state.posts
            .filter(p => p.creator.id === personId)
            .forEach(p => (p.creator_banned_from_community = banned));

          this.setState(this.state);

          break;
        }

        case UserOperation.GetComments: {
          const { comments } = wsJsonToRes<GetCommentsResponse>(msg);
          this.setState({ comments, listingsLoading: false });

          break;
        }

        case UserOperation.EditComment:
        case UserOperation.DeleteComment:
        case UserOperation.RemoveComment: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          editCommentRes(comment_view, this.state.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreateComment: {
          const { form_id, comment_view } = wsJsonToRes<CommentResponse>(msg);

          // Necessary since it might be a user reply
          if (form_id) {
            this.setState(({ comments }) => ({
              comments: [comment_view].concat(comments),
            }));
          }

          break;
        }

        case UserOperation.SaveComment: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);

          saveCommentRes(comment_view, this.state.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreateCommentLike: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);

          createCommentLikeRes(comment_view, this.state.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.BlockPerson: {
          const data = wsJsonToRes<BlockPersonResponse>(msg);
          updatePersonBlock(data);

          break;
        }

        case UserOperation.CreatePostReport:
        case UserOperation.CreateCommentReport: {
          const data = wsJsonToRes<PostReportResponse>(msg);

          if (data) {
            toast(i18n.t("report_created"));
          }

          break;
        }

        case UserOperation.PurgeCommunity: {
          const { success } = wsJsonToRes<PurgeItemResponse>(msg);

          if (success) {
            toast(i18n.t("purge_success"));
            this.context.router.history.push(`/`);
          }

          break;
        }

        case UserOperation.BlockCommunity: {
          const data = wsJsonToRes<BlockCommunityResponse>(msg);
          if (res) {
            res.community_view.blocked = data.blocked;
            this.setState(this.state);
          }
          updateCommunityBlock(data);

          break;
        }
      }
    }
  }
}
