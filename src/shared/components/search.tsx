import type Choice from "choices.js";
import type { NoOptionI18nKeys } from "i18next";
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
  ChoicesValue,
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
  getQueryParams,
  getQueryString,
  isBrowser,
  myAuth,
  numToSI,
  personSelectName,
  personToChoice,
  QueryParams,
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

let Choices: typeof Choice;
if (isBrowser()) {
  Choices = require("choices.js");
}

interface SearchProps {
  q?: string;
  type: SearchType;
  sort: SortType;
  listingType: ListingType;
  communityId?: number;
  creatorId?: number;
  page: number;
}

type FilterType = "creator" | "community";

interface SearchState {
  searchResponse?: SearchResponse;
  communities: CommunityView[];
  creatorDetails?: GetPersonDetailsResponse;
  loading: boolean;
  siteRes: GetSiteResponse;
  searchText?: string;
  resolveObjectResponse?: ResolveObjectResponse;
}

interface Combined {
  type_: string;
  data: CommentView | PostView | CommunityView | PersonViewSafe;
  published: string;
}

const defaultSearchType = SearchType.All;
const defaultSortType = SortType.TopAll;
const defaultListingType = ListingType.All;

const searchTypes = [
  SearchType.All,
  SearchType.Comments,
  SearchType.Posts,
  SearchType.Communities,
  SearchType.Users,
  SearchType.Url,
];

function getSearchQueryParams(): SearchProps {
  const { q, type, sort, listingType, communityId, creatorId, page } =
    getQueryParams<QueryParams<SearchProps>>();

  return {
    q: getSearchQueryFromQuery(q),
    type: getSearchTypeFromQuery(type),
    sort: getSortTypeFromQuery(sort),
    listingType: getListingTypeFromQuery(listingType),
    communityId: getCommunityIdFromQuery(communityId),
    creatorId: getCreatorIdFromQuery(creatorId),
    page: getPageFromQuery(page),
  };
}

const getSearchQueryFromQuery = (q?: string): string | undefined =>
  q ? decodeURIComponent(q) : undefined;

const getSearchTypeFromQuery = (type_?: string): SearchType =>
  routeSearchTypeToEnum(type_ ?? "", defaultSearchType);

const getSortTypeFromQuery = (sort?: string): SortType =>
  routeSortTypeToEnum(sort ?? "", defaultSortType);

const getListingTypeFromQuery = (listingType?: string): ListingType =>
  routeListingTypeToEnum(listingType ?? "", defaultListingType);

const getCommunityIdFromQuery = (id?: string): number | undefined =>
  id ? Number(id) : undefined;

const getCreatorIdFromQuery = (id?: string): number | undefined =>
  id ? Number(id) : undefined;

const getPageFromQuery = (page?: string): number => (page ? Number(page) : 1);

const postViewToCombined = (data: PostView): Combined => ({
  type_: "posts",
  data,
  published: data.post.published,
});

const commentViewToCombined = (data: CommentView): Combined => ({
  type_: "comments",
  data,
  published: data.comment.published,
});

const communityViewToCombined = (data: CommunityView): Combined => ({
  type_: "communities",
  data,
  published: data.community.published,
});

const personViewSafeToCombined = (data: PersonViewSafe): Combined => ({
  type_: "users",
  data,
  published: data.person.published,
});

