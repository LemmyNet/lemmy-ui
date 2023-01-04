import { Component, linkEvent } from "inferno";
import {
  CommentResponse,
  CommentView,
  CommunityView,
  GetCommunity,
  GetCommunityResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
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
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../i18next";
import { CommentViewType, InitialFetchRequest } from "../interfaces";
import { WebSocketService } from "../services";
import {
  capitalizeFirstLetter,
  choicesConfig,
  commentsToFlatNodes,
  communitySelectName,
  communityToChoice,
  createCommentLikeRes,
  createPostLikeFindRes,
  debounce,
  enableDownvotes,
  enableNsfw,
  fetchCommunities,
  fetchLimit,
  fetchUsers,
  isBrowser,
  myAuth,
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
  showLocal,
  toast,
  wsClient,
  wsSubscribe,
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
  creatorDetails?: GetPersonDetailsResponse;
  loading: boolean;
  siteRes: GetSiteResponse;
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
  private subscription?: Subscription;
  state: SearchState = {
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
    loading: true,
    siteRes: this.isoData.site_res,
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

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let communityRes = this.isoData.routeData[0] as
        | GetCommunityResponse
        | undefined;
      let communitiesRes = this.isoData.routeData[1] as
        | ListCommunitiesResponse
        | undefined;
      // This can be single or multiple communities given
      if (communitiesRes) {
        this.state = {
          ...this.state,
          communities: communitiesRes.communities,
        };
      }

      if (communityRes) {
        this.state = {
          ...this.state,
          communities: [communityRes.community_view],
        };
      }

      this.state = {
        ...this.state,
        creatorDetails: this.isoData.routeData[2] as GetPersonDetailsResponse,
      };

      if (this.state.q != "") {
        this.state = {
          ...this.state,
          searchResponse: this.isoData.routeData[3] as SearchResponse,
          resolveObjectResponse: this.isoData
            .routeData[4] as ResolveObjectResponse,
          loading: false,
        };
      } else {
        this.search();
      }
    } else {
      this.fetchCommunities();
      this.search();
    }
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
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
      auth: myAuth(false),
    };
    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];
    let auth = req.auth;

    let communityId = this.getCommunityIdFromProps(pathSplit[11]);
    let community_id = communityId == 0 ? undefined : communityId;
    if (community_id) {
      let getCommunityForm: GetCommunity = {
        id: community_id,
        auth,
      };
      promises.push(req.client.getCommunity(getCommunityForm));
      promises.push(Promise.resolve());
    } else {
      let listCommunitiesForm: ListCommunities = {
        type_: ListingType.All,
        sort: SortType.TopAll,
        limit: fetchLimit,
        auth: req.auth,
      };
      promises.push(Promise.resolve());
      promises.push(req.client.listCommunities(listCommunitiesForm));
    }

    let creatorId = this.getCreatorIdFromProps(pathSplit[13]);
    let creator_id = creatorId == 0 ? undefined : creatorId;
    if (creator_id) {
      let getCreatorForm: GetPersonDetails = {
        person_id: creator_id,
        auth: req.auth,
      };
      promises.push(req.client.getPersonDetails(getCreatorForm));
    } else {
      promises.push(Promise.resolve());
    }

    let form: SearchForm = {
      q: this.getSearchQueryFromProps(pathSplit[3]),
      community_id,
      creator_id,
      type_: this.getSearchTypeFromProps(pathSplit[5]),
      sort: this.getSortTypeFromProps(pathSplit[7]),
      listing_type: this.getListingTypeFromProps(pathSplit[9]),
      page: this.getPageFromProps(pathSplit[15]),
      limit: fetchLimit,
      auth: req.auth,
    };

    let resolveObjectForm: ResolveObject = {
      q: this.getSearchQueryFromProps(pathSplit[3]),
      auth: req.auth,
    };

    if (form.q != "") {
      promises.push(req.client.search(form));
      promises.push(req.client.resolveObject(resolveObjectForm));
    } else {
      promises.push(Promise.resolve());
      promises.push(Promise.resolve());
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
      });
      this.search();
    }
  }

  get documentTitle(): string {
    let siteName = this.state.siteRes.site_view.site.name;
    return this.state.q
      ? `${i18n.t("search")} - ${this.state.q} - ${siteName}`
      : `${i18n.t("search")} - ${siteName}`;
  }

  render() {
    return (
      <div className="container-lg">
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
        className="form-inline"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <input
          type="text"
          className="form-control mr-2 mb-2"
          value={this.state.searchText}
          placeholder={`${i18n.t("search")}...`}
          aria-label={i18n.t("search")}
          onInput={linkEvent(this, this.handleQChange)}
          required
          minLength={1}
        />
        <button type="submit" className="btn btn-secondary mr-2 mb-2">
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
          className="custom-select w-auto mb-2"
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
        <span className="ml-2">
          <ListingTypeSelect
            type_={this.state.listingType}
            showLocal={showLocal(this.isoData)}
            showSubscribed
            onChange={this.handleListingTypeChange}
          />
        </span>
        <span className="ml-2">
          <SortSelect
            sort={this.state.sort}
            onChange={this.handleSortChange}
            hideHot
            hideMostComments
          />
        </span>
        <div className="form-row">
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

    let resolveRes = this.state.resolveObjectResponse;
    // Push the possible resolve / federated objects first
    if (resolveRes) {
      let resolveComment = resolveRes.comment;
      if (resolveComment) {
        combined.push(this.commentViewToCombined(resolveComment));
      }
      let resolvePost = resolveRes.post;
      if (resolvePost) {
        combined.push(this.postViewToCombined(resolvePost));
      }
      let resolveCommunity = resolveRes.community;
      if (resolveCommunity) {
        combined.push(this.communityViewToCombined(resolveCommunity));
      }
      let resolveUser = resolveRes.person;
      if (resolveUser) {
        combined.push(this.personViewSafeToCombined(resolveUser));
      }
    }

    // Push the search results
    let searchRes = this.state.searchResponse;
    if (searchRes) {
      pushNotNull(
        combined,
        searchRes.comments?.map(e => this.commentViewToCombined(e))
      );
      pushNotNull(
        combined,
        searchRes.posts?.map(e => this.postViewToCombined(e))
      );
      pushNotNull(
        combined,
        searchRes.communities?.map(e => this.communityViewToCombined(e))
      );
      pushNotNull(
        combined,
        searchRes.users?.map(e => this.personViewSafeToCombined(e))
      );
    }

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
          <div key={i.published} className="row">
            <div className="col-12">
              {i.type_ == "posts" && (
                <PostListing
                  key={(i.data as PostView).post.id}
                  post_view={i.data as PostView}
                  showCommunity
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  enableNsfw={enableNsfw(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                  viewOnly
                />
              )}
              {i.type_ == "comments" && (
                <CommentNodes
                  key={(i.data as CommentView).comment.id}
                  nodes={[
                    {
                      comment_view: i.data as CommentView,
                      children: [],
                      depth: 0,
                    },
                  ]}
                  viewType={CommentViewType.Flat}
                  viewOnly
                  locked
                  noIndent
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                />
              )}
              {i.type_ == "communities" && (
                <div>{this.communityListing(i.data as CommunityView)}</div>
              )}
              {i.type_ == "users" && (
                <div>{this.personListing(i.data as PersonViewSafe)}</div>
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
        viewType={CommentViewType.Flat}
        viewOnly
        locked
        noIndent
        enableDownvotes={enableDownvotes(this.state.siteRes)}
        allLanguages={this.state.siteRes.all_languages}
        siteLanguages={this.state.siteRes.discussion_languages}
      />
    );
  }

  posts() {
    let posts: PostView[] = [];

    pushNotNull(posts, this.state.resolveObjectResponse?.post);
    pushNotNull(posts, this.state.searchResponse?.posts);

    return (
      <>
        {posts.map(pv => (
          <div key={pv.post.id} className="row">
            <div className="col-12">
              <PostListing
                post_view={pv}
                showCommunity
                enableDownvotes={enableDownvotes(this.state.siteRes)}
                enableNsfw={enableNsfw(this.state.siteRes)}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
                viewOnly
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
        {communities.map(cv => (
          <div key={cv.community.id} className="row">
            <div className="col-12">{this.communityListing(cv)}</div>
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
        {users.map(pvs => (
          <div key={pvs.person.id} className="row">
            <div className="col-12">{this.personListing(pvs)}</div>
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

  personListing(person_view: PersonViewSafe) {
    return (
      <>
        <span>
          <PersonListing person={person_view.person} showApubName />
        </span>
        <span>{` - ${i18n.t("number_of_comments", {
          count: person_view.counts.comment_count,
          formattedCount: numToSI(person_view.counts.comment_count),
        })}`}</span>
      </>
    );
  }

  communityFilter() {
    return (
      <div className="form-group col-sm-6">
        <label className="col-form-label" htmlFor="community-filter">
          {i18n.t("community")}
        </label>
        <div>
          <select
            className="form-control"
            id="community-filter"
            value={this.state.communityId}
          >
            <option value="0">{i18n.t("all")}</option>
            {this.state.communities.map(cv => (
              <option key={cv.community.id} value={cv.community.id}>
                {communitySelectName(cv)}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  creatorFilter() {
    let creatorPv = this.state.creatorDetails?.person_view;
    return (
      <div className="form-group col-sm-6">
        <label className="col-form-label" htmlFor="creator-filter">
          {capitalizeFirstLetter(i18n.t("creator"))}
        </label>
        <div>
          <select
            className="form-control"
            id="creator-filter"
            value={this.state.creatorId}
          >
            <option value="0">{i18n.t("all")}</option>
            {creatorPv && (
              <option value={creatorPv.person.id}>
                {personSelectName(creatorPv)}
              </option>
            )}
          </select>
        </div>
      </div>
    );
  }

  resultsCount(): number {
    let r = this.state.searchResponse;

    let searchCount = r
      ? r.posts?.length +
        r.comments?.length +
        r.communities?.length +
        r.users?.length
      : 0;

    let resolveRes = this.state.resolveObjectResponse;
    let resObjCount = resolveRes
      ? resolveRes.post ||
        resolveRes.person ||
        resolveRes.community ||
        resolveRes.comment
        ? 1
        : 0
      : 0;

    return resObjCount + searchCount;
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  search() {
    let community_id =
      this.state.communityId == 0 ? undefined : this.state.communityId;
    let creator_id =
      this.state.creatorId == 0 ? undefined : this.state.creatorId;

    let auth = myAuth(false);
    let form: SearchForm = {
      q: this.state.q,
      community_id,
      creator_id,
      type_: this.state.type_,
      sort: this.state.sort,
      listing_type: this.state.listingType,
      page: this.state.page,
      limit: fetchLimit,
      auth,
    };

    let resolveObjectForm: ResolveObject = {
      q: this.state.q,
      auth,
    };

    if (this.state.q != "") {
      this.setState({
        searchResponse: undefined,
        resolveObjectResponse: undefined,
        loading: true,
      });
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
        this.setState({
          resolveObjectResponse: {},
        });
        this.checkFinishedLoading();
      } else {
        toast(i18n.t(msg.error), "danger");
        return;
      }
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg);
      this.setState({ searchResponse: data });
      window.scrollTo(0, 0);
      this.checkFinishedLoading();
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(
        data.comment_view,
        this.state.searchResponse?.comments
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg);
      createPostLikeFindRes(data.post_view, this.state.searchResponse?.posts);
      this.setState(this.state);
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg);
      this.setState({ communities: data.communities });
      this.setupCommunityFilter();
    } else if (op == UserOperation.ResolveObject) {
      let data = wsJsonToRes<ResolveObjectResponse>(msg);
      this.setState({ resolveObjectResponse: data });
      this.checkFinishedLoading();
    }
  }

  checkFinishedLoading() {
    if (this.state.searchResponse && this.state.resolveObjectResponse) {
      this.setState({ loading: false });
    }
  }
}
