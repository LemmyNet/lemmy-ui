import { Component, linkEvent } from "inferno";
import { Subscription } from "rxjs";
import {
  UserOperation,
  PostView,
  CommentView,
  CommunityView,
  PersonViewSafe,
  SortType,
  Search as SearchForm,
  SearchResponse,
  SearchType,
  PostResponse,
  CommentResponse,
  Site,
} from "lemmy-js-client";
import { WebSocketService } from "../services";
import {
  wsJsonToRes,
  fetchLimit,
  routeSearchTypeToEnum,
  routeSortTypeToEnum,
  toast,
  createCommentLikeRes,
  createPostLikeFindRes,
  commentsToFlatNodes,
  setIsoData,
  wsSubscribe,
  wsUserOp,
  wsClient,
  authField,
  setOptionalAuth,
  saveScrollPosition,
  restoreScrollPosition,
} from "../utils";
import { PostListing } from "./post-listing";
import { HtmlTags } from "./html-tags";
import { Spinner } from "./icon";
import { PersonListing } from "./person-listing";
import { CommunityLink } from "./community-link";
import { SortSelect } from "./sort-select";
import { CommentNodes } from "./comment-nodes";
import { i18n } from "../i18next";
import { InitialFetchRequest } from "shared/interfaces";

interface SearchProps {
  q: string;
  type_: SearchType;
  sort: SortType;
  page: number;
}

interface SearchState {
  q: string;
  type_: SearchType;
  sort: SortType;
  page: number;
  searchResponse: SearchResponse;
  loading: boolean;
  site: Site;
  searchText: string;
}

interface UrlParams {
  q?: string;
  type_?: SearchType;
  sort?: SortType;
  page?: number;
}