function getFilter(
  filterType: FilterType,
  selectedId: number | undefined,
  options: { value: number; label: string }[]
) {
  const elementId = `${filterType}-filter`;

  return (
    <div className="form-group col-sm-6">
      <label className="col-form-label" htmlFor={elementId}>
        {capitalizeFirstLetter(i18n.t(filterType))}
      </label>
      <div>
        <select className="form-control" id={elementId} value={selectedId}>
          <option value={0}>{i18n.t("all")}</option>
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const communityListing = ({
  community,
  counts: { subscribers },
}: CommunityView) =>
  getListing(
    <CommunityLink community={community} />,
    subscribers,
    "number_of_subscribers"
  );

const personListing = ({ person, counts: { comment_count } }: PersonViewSafe) =>
  getListing(
    <PersonListing person={person} showApubName />,
    comment_count,
    "number_of_comments"
  );

const getListing = (
  listing: JSX.Element,
  count: number,
  translationKey: "number_of_comments" | "number_of_subscribers"
) => (
  <>
    <span>{listing}</span>
    <span>{` - ${i18n.t(translationKey, {
      count,
      formattedCount: numToSI(count),
    })}`}</span>
  </>
);

export class Search extends Component<any, SearchState> {
  private isoData = setIsoData(this.context);
  private choices = {} as {
    community: Choice;
    creator: Choice;
  };
  private subscription?: Subscription;
  state: SearchState = {
    loading: false,
    siteRes: this.isoData.site_res,
    communities: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleCommunityFilterChange =
      this.handleCommunityFilterChange.bind(this);
    this.handleCreatorFilterChange = this.handleCreatorFilterChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    const { q } = getSearchQueryParams();

    this.state = {
      ...this.state,
      searchText: q,
    };

    // Only fetch the data if coming from another route
    if (this.isoData.path === this.context.router.route.match.url) {
      const communityRes = this.isoData.routeData[0] as
        | GetCommunityResponse
        | undefined;
      const communitiesRes = this.isoData.routeData[1] as
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

      if (q !== "") {
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
      const listCommunitiesForm: ListCommunities = {
        type_: defaultListingType,
        sort: defaultSortType,
        limit: fetchLimit,
        auth: myAuth(false),
      };

      WebSocketService.Instance.send(
        wsClient.listCommunities(listCommunitiesForm)
      );

      if (q) {
        this.search();
      }
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

  static fetchInitialData({
    client,
    auth,
    query: { communityId, creatorId, q, type, sort, listingType, page },
  }: InitialFetchRequest<QueryParams<SearchProps>>): Promise<any>[] {
    const promises: Promise<any>[] = [];

    const community_id = getCommunityIdFromQuery(communityId);
    if (community_id) {
      const getCommunityForm: GetCommunity = {
        id: community_id,
        auth,
      };
      promises.push(client.getCommunity(getCommunityForm));
      promises.push(Promise.resolve());
    } else {
      const listCommunitiesForm: ListCommunities = {
        type_: defaultListingType,
        sort: defaultSortType,
        limit: fetchLimit,
        auth,
      };
      promises.push(Promise.resolve());
      promises.push(client.listCommunities(listCommunitiesForm));
    }

    const creator_id = getCreatorIdFromQuery(creatorId);
    if (creator_id) {
      const getCreatorForm: GetPersonDetails = {
        person_id: creator_id,
        auth,
      };
      promises.push(client.getPersonDetails(getCreatorForm));
    } else {
      promises.push(Promise.resolve());
    }

    const query = getSearchQueryFromQuery(q);

    if (query) {
      const form: SearchForm = {
        q: query,
        community_id,
        creator_id,
        type_: getSearchTypeFromQuery(type),
        sort: getSortTypeFromQuery(sort),
        listing_type: getListingTypeFromQuery(listingType),
        page: getPageFromQuery(page),
        limit: fetchLimit,
        auth,
      };

      const resolveObjectForm: ResolveObject = {
        q: query,
        auth,
      };

      if (query !== "") {
        promises.push(client.search(form));
        promises.push(client.resolveObject(resolveObjectForm));
      } else {
        promises.push(Promise.resolve());
        promises.push(Promise.resolve());
      }
    }

    return promises;
  }

  get documentTitle(): string {
    const { q } = getSearchQueryParams();
    const name = this.state.siteRes.site_view.site.name;
    return `${i18n.t("search")} - ${q ? `${q} - ` : ""}${name}`;
  }

  render() {
    const { type, page } = getSearchQueryParams();

    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <h5>{i18n.t("search")}</h5>
        {this.selects}
        {this.searchForm}
        {this.displayResults(type)}
        {this.resultsCount === 0 && <span>{i18n.t("no_results")}</span>}
        <Paginator page={page} onChange={this.handlePageChange} />
      </div>
    );
  }

  displayResults(type: SearchType) {
    switch (type) {
      case SearchType.All:
        return this.all;
      case SearchType.Comments:
        return this.comments;
      case SearchType.Posts:
      case SearchType.Url:
        return this.posts;
      case SearchType.Communities:
        return this.communities;
      case SearchType.Users:
        return this.users;
      default:
        return <></>;
    }
  }

  get searchForm() {
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

  get selects() {
    const { type, listingType, sort } = getSearchQueryParams();

    return (
      <div className="mb-2">
        <select
          value={type}
          onChange={linkEvent(this, this.handleTypeChange)}
          className="custom-select w-auto mb-2"
          aria-label={i18n.t("type")}
        >
          <option disabled aria-hidden="true">
            {i18n.t("type")}
          </option>
          {searchTypes.map(option => (
            <option value={option} key={option}>
              {i18n.t(option.toString().toLowerCase() as NoOptionI18nKeys)}
            </option>
          ))}
        </select>
        <span className="ml-2">
          <ListingTypeSelect
            type_={listingType}
            showLocal={showLocal(this.isoData)}
            showSubscribed
            onChange={this.handleListingTypeChange}
          />
        </span>
        <span className="ml-2">
          <SortSelect
            sort={sort}
            onChange={this.handleSortChange}
            hideHot
            hideMostComments
          />
        </span>
        <div className="form-row">
          {this.state.communities.length > 0 && this.communityFilter}
          {this.creatorFilter}
        </div>
      </div>
    );
  }

  buildCombined(): Combined[] {
    const combined: Combined[] = [];
    const { resolveObjectResponse, searchResponse } = this.state;

    // Push the possible resolve / federated objects first
    if (resolveObjectResponse) {
      const { comment, post, community, person } = resolveObjectResponse;

      if (comment) {
        combined.push(commentViewToCombined(comment));
      }
      if (post) {
        combined.push(postViewToCombined(post));
      }
      if (community) {
        combined.push(communityViewToCombined(community));
      }
      if (person) {
        combined.push(personViewSafeToCombined(person));
      }
    }

    // Push the search results
    if (searchResponse) {
      const { comments, posts, communities, users } = searchResponse;

      combined.push(
        ...[
          ...(comments?.map(commentViewToCombined) ?? []),
          ...(posts?.map(postViewToCombined) ?? []),
          ...(communities?.map(communityViewToCombined) ?? []),
          ...(users?.map(personViewSafeToCombined) ?? []),
        ]
      );
    }

    const { sort } = getSearchQueryParams();

    // Sort it
    if (sort === SortType.New) {
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

  get all() {
    const combined = this.buildCombined();

    return (
      <div>
        {combined.map(i => (
          <div key={i.published} className="row">
            <div className="col-12">
              {i.type_ === "posts" && (
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
              {i.type_ === "comments" && (
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
              {i.type_ === "communities" && (
                <div>{communityListing(i.data as CommunityView)}</div>
              )}
              {i.type_ === "users" && (
                <div>{personListing(i.data as PersonViewSafe)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  get comments() {
    const { searchResponse, resolveObjectResponse, siteRes } = this.state;
    const comments = searchResponse?.comments ?? [];

    if (resolveObjectResponse?.comment) {
      comments.unshift(resolveObjectResponse?.comment);
    }

    return (
      <CommentNodes
        nodes={commentsToFlatNodes(comments)}
        viewType={CommentViewType.Flat}
        viewOnly
        locked
        noIndent
        enableDownvotes={enableDownvotes(siteRes)}
        allLanguages={siteRes.all_languages}
        siteLanguages={siteRes.discussion_languages}
      />
    );
  }

  get posts() {
    const { searchResponse, resolveObjectResponse, siteRes } = this.state;
    const posts = searchResponse?.posts ?? [];

    if (resolveObjectResponse?.post) {
      posts.unshift(resolveObjectResponse.post);
    }

    return (
      <>
        {posts.map(pv => (
          <div key={pv.post.id} className="row">
            <div className="col-12">
              <PostListing
                post_view={pv}
                showCommunity
                enableDownvotes={enableDownvotes(siteRes)}
                enableNsfw={enableNsfw(siteRes)}
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
                viewOnly
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  get communities() {
    const { searchResponse, resolveObjectResponse } = this.state;
    const communities = searchResponse?.communities ?? [];

    if (resolveObjectResponse?.community) {
      communities.unshift(resolveObjectResponse.community);
    }

    return (
      <>
        {communities.map(cv => (
          <div key={cv.community.id} className="row">
            <div className="col-12">{communityListing(cv)}</div>
          </div>
        ))}
      </>
    );
  }

  get users() {
    const { searchResponse, resolveObjectResponse } = this.state;
    const users = searchResponse?.users ?? [];

    if (resolveObjectResponse?.person) {
      users.unshift(resolveObjectResponse.person);
    }

    return (
      <>
        {users.map(pvs => (
          <div key={pvs.person.id} className="row">
            <div className="col-12">{personListing(pvs)}</div>
          </div>
        ))}
      </>
    );
  }

  get communityFilter() {
    const { communityId } = getSearchQueryParams();

    return getFilter(
      "community",
      communityId,
      this.state.communities.map(cv => ({
        value: cv.community.id,
        label: communitySelectName(cv),
      }))
    );
  }

  get creatorFilter() {
    const creatorPv = this.state.creatorDetails?.person_view;
    const { creatorId } = getSearchQueryParams();

    return getFilter(
      "creator",
      creatorId,
      creatorPv
        ? [{ value: creatorPv.person.id, label: personSelectName(creatorPv) }]
        : []
    );
  }

  get resultsCount(): number {
    const { searchResponse: r, resolveObjectResponse: resolveRes } = this.state;

    const searchCount = r
      ? r.posts.length +
        r.comments.length +
        r.communities.length +
        r.users.length
      : 0;

    const resObjCount = resolveRes
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
    const auth = myAuth(false);
    const { searchText: q } = this.state;
    const { communityId, creatorId, type, sort, listingType, page } =
      getSearchQueryParams();

    if (q && q !== "") {
      const form: SearchForm = {
        q,
        community_id: communityId,
        creator_id: creatorId,
        type_: type,
        sort,
        listing_type: listingType,
        page,
        limit: fetchLimit,
        auth,
      };

      const resolveObjectForm: ResolveObject = {
        q,
        auth,
      };

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
    this.setupFilter("community", this.handleCommunityFilterChange, async val =>
      (await fetchCommunities(val)).communities.map(communityToChoice)
    );
  }

  setupCreatorFilter() {
    this.setupFilter("creator", this.handleCreatorFilterChange, async val =>
      (await fetchUsers(val)).users.map(personToChoice)
    );
  }

  setupFilter(
    filterType: FilterType,
    handleFilterChange: (id: number) => void,
    fetchChoices: (val: any) => Promise<ChoicesValue[]>
  ) {
    if (isBrowser()) {
      const selectId: any = document.getElementById(`${filterType}-filter`);
      if (selectId) {
        this.choices[filterType] = new Choices(selectId, choicesConfig);
        this.choices[filterType].passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            handleFilterChange(Number(e.detail.choice.value));
          }
        );
        this.choices[filterType].passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              const result = await fetchChoices(e.detail.value);
              result.unshift({ value: "0", label: i18n.t("all") });
              this.choices[filterType].setChoices(
                result,
                "value",
                "label",
                true
              );
            } catch (err) {
              console.log(err);
            }
          })
        );
      }
    }
  }

  handleSortChange(sort: SortType) {
    this.updateUrl({ sort, page: 1 });
  }

  handleTypeChange(i: Search, event: any) {
    const type = SearchType[event.target.value];

    i.updateUrl({
      type,
      page: 1,
    });
  }

  handleListingTypeChange(listingType: ListingType) {
    this.updateUrl({
      listingType,
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
      page: 1,
    });
  }

  handleQChange(i: Search, event: any) {
    i.setState({ searchText: event.target.value });
  }

  updateUrl({
    q,
    type,
    listingType,
    sort,
    communityId,
    creatorId,
    page,
  }: Partial<SearchProps>) {
    const {
      q: urlQ,
      type: urlType,
      listingType: urlListingType,
      communityId: urlCommunityId,
      sort: urlSort,
      creatorId: urlCreatorId,
      page: urlPage,
    } = getSearchQueryParams();

    let query = q ?? this.state.searchText ?? urlQ;

    if (query && query.length > 0) {
      query = encodeURIComponent(query);
    }

    const queryParams: QueryParams<SearchProps> = {
      q: query,
      type: type ?? urlType,
      listingType: listingType ?? urlListingType,
      communityId: (communityId ?? urlCommunityId)?.toString(),
      creatorId: (creatorId ?? urlCreatorId)?.toString(),
      page: (page ?? urlPage).toString(),
      sort: sort ?? urlSort,
    };

    this.props.history.push(`/search${getQueryString(queryParams)}`);

    this.search();
  }

  parseMessage(msg: any) {
    console.log(msg);
    const op = wsUserOp(msg);
    if (msg.error) {
      if (msg.error === "couldnt_find_object") {
        this.setState({
          resolveObjectResponse: {},
        });
        this.checkFinishedLoading();
      } else {
        toast(i18n.t(msg.error), "danger");
      }
    } else {
      switch (op) {
        case UserOperation.Search: {
          const searchResponse = wsJsonToRes<SearchResponse>(msg);
          this.setState({ searchResponse });
          window.scrollTo(0, 0);
          this.checkFinishedLoading();
          restoreScrollPosition(this.context);

          break;
        }

        case UserOperation.CreateCommentLike: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          createCommentLikeRes(
            comment_view,
            this.state.searchResponse?.comments
          );

          break;
        }

        case UserOperation.CreatePostLike: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);
          createPostLikeFindRes(post_view, this.state.searchResponse?.posts);

          break;
        }

        case UserOperation.ListCommunities: {
          const { communities } = wsJsonToRes<ListCommunitiesResponse>(msg);
          this.setState({ communities });
          this.setupCommunityFilter();

          break;
        }

        case UserOperation.ResolveObject: {
          const resolveObjectResponse = wsJsonToRes<ResolveObjectResponse>(msg);
          this.setState({ resolveObjectResponse });
          this.checkFinishedLoading();

          break;
        }
      }
    }
  }

  checkFinishedLoading() {
    if (this.state.searchResponse && this.state.resolveObjectResponse) {
      this.setState({ loading: false });
    }
  }
}
