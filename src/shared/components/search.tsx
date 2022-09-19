import { None, Option, Some } from "@sniptt/monads";
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
  auth,
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
  searchResponse: Option<SearchResponse>;
  communities: CommunityView[];
  creatorDetails: Option<GetPersonDetailsResponse>;
  loading: boolean;
  siteRes: GetSiteResponse;
  searchText: string;
  resolveObjectResponse: Option<ResolveObjectResponse>;
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
  private isoData = setIsoData(
    this.context,
    GetCommunityResponse,
    ListCommunitiesResponse,
    GetPersonDetailsResponse,
    SearchResponse,
    ResolveObjectResponse
  );
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
    searchResponse: None,
    resolveObjectResponse: None,
    creatorDetails: None,
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

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let communityRes = Some(
        this.isoData.routeData[0] as GetCommunityResponse
      );
      let communitiesRes = Some(
        this.isoData.routeData[1] as ListCommunitiesResponse
      );

      // This can be single or multiple communities given
      communitiesRes.match({
        some: res => (this.state.communities = res.communities),
        none: void 0,
      });

      communityRes.match({
        some: res => (this.state.communities = [res.community_view]),
        none: void 0,
      });

      this.state.creatorDetails = Some(
        this.isoData.routeData[2] as GetPersonDetailsResponse
      );

      if (this.state.q != "") {
        this.state.searchResponse = Some(
          this.isoData.routeData[3] as SearchResponse
        );
        this.state.resolveObjectResponse = Some(
          this.isoData.routeData[4] as ResolveObjectResponse
        );
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
    let listCommunitiesForm = new ListCommunities({
      type_: Some(ListingType.All),
      sort: Some(SortType.TopAll),
      limit: Some(fetchLimit),
      page: None,
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    let communityId = this.getCommunityIdFromProps(pathSplit[11]);
    let community_id: Option<number> =
      communityId == 0 ? None : Some(communityId);
    community_id.match({
      some: id => {
        let getCommunityForm = new GetCommunity({
          id: Some(id),
          name: None,
          auth: req.auth,
        });
        promises.push(req.client.getCommunity(getCommunityForm));
        promises.push(Promise.resolve());
      },
      none: () => {
        let listCommunitiesForm = new ListCommunities({
          type_: Some(ListingType.All),
          sort: Some(SortType.TopAll),
          limit: Some(fetchLimit),
          page: None,
          auth: req.auth,
        });
        promises.push(Promise.resolve());
        promises.push(req.client.listCommunities(listCommunitiesForm));
      },
    });

    let creatorId = this.getCreatorIdFromProps(pathSplit[13]);
    let creator_id: Option<number> = creatorId == 0 ? None : Some(creatorId);
    creator_id.match({
      some: id => {
        let getCreatorForm = new GetPersonDetails({
          person_id: Some(id),
          username: None,
          sort: None,
          page: None,
          limit: None,
          community_id: None,
          saved_only: None,
          auth: req.auth,
        });
        promises.push(req.client.getPersonDetails(getCreatorForm));
      },
      none: () => {
        promises.push(Promise.resolve());
      },
    });

    let form = new SearchForm({
      q: this.getSearchQueryFromProps(pathSplit[3]),
      community_id,
      community_name: None,
      creator_id,
      type_: Some(this.getSearchTypeFromProps(pathSplit[5])),
      sort: Some(this.getSortTypeFromProps(pathSplit[7])),
      listing_type: Some(this.getListingTypeFromProps(pathSplit[9])),
      page: Some(this.getPageFromProps(pathSplit[15])),
      limit: Some(fetchLimit),
      auth: req.auth,
    });

    let resolveObjectForm = new ResolveObject({
      q: this.getSearchQueryFromProps(pathSplit[3]),
      auth: req.auth,
    });

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
        searchResponse: None,
        resolveObjectResponse: None,
      });
      this.search();
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView =>
        this.state.q
          ? `${i18n.t("search")} - ${this.state.q} - ${siteView.site.name}`
          : `${i18n.t("search")} - ${siteView.site.name}`,
      none: "",
    });
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
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
          minLength={1}
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
            showSubscribed
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
    this.state.resolveObjectResponse.match({
      some: res => {
        let resolveComment = res.comment;
        if (resolveComment.isSome()) {
          combined.push(this.commentViewToCombined(resolveComment.unwrap()));
        }
        let resolvePost = res.post;
        if (resolvePost.isSome()) {
          combined.push(this.postViewToCombined(resolvePost.unwrap()));
        }
        let resolveCommunity = res.community;
        if (resolveCommunity.isSome()) {
          combined.push(
            this.communityViewToCombined(resolveCommunity.unwrap())
          );
        }
        let resolveUser = res.person;
        if (resolveUser.isSome()) {
          combined.push(this.personViewSafeToCombined(resolveUser.unwrap()));
        }
      },
      none: void 0,
    });

    // Push the search results
    this.state.searchResponse.match({
      some: res => {
        pushNotNull(
          combined,
          res.comments?.map(e => this.commentViewToCombined(e))
        );
        pushNotNull(
          combined,
          res.posts?.map(e => this.postViewToCombined(e))
        );
        pushNotNull(
          combined,
          res.communities?.map(e => this.communityViewToCombined(e))
        );
        pushNotNull(
          combined,
          res.users?.map(e => this.personViewSafeToCombined(e))
        );
      },
      none: void 0,
    });

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
                  duplicates={None}
                  moderators={None}
                  admins={None}
                  showCommunity
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  enableNsfw={enableNsfw(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
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
                  moderators={None}
                  admins={None}
                  maxCommentsShown={None}
                  locked
                  noIndent
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
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

    this.state.resolveObjectResponse.match({
      some: res => pushNotNull(comments, res.comment),
      none: void 0,
    });
    this.state.searchResponse.match({
      some: res => pushNotNull(comments, res.comments),
      none: void 0,
    });

    return (
      <CommentNodes
        nodes={commentsToFlatNodes(comments)}
        viewType={CommentViewType.Flat}
        locked
        noIndent
        moderators={None}
        admins={None}
        maxCommentsShown={None}
        enableDownvotes={enableDownvotes(this.state.siteRes)}
        allLanguages={this.state.siteRes.all_languages}
      />
    );
  }

  posts() {
    let posts: PostView[] = [];

    this.state.resolveObjectResponse.match({
      some: res => pushNotNull(posts, res.post),
      none: void 0,
    });
    this.state.searchResponse.match({
      some: res => pushNotNull(posts, res.posts),
      none: void 0,
    });

    return (
      <>
        {posts.map(post => (
          <div class="row">
            <div class="col-12">
              <PostListing
                post_view={post}
                showCommunity
                duplicates={None}
                moderators={None}
                admins={None}
                enableDownvotes={enableDownvotes(this.state.siteRes)}
                enableNsfw={enableNsfw(this.state.siteRes)}
                allLanguages={this.state.siteRes.all_languages}
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  communities() {
    let communities: CommunityView[] = [];

    this.state.resolveObjectResponse.match({
      some: res => pushNotNull(communities, res.community),
      none: void 0,
    });
    this.state.searchResponse.match({
      some: res => pushNotNull(communities, res.communities),
      none: void 0,
    });

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

    this.state.resolveObjectResponse.match({
      some: res => pushNotNull(users, res.person),
      none: void 0,
    });
    this.state.searchResponse.match({
      some: res => pushNotNull(users, res.users),
      none: void 0,
    });

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
            {this.state.creatorDetails.match({
              some: creator => (
                <option value={creator.person_view.person.id}>
                  {personSelectName(creator.person_view)}
                </option>
              ),
              none: <></>,
            })}
          </select>
        </div>
      </div>
    );
  }

  resultsCount(): number {
    let searchCount = this.state.searchResponse
      .map(
        r =>
          r.posts?.length +
          r.comments?.length +
          r.communities?.length +
          r.users?.length
      )
      .unwrapOr(0);

    let resObjCount = this.state.resolveObjectResponse
      .map(r => (r.post || r.person || r.community || r.comment ? 1 : 0))
      .unwrapOr(0);

    return resObjCount + searchCount;
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  search() {
    let community_id: Option<number> =
      this.state.communityId == 0 ? None : Some(this.state.communityId);
    let creator_id: Option<number> =
      this.state.creatorId == 0 ? None : Some(this.state.creatorId);

    let form = new SearchForm({
      q: this.state.q,
      community_id,
      community_name: None,
      creator_id,
      type_: Some(this.state.type_),
      sort: Some(this.state.sort),
      listing_type: Some(this.state.listingType),
      page: Some(this.state.page),
      limit: Some(fetchLimit),
      auth: auth(false).ok(),
    });

    let resolveObjectForm = new ResolveObject({
      q: this.state.q,
      auth: auth(false).ok(),
    });

    if (this.state.q != "") {
      this.state.searchResponse = None;
      this.state.resolveObjectResponse = None;
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
        this.state.resolveObjectResponse = Some({
          comment: None,
          post: None,
          community: None,
          person: None,
        });
        this.checkFinishedLoading();
      } else {
        toast(i18n.t(msg.error), "danger");
        return;
      }
    } else if (op == UserOperation.Search) {
      let data = wsJsonToRes<SearchResponse>(msg, SearchResponse);
      this.state.searchResponse = Some(data);
      window.scrollTo(0, 0);
      this.checkFinishedLoading();
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      createCommentLikeRes(
        data.comment_view,
        this.state.searchResponse.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      createPostLikeFindRes(
        data.post_view,
        this.state.searchResponse.map(r => r.posts).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(
        msg,
        ListCommunitiesResponse
      );
      this.state.communities = data.communities;
      this.setState(this.state);
      this.setupCommunityFilter();
    } else if (op == UserOperation.ResolveObject) {
      let data = wsJsonToRes<ResolveObjectResponse>(msg, ResolveObjectResponse);
      this.state.resolveObjectResponse = Some(data);
      this.checkFinishedLoading();
    }
  }

  checkFinishedLoading() {
    if (
      this.state.searchResponse.isSome() &&
      this.state.resolveObjectResponse.isSome()
    ) {
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
