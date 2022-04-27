import { Component, linkEvent } from "inferno";
import {
  CommentResponse,
  CommentView,
  CommunityView,
  GetCommunity,
  GetPersonDetails,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  PersonViewSafe,
  PostResponse,
  PostView,
  ResolveObject,
  ResolveObjectResponse,
  Search as SearchForm,
  SearchResponse,
  SearchType,
  Site,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest } from "shared/interfaces";
import { i18n } from "../i18next";
import { WebSocketService } from "../services";
import {
  authField,
  capitalizeFirstLetter,
  choicesConfig,
  commentsToFlatNodes,
  communitySelectName,
  communityToChoice,
  createCommentLikeRes,
  createPostLikeFindRes,
  debounce,
  fetchCommunities,
  fetchLimit,
  fetchUsers,
  isBrowser,
  numToSI,
  personSelectName,
  personToChoice,
  pushNotNull,
  restoreScrollPosition,
  routeListingTypeToEnum,
  routeSearchTypeToEnum,
  routeSortTypeToEnum,
  saveScrollPosition,
  setIsoData,
  setOptionalAuth,
  showLocal,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../utils";
import { CommentNodes } from "./comment/comment-nodes";
import { HtmlTags } from "./common/html-tags";
import { Spinner } from "./common/icon";
import { ListingTypeSelect } from "./common/listing-type-select";
import { Paginator } from "./common/paginator";
import { SortSelect } from "./common/sort-select";
import { CommunityLink } from "./community/community-link";
import { PersonListing } from "./person/person-listing";
import { PostListing } from "./post/post-listing";

var Choices: any;
if (isBrowser()) {
  Choices = require("choices.js");
}

interface SearchProps {
  q: string;
  type_: SearchType;
  sort: SortType;
  listingType: ListingType;
  communityId: number;
  creatorId: number;
  page: number;
}

interface SearchState {
  q: string;
  type_: SearchType;
  sort: SortType;
  listingType: ListingType;
  communityId: number;
  creatorId: number;
  page: number;
  searchResponse?: SearchResponse;
  communities: CommunityView[];
  creator?: PersonViewSafe;
  loading: boolean;
  site: Site;
  searchText: string;
  resolveObjectResponse?: ResolveObjectResponse;
}

interface UrlParams {
  q?: string;
  type_?: SearchType;
  sort?: SortType;
  listingType?: ListingType;
  communityId?: number;
  creatorId?: number;
  page?: number;
}

interface Combined {
  type_: string;
  data: CommentView | PostView | CommunityView | PersonViewSafe;
  published: string;
}

export class Search extends Component<any, SearchState> {
  private isoData = setIsoData(this.context);
  private communityChoices: any;
  private creatorChoices: any;
  private subscription: Subscription;
  private emptyState: SearchState = {
    q: Search.getSearchQueryFromProps(this.props.match.params.q),
    type_: Search.getSearchTypeFromProps(this.props.match.params.type),
    sort: Search.getSortTypeFromProps(this.props.match.params.sort),
    listingType: Search.getListingTypeFromProps(
      this.props.match.params.listing_type
    ),
    page: Search.getPageFromProps(this.props.match.params.page),
    searchText: Search.getSearchQueryFromProps(this.props.match.params.q),
    communityId: Search.getCommunityIdFromProps(
      this.props.match.params.community_id
    ),
    creatorId: Search.getCreatorIdFromProps(this.props.match.params.creator_id),
    searchResponse: null,
    resolveObjectResponse: null,
    loading: true,
    site: this.isoData.site_res.site_view.site,
    communities: [],
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

  static getListingTypeFromProps(listingType: string): ListingType {
    return listingType ? routeListingTypeToEnum(listingType) : ListingType.All;
  }

  static getCommunityIdFromProps(id: string): number {
    return id ? Number(id) : 0;
  }

  static getCreatorIdFromProps(id: string): number {
    return id ? Number(id) : 0;
  }

  static getPageFromProps(page: string): number {
    return page ? Number(page) : 1;
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let singleOrMultipleCommunities = this.isoData.routeData[0];
      if (singleOrMultipleCommunities.communities) {
        this.state.communities = this.isoData.routeData[0].communities;
      } else {
        this.state.communities = [this.isoData.routeData[0].community_view];
      }

      let creator = this.isoData.routeData[1];
      if (creator?.person_view) {
        this.state.creator = this.isoData.routeData[1].person_view;
      }
      if (this.state.q != "") {
        this.state.searchResponse = this.isoData.routeData[2];
        this.state.resolveObjectResponse = this.isoData.routeData[3];
        this.state.loading = false;
      } else {
        this.search();
      }
    } else {
      this.fetchCommunities();
      this.search();
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    saveScrollPosition(this.context);
  }

  componentDidMount() {
    this.setupCommunityFilter();
    this.setupCreatorFilter();
  }

  static getDerivedStateFromProps(props: any): SearchProps {
    return {
      q: Search.getSearchQueryFromProps(props.match.params.q),
      type_: Search.getSearchTypeFromProps(props.match.params.type),
      sort: Search.getSortTypeFromProps(props.match.params.sort),
      listingType: Search.getListingTypeFromProps(
        props.match.params.listing_type
      ),
      communityId: Search.getCommunityIdFromProps(
        props.match.params.community_id
      ),
      creatorId: Search.getCreatorIdFromProps(props.match.params.creator_id),
      page: Search.getPageFromProps(props.match.params.page),
    };
  }

  fetchCommunities() {
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.All,
      sort: SortType.TopAll,
      limit: fetchLimit,
      auth: authField(false),
    };
    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let communityId = this.getCommunityIdFromProps(pathSplit[11]);
    if (communityId !== 0) {
      let getCommunityForm: GetCommunity = {
        id: communityId,
      };
      setOptionalAuth(getCommunityForm, req.auth);
      promises.push(req.client.getCommunity(getCommunityForm));
    } else {
      let listCommunitiesForm: ListCommunities = {
        type_: ListingType.All,
        sort: SortType.TopAll,
        limit: fetchLimit,
      };
      setOptionalAuth(listCommunitiesForm, req.auth);
      promises.push(req.client.listCommunities(listCommunitiesForm));
    }

    let creatorId = this.getCreatorIdFromProps(pathSplit[13]);
    if (creatorId !== 0) {
      let getCreatorForm: GetPersonDetails = {
        person_id: creatorId,
      };
      setOptionalAuth(getCreatorForm, req.auth);
      promises.push(req.client.getPersonDetails(getCreatorForm));
    } else {
      promises.push(Promise.resolve());
    }

    let form: SearchForm = {
      q: this.getSearchQueryFromProps(pathSplit[3]),
      type_: this.getSearchTypeFromProps(pathSplit[5]),
      sort: this.getSortTypeFromProps(pathSplit[7]),
      listing_type: this.getListingTypeFromProps(pathSplit[9]),
      page: this.getPageFromProps(pathSplit[15]),
      limit: fetchLimit,
    };
    if (communityId !== 0) {
      form.community_id = communityId;
    }
    if (creatorId !== 0) {
      form.creator_id = creatorId;
    }
    setOptionalAuth(form, req.auth);

    let resolveObjectForm: ResolveObject = {
      q: this.getSearchQueryFromProps(pathSplit[3]),
    };
    setOptionalAuth(resolveObjectForm, req.auth);

    if (form.q != "") {
      //this.state.loading = false;
      //this.setState(this.state);
      promises.push(req.client.search(form));
      promises.push(req.client.resolveObject(resolveObjectForm));
    }

    return promises;
  }

  componentDidUpdate(_: any, lastState: SearchState) {
    if (
      lastState.q !== this.state.q ||
      lastState.type_ !== this.state.type_ ||
      lastState.sort !== this.state.sort ||
      lastState.listingType !== this.state.listingType ||
      lastState.communityId !== this.state.communityId ||
      lastState.creatorId !== this.state.creatorId ||
      lastState.page !== this.state.page
    ) {
      this.setState({
        loading: true,
        searchText: this.state.q,
        searchResponse: null,
        resolveObjectResponse: null,
      });
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
        {this.state.type_ == SearchType.Url && this.posts()}
        {this.resultsCount() == 0 && <span>{i18n.t("no_results")}</span>}
        <Paginator page={this.state.page} onChange={this.handlePageChange} />
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
          <option value={SearchType.Url}>{i18n.t("url")}</option>
        </select>
        <span class="ml-2">
          <ListingTypeSelect
            type_={this.state.listingType}
            showLocal={showLocal(this.isoData)}
            onChange={this.handleListingTypeChange}
          />
        </span>
        <span class="ml-2">
          <SortSelect
            sort={this.state.sort}
            onChange={this.handleSortChange}
            hideHot
            hideMostComments
          />
        </span>
        <div class="form-row">
          {this.state.communities.length > 0 && this.communityFilter()}
          {this.creatorFilter()}
        </div>
      </div>
    );
  }

  postViewToCombined(postView: PostView): Combined {
    return {
      type_: "posts",
      data: postView,
      published: postView.post.published,
    };
  }

  commentViewToCombined(commentView: CommentView): Combined {
    return {
      type_: "comments",
      data: commentView,
      published: commentView.comment.published,
    };
  }

  communityViewToCombined(communityView: CommunityView): Combined {
    return {
      type_: "communities",
      data: communityView,
      published: communityView.community.published,
    };
  }

  personViewSafeToCombined(personViewSafe: PersonViewSafe): Combined {
    return {
      type_: "users",
      data: personViewSafe,
      published: personViewSafe.person.published,
    };
  }

  buildCombined(): Combined[] {
    let combined: Combined[] = [];

    // Push the possible resolve / federated objects first
    let resolveComment = this.state.resolveObjectResponse?.comment;
    if (resolveComment) {
      combined.push(this.commentViewToCombined(resolveComment));
    }
    let resolvePost = this.state.resolveObjectResponse?.post;
    if (resolvePost) {
      combined.push(this.postViewToCombined(resolvePost));
    }
    let resolveCommunity = this.state.resolveObjectResponse?.community;
    if (resolveCommunity) {
      combined.push(this.communityViewToCombined(resolveCommunity));
    }
    let resolveUser = this.state.resolveObjectResponse?.person;
    if (resolveUser) {
      combined.push(this.personViewSafeToCombined(resolveUser));
    }

    // Push the search results
    pushNotNull(
      combined,
      this.state.searchResponse?.comments?.map(e =>
        this.commentViewToCombined(e)
      )
    );
    pushNotNull(
      combined,
      this.state.searchResponse?.posts?.map(e => this.postViewToCombined(e))
    );
    pushNotNull(
      combined,
      this.state.searchResponse?.communities?.map(e =>
        this.communityViewToCombined(e)
      )
    );
    pushNotNull(
      combined,
      this.state.searchResponse?.users?.map(e =>
        this.personViewSafeToCombined(e)
      )
    );

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
    return combined;
  }

  all() {
    let combined = this.buildCombined();
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
    let comments: CommentView[] = [];

    pushNotNull(comments, this.state.resolveObjectResponse?.comment);
    pushNotNull(comments, this.state.searchResponse?.comments);

    return (
      <CommentNodes
        nodes={commentsToFlatNodes(comments)}
        locked
        noIndent
        enableDownvotes={this.state.site.enable_downvotes}
      />
    );
  }

  posts() {
    let posts: PostView[] = [];

    pushNotNull(posts, this.state.resolveObjectResponse?.post);
    pushNotNull(posts, this.state.searchResponse?.posts);

    return (
      <>
        {posts.map(post => (
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
    let communities: CommunityView[] = [];

    pushNotNull(communities, this.state.resolveObjectResponse?.community);
    pushNotNull(communities, this.state.searchResponse?.communities);

    return (
      <>
        {communities.map(community => (
          <div class="row">
            <div class="col-12">{this.communityListing(community)}</div>
          </div>
        ))}
      </>
    );
  }

  users() {
    let users: PersonViewSafe[] = [];

    pushNotNull(users, this.state.resolveObjectResponse?.person);
    pushNotNull(users, this.state.searchResponse?.users);

    return (
      <>
        {users.map(user => (
          <div class="row">
            <div class="col-12">{this.userListing(user)}</div>
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
          formattedCount: numToSI(community_view.counts.subscribers),
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
        formattedCount: numToSI(person_view.counts.comment_count),
      })}`}</span>,
    ];
  }

  communityFilter() {
    return (
      <div class="form-group col-sm-6">
        <label class="col-form-label" htmlFor="community-filter">
          {i18n.t("community")}
        </label>
        <div>
          <select
            class="form-control"
            id="community-filter"
            value={this.state.communityId}
          >
            <option value="0">{i18n.t("all")}</option>
            {this.state.communities.map(cv => (
              <option value={cv.community.id}>{communitySelectName(cv)}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  creatorFilter() {
    return (
      <div class="form-group col-sm-6">
        <label class="col-form-label" htmlFor="creator-filter">
          {capitalizeFirstLetter(i18n.t("creator"))}
        </label>
        <div>
          <select
            class="form-control"
            id="creator-filter"
            value={this.state.creatorId}
          >
            <option value="0">{i18n.t("all")}</option>
            {this.state.creator && (
              <option value={this.state.creator.person.id}>
                {personSelectName(this.state.creator)}
              </option>
            )}
          </select>
        </div>
      </div>
    );
  }

  resultsCount(): number {
    let res = this.state.searchResponse;
    let resObj = this.state.resolveObjectResponse;
    let resObjCount =
      resObj?.post || resObj?.person || resObj?.community || resObj?.comment
        ? 1
        : 0;
    return (
      res?.posts?.length +
      res?.comments?.length +
      res?.communities?.length +
      res?.users?.length +
      resObjCount
    );
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  search() {
    let form: SearchForm = {
      q: this.state.q,
      type_: this.state.type_,
      sort: this.state.sort,
      listing_type: this.state.listingType,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(false),
    };
    if (this.state.communityId !== 0) {
      form.community_id = this.state.communityId;
    }
    if (this.state.creatorId !== 0) {
      form.creator_id = this.state.creatorId;
    }

    let resolveObjectForm: ResolveObject = {
      q: this.state.q,
      auth: authField(false),
    };

    if (this.state.q != "") {
      this.state.searchResponse = null;
      this.state.resolveObjectResponse = null;
      this.state.loading = true;
      this.setState(this.state);
      WebSocketService.Instance.send(wsClient.search(form));
      WebSocketService.Instance.send(wsClient.resolveObject(resolveObjectForm));
    }
  }

  setupCommunityFilter() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("community-filter");
      if (selectId) {
        this.communityChoices = new Choices(selectId, choicesConfig);
        this.communityChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.handleCommunityFilterChange(Number(e.detail.choice.value));
          },
          false
        );
        this.communityChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let communities = (await fetchCommunities(e.detail.value))
                .communities;
              let choices = communities.map(cv => communityToChoice(cv));
              choices.unshift({ value: "0", label: i18n.t("all") });
              this.communityChoices.setChoices(choices, "value", "label", true);
            } catch (err) {
              console.error(err);
            }
          }),
          false
        );
      }
    }
  }

  setupCreatorFilter() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("creator-filter");
      if (selectId) {
        this.creatorChoices = new Choices(selectId, choicesConfig);
        this.creatorChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.handleCreatorFilterChange(Number(e.detail.choice.value));
          },
          false
        );
        this.creatorChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let creators = (await fetchUsers(e.detail.value)).users;
              let choices = creators.map(pvs => personToChoice(pvs));
              choices.unshift({ value: "0", label: i18n.t("all") });
              this.creatorChoices.setChoices(choices, "value", "label", true);
            } catch (err) {
              console.log(err);
            }
          }),
          false
        );
      }
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

  handleListingTypeChange(val: ListingType) {
    this.updateUrl({
      listingType: val,
      page: 1,
    });
  }

  handleCommunityFilterChange(communityId: number) {
    this.updateUrl({
      communityId,
      page: 1,
    });
  }

  handleCreatorFilterChange(creatorId: number) {
    this.updateUrl({
      creatorId,
      page: 1,
    });
  }

  handleSearchSubmit(i: Search, event: any) {
    event.preventDefault();
    i.updateUrl({
      q: i.state.searchText,
      type_: i.state.type_,
      listingType: i.state.listingType,
      communityId: i.state.communityId,
      creatorId: i.state.creatorId,
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
    const listingTypeStr = paramUpdates.listingType || this.state.listingType;
    const sortStr = paramUpdates.sort || this.state.sort;
    const communityId =
      paramUpdates.communityId == 0
        ? 0
        : paramUpdates.communityId || this.state.communityId;
    const creatorId =
      paramUpdates.creatorId == 0
        ? 0
        : paramUpdates.creatorId || this.state.creatorId;
    const page = paramUpdates.page || this.state.page;
    this.props.history.push(
      `/search/q/${qStrEncoded}/type/${typeStr}/sort/${sortStr}/listing_type/${listingTypeStr}/community_id/${communityId}/creator_id/${creatorId}/page/${page}`
    );
  }

  parseMessage(msg: any) {
    console.log(msg);
    let op = wsUserOp(msg);
    if (msg.error) {
      if (msg.error == "couldnt_find_object") {
        this.state.resolveObjectResponse = {
          comment: null,
          post: null,
          community: null,
          person: null,
        };
        this.checkFinishedLoading();
      } else {
        toast(i18n.t(msg.error), "danger");
        return;
      }
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg).data;
      this.state.searchResponse = data;
      window.scrollTo(0, 0);
      this.checkFinishedLoading();
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(
        data.comment_view,
        this.state.searchResponse?.comments
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.searchResponse?.posts);
      this.setState(this.state);
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg).data;
      this.state.communities = data.communities;
      this.setState(this.state);
      this.setupCommunityFilter();
    } else if (op == UserOperation.ResolveObject) {
      let data = wsJsonToRes<ResolveObjectResponse>(msg).data;
      this.state.resolveObjectResponse = data;
      this.checkFinishedLoading();
    }
  }

  checkFinishedLoading() {
    if (
      this.state.searchResponse != null &&
      this.state.resolveObjectResponse != null
    ) {
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