export class Search extends Component<any, SearchState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: SearchState = {
    q: Search.getSearchQueryFromProps(this.props.match.params.q),
    type_: Search.getSearchTypeFromProps(this.props.match.params.type),
    sort: Search.getSortTypeFromProps(this.props.match.params.sort),
    page: Search.getPageFromProps(this.props.match.params.page),
    searchText: Search.getSearchQueryFromProps(this.props.match.params.q),
    searchResponse: {
      type_: null,
      posts: [],
      comments: [],
      communities: [],
      users: [],
    },
    loading: true,
    site: this.isoData.site_res.site_view.site,
  };

  static getSearchQueryFromProps(q: string): string {
    return decodeURIComponent(q) || "";
  }

  static getSearchTypeFromProps(type_: string): SearchType {
    return type_ ? routeSearchTypeToEnum(type_) : SearchType.All;
  }

  static getSortTypeFromProps(sort: string): SortType {
    return sort ? routeSortTypeToEnum(sort) : SortType.TopAll;
  }

  static getPageFromProps(page: string): number {
    return page ? Number(page) : 1;
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.state.q != "") {
      if (this.isoData.path == this.context.router.route.match.url) {
        this.state.searchResponse = this.isoData.routeData[0];
        this.state.loading = false;
      } else {
        this.search();
      }
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    saveScrollPosition(this.context);
  }

  static getDerivedStateFromProps(props: any): SearchProps {
    return {
      q: Search.getSearchQueryFromProps(props.match.params.q),
      type_: Search.getSearchTypeFromProps(props.match.params.type),
      sort: Search.getSortTypeFromProps(props.match.params.sort),
      page: Search.getPageFromProps(props.match.params.page),
    };
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let form: SearchForm = {
      q: this.getSearchQueryFromProps(pathSplit[3]),
      type_: this.getSearchTypeFromProps(pathSplit[5]),
      sort: this.getSortTypeFromProps(pathSplit[7]),
      page: this.getPageFromProps(pathSplit[9]),
      limit: fetchLimit,
    };
    setOptionalAuth(form, req.auth);

    if (form.q != "") {
      promises.push(req.client.search(form));
    }

    return promises;
  }

  componentDidUpdate(_: any, lastState: SearchState) {
    if (
      lastState.q !== this.state.q ||
      lastState.type_ !== this.state.type_ ||
      lastState.sort !== this.state.sort ||
      lastState.page !== this.state.page
    ) {
      this.setState({ loading: true, searchText: this.state.q });
      this.search();
    }
  }

  get documentTitle(): string {
    if (this.state.q) {
      return `${i18n.t("search")} - ${this.state.q} - ${this.state.site.name}`;
    } else {
      return `${i18n.t("search")} - ${this.state.site.name}`;
    }
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <h5>{i18n.t("search")}</h5>
        {this.selects()}
        {this.searchForm()}
        {this.state.type_ == SearchType.All && this.all()}
        {this.state.type_ == SearchType.Comments && this.comments()}
        {this.state.type_ == SearchType.Posts && this.posts()}
        {this.state.type_ == SearchType.Communities && this.communities()}
        {this.state.type_ == SearchType.Users && this.users()}
        {this.resultsCount() == 0 && <span>{i18n.t("no_results")}</span>}
        {this.paginator()}
      </div>
    );
  }

  searchForm() {
    return (
      <form
        class="form-inline"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <input
          type="text"
          class="form-control mr-2 mb-2"
          value={this.state.searchText}
          placeholder={`${i18n.t("search")}...`}
          aria-label={i18n.t("search")}
          onInput={linkEvent(this, this.handleQChange)}
          required
          minLength={3}
        />
        <button type="submit" class="btn btn-secondary mr-2 mb-2">
          {this.state.loading ? <Spinner /> : <span>{i18n.t("search")}</span>}
        </button>
      </form>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <select
          value={this.state.type_}
          onChange={linkEvent(this, this.handleTypeChange)}
          class="custom-select w-auto mb-2"
          aria-label={i18n.t("type")}
        >
          <option disabled aria-hidden="true">
            {i18n.t("type")}
          </option>
          <option value={SearchType.All}>{i18n.t("all")}</option>
          <option value={SearchType.Comments}>{i18n.t("comments")}</option>
          <option value={SearchType.Posts}>{i18n.t("posts")}</option>
          <option value={SearchType.Communities}>
            {i18n.t("communities")}
          </option>
          <option value={SearchType.Users}>{i18n.t("users")}</option>
        </select>
        <span class="ml-2">
          <SortSelect
            sort={this.state.sort}
            onChange={this.handleSortChange}
            hideHot
            hideMostComments
          />
        </span>
      </div>
    );
  }

  all() {
    let combined: {
      type_: string;
      data: CommentView | PostView | CommunityView | PersonViewSafe;
      published: string;
    }[] = [];
    let comments = this.state.searchResponse.comments.map(e => {
      return { type_: "comments", data: e, published: e.comment.published };
    });
    let posts = this.state.searchResponse.posts.map(e => {
      return { type_: "posts", data: e, published: e.post.published };
    });
    let communities = this.state.searchResponse.communities.map(e => {
      return {
        type_: "communities",
        data: e,
        published: e.community.published,
      };
    });
    let users = this.state.searchResponse.users.map(e => {
      return { type_: "users", data: e, published: e.person.published };
    });

    combined.push(...comments);
    combined.push(...posts);
    combined.push(...communities);
    combined.push(...users);

    // Sort it
    if (this.state.sort == SortType.New) {
      combined.sort((a, b) => b.published.localeCompare(a.published));
    } else {
      combined.sort(
        (a, b) =>
          ((b.data as CommentView | PostView).counts.score |
            (b.data as CommunityView).counts.subscribers |
            (b.data as PersonViewSafe).counts.comment_score) -
          ((a.data as CommentView | PostView).counts.score |
            (a.data as CommunityView).counts.subscribers |
            (a.data as PersonViewSafe).counts.comment_score)
      );
    }

    return (
      <div>
        {combined.map(i => (
          <div class="row">
            <div class="col-12">
              {i.type_ == "posts" && (
                <PostListing
                  key={(i.data as PostView).post.id}
                  post_view={i.data as PostView}
                  showCommunity
                  enableDownvotes={this.state.site.enable_downvotes}
                  enableNsfw={this.state.site.enable_nsfw}
                />
              )}
              {i.type_ == "comments" && (
                <CommentNodes
                  key={(i.data as CommentView).comment.id}
                  nodes={[{ comment_view: i.data as CommentView }]}
                  locked
                  noIndent
                  enableDownvotes={this.state.site.enable_downvotes}
                />
              )}
              {i.type_ == "communities" && (
                <div>{this.communityListing(i.data as CommunityView)}</div>
              )}
              {i.type_ == "users" && (
                <div>{this.userListing(i.data as PersonViewSafe)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  comments() {
    return (
      <CommentNodes
        nodes={commentsToFlatNodes(this.state.searchResponse.comments)}
        locked
        noIndent
        enableDownvotes={this.state.site.enable_downvotes}
      />
    );
  }

  posts() {
    return (
      <>
        {this.state.searchResponse.posts.map(post => (
          <div class="row">
            <div class="col-12">
              <PostListing
                post_view={post}
                showCommunity
                enableDownvotes={this.state.site.enable_downvotes}
                enableNsfw={this.state.site.enable_nsfw}
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  communities() {
    return (
      <>
        {this.state.searchResponse.communities.map(community => (
          <div class="row">
            <div class="col-12">{this.communityListing(community)}</div>
          </div>
        ))}
      </>
    );
  }

  communityListing(community_view: CommunityView) {
    return (
      <>
        <span>
          <CommunityLink community={community_view.community} />
        </span>
        <span>{` -
        ${i18n.t("number_of_subscribers", {
          count: community_view.counts.subscribers,
        })}
      `}</span>
      </>
    );
  }

  userListing(person_view: PersonViewSafe) {
    return [
      <span>
        <PersonListing person={person_view.person} showApubName />
      </span>,
      <span>{` - ${i18n.t("number_of_comments", {
        count: person_view.counts.comment_count,
      })}`}</span>,
    ];
  }

  users() {
    return (
      <>
        {this.state.searchResponse.users.map(user => (
          <div class="row">
            <div class="col-12">{this.userListing(user)}</div>
          </div>
        ))}
      </>
    );
  }

  paginator() {
    return (
      <div class="mt-2">
        {this.state.page > 1 && (
          <button
            class="btn btn-secondary mr-1"
            onClick={linkEvent(this, this.prevPage)}
          >
            {i18n.t("prev")}
          </button>
        )}

        {this.resultsCount() > 0 && (
          <button
            class="btn btn-secondary"
            onClick={linkEvent(this, this.nextPage)}
          >
            {i18n.t("next")}
          </button>
        )}
      </div>
    );
  }

  resultsCount(): number {
    let res = this.state.searchResponse;
    return (
      res.posts.length +
      res.comments.length +
      res.communities.length +
      res.users.length
    );
  }

  nextPage(i: Search) {
    i.updateUrl({ page: i.state.page + 1 });
  }

  prevPage(i: Search) {
    i.updateUrl({ page: i.state.page - 1 });
  }

  search() {
    let form: SearchForm = {
      q: this.state.q,
      type_: this.state.type_,
      sort: this.state.sort,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(false),
    };

    if (this.state.q != "") {
      WebSocketService.Instance.send(wsClient.search(form));
    }
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
  }

  handleTypeChange(i: Search, event: any) {
    i.updateUrl({
      type_: SearchType[event.target.value],
      page: 1,
    });
  }

  handleSearchSubmit(i: Search, event: any) {
    event.preventDefault();
    i.updateUrl({
      q: i.state.searchText,
      type_: i.state.type_,
      sort: i.state.sort,
      page: i.state.page,
    });
  }

  handleQChange(i: Search, event: any) {
    i.setState({ searchText: event.target.value });
  }

  updateUrl(paramUpdates: UrlParams) {
    const qStr = paramUpdates.q || this.state.q;
    const qStrEncoded = encodeURIComponent(qStr);
    const typeStr = paramUpdates.type_ || this.state.type_;
    const sortStr = paramUpdates.sort || this.state.sort;
    const page = paramUpdates.page || this.state.page;
    this.props.history.push(
      `/search/q/${qStrEncoded}/type/${typeStr}/sort/${sortStr}/page/${page}`
    );
  }

  parseMessage(msg: any) {
    console.log(msg);
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg).data;
      this.state.searchResponse = data;
      this.state.loading = false;
      window.scrollTo(0, 0);
      this.setState(this.state);
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(
        data.comment_view,
        this.state.searchResponse.comments
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.searchResponse.posts);
      this.setState(this.state);
    }
  }
}
