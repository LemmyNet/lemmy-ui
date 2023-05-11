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
  PersonView,
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
  Choice,
  QueryParams,
  capitalizeFirstLetter,
  commentsToFlatNodes,
  communityToChoice,
  createCommentLikeRes,
  createPostLikeFindRes,
  debounce,
  enableDownvotes,
  enableNsfw,
  fetchCommunities,
  fetchLimit,
  fetchUsers,
  getIdFromString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  getUpdatedSearchId,
  myAuth,
  numToSI,
  personToChoice,
  restoreScrollPosition,
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
import { SearchableSelect } from "./common/searchable-select";
import { SortSelect } from "./common/sort-select";
import { CommunityLink } from "./community/community-link";
import { PersonListing } from "./person/person-listing";
import { PostListing } from "./post/post-listing";

interface SearchProps {
  q?: string;
  type: SearchType;
  sort: SortType;
  listingType: ListingType;
  communityId?: number | null;
  creatorId?: number | null;
  page: bigint;
}

type FilterType = "creator" | "community";

interface SearchState {
  searchResponse?: SearchResponse;
  communities: CommunityView[];
  creatorDetails?: GetPersonDetailsResponse;
  searchLoading: boolean;
  searchCommunitiesLoading: boolean;
  searchCreatorLoading: boolean;
  siteRes: GetSiteResponse;
  searchText?: string;
  resolveObjectResponse?: ResolveObjectResponse;
  communitySearchOptions: Choice[];
  creatorSearchOptions: Choice[];
}

interface Combined {
  type_: string;
  data: CommentView | PostView | CommunityView | PersonView;
  published: string;
}

const defaultSearchType = "All";
const defaultSortType = "TopAll";
const defaultListingType = "All";

const searchTypes = ["All", "Comments", "Posts", "Communities", "Users", "Url"];

const getSearchQueryParams = () =>
  getQueryParams<SearchProps>({
    q: getSearchQueryFromQuery,
    type: getSearchTypeFromQuery,
    sort: getSortTypeFromQuery,
    listingType: getListingTypeFromQuery,
    communityId: getIdFromString,
    creatorId: getIdFromString,
    page: getPageFromString,
  });

const getSearchQueryFromQuery = (q?: string): string | undefined =>
  q ? decodeURIComponent(q) : undefined;

function getSearchTypeFromQuery(type_?: string): SearchType {
  return type_ ? (type_ as SearchType) : defaultSearchType;
}

function getSortTypeFromQuery(sort?: string): SortType {
  return sort ? (sort as SortType) : defaultSortType;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : defaultListingType;
}

function postViewToCombined(data: PostView): Combined {
  return {
    type_: "posts",
    data,
    published: data.post.published,
  };
}

function commentViewToCombined(data: CommentView): Combined {
  return {
    type_: "comments",
    data,
    published: data.comment.published,
  };
}

function communityViewToCombined(data: CommunityView): Combined {
  return {
    type_: "communities",
    data,
    published: data.community.published,
  };
}

function personViewSafeToCombined(data: PersonView): Combined {
  return {
    type_: "users",
    data,
    published: data.person.published,
  };
}

const Filter = ({
  filterType,
  options,
  onChange,
  onSearch,
  value,
  loading,
}: {
  filterType: FilterType;
  options: Choice[];
  onSearch: (text: string) => void;
  onChange: (choice: Choice) => void;
  value?: number | null;
  loading: boolean;
}) => {
  return (
    <div className="form-group col-sm-6">
      <label className="col-form-label" htmlFor={`${filterType}-filter`}>
        {capitalizeFirstLetter(i18n.t(filterType))}
      </label>
      <SearchableSelect
        id={`${filterType}-filter`}
        options={[
          {
            label: i18n.t("all"),
            value: "0",
          },
        ].concat(options)}
        value={value ?? 0}
        onSearch={onSearch}
        onChange={onChange}
        loading={loading}
      />
    </div>
  );
};

const communityListing = ({
  community,
  counts: { subscribers },
}: CommunityView) =>
  getListing(
    <CommunityLink community={community} />,
    subscribers,
    "number_of_subscribers"
  );

const personListing = ({ person, counts: { comment_count } }: PersonView) =>
  getListing(
    <PersonListing person={person} showApubName />,
    comment_count,
    "number_of_comments"
  );

function getListing(
  listing: JSX.ElementClass,
  count: bigint,
  translationKey: "number_of_comments" | "number_of_subscribers"
) {
  return (
    <>
      <span>{listing}</span>
      <span>{` - ${i18n.t(translationKey, {
        count: Number(count),
        formattedCount: numToSI(count),
      })}`}</span>
    </>
  );
}

export class Search extends Component<any, SearchState> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: SearchState = {
    searchLoading: false,
    siteRes: this.isoData.site_res,
    communities: [],
    searchCommunitiesLoading: false,
    searchCreatorLoading: false,
    creatorSearchOptions: [],
    communitySearchOptions: [],
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
          communitySearchOptions: [
            communityToChoice(communityRes.community_view),
          ],
        };
      }

      const creatorRes = this.isoData.routeData[2] as GetPersonDetailsResponse;

      this.state = {
        ...this.state,
        creatorDetails: creatorRes,
        creatorSearchOptions: creatorRes
          ? [personToChoice(creatorRes.person_view)]
          : [],
      };

      if (q !== "") {
        this.state = {
          ...this.state,
          searchResponse: this.isoData.routeData[3] as SearchResponse,
          resolveObjectResponse: this.isoData
            .routeData[4] as ResolveObjectResponse,
          searchLoading: false,
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

  static fetchInitialData({
    client,
    auth,
    query: { communityId, creatorId, q, type, sort, listingType, page },
  }: InitialFetchRequest<QueryParams<SearchProps>>): Promise<any>[] {
    const promises: Promise<any>[] = [];

    const community_id = getIdFromString(communityId);
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

    const creator_id = getIdFromString(creatorId);
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
        page: getPageFromString(page),
        limit: fetchLimit,
        auth,
      };

      if (query !== "") {
        promises.push(client.search(form));
        if (auth) {
          const resolveObjectForm: ResolveObject = {
            q: query,
            auth,
          };
          promises.push(client.resolveObject(resolveObjectForm));
        }
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
        {this.resultsCount === 0 && !this.state.searchLoading && (
          <span>{i18n.t("no_results")}</span>
        )}
        <Paginator page={page} onChange={this.handlePageChange} />
      </div>
    );
  }

  displayResults(type: SearchType) {
    switch (type) {
      case "All":
        return this.all;
      case "Comments":
        return this.comments;
      case "Posts":
      case "Url":
        return this.posts;
      case "Communities":
        return this.communities;
      case "Users":
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
          {this.state.searchLoading ? (
            <Spinner />
          ) : (
            <span>{i18n.t("search")}</span>
          )}
        </button>
      </form>
    );
  }

  get selects() {
    const { type, listingType, sort, communityId, creatorId } =
      getSearchQueryParams();
    const {
      communitySearchOptions,
      creatorSearchOptions,
      searchCommunitiesLoading,
      searchCreatorLoading,
    } = this.state;

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
          {this.state.communities.length > 0 && (
            <Filter
              filterType="community"
              onChange={this.handleCommunityFilterChange}
              onSearch={this.handleCommunitySearch}
              options={communitySearchOptions}
              loading={searchCommunitiesLoading}
              value={communityId}
            />
          )}
          <Filter
            filterType="creator"
            onChange={this.handleCreatorFilterChange}
            onSearch={this.handleCreatorSearch}
            options={creatorSearchOptions}
            loading={searchCreatorLoading}
            value={creatorId}
          />
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
    if (sort === "New") {
      combined.sort((a, b) => b.published.localeCompare(a.published));
    } else {
      combined.sort((a, b) =>
        Number(
          ((b.data as CommentView | PostView).counts.score |
            (b.data as CommunityView).counts.subscribers |
            (b.data as PersonView).counts.comment_score) -
            ((a.data as CommentView | PostView).counts.score |
              (a.data as CommunityView).counts.subscribers |
              (a.data as PersonView).counts.comment_score)
        )
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
                <div>{personListing(i.data as PersonView)}</div>
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

  search() {
    const auth = myAuth(false);
    const { searchText: q } = this.state;
    const { communityId, creatorId, type, sort, listingType, page } =
      getSearchQueryParams();

    if (q && q !== "") {
      const form: SearchForm = {
        q,
        community_id: communityId ?? undefined,
        creator_id: creatorId ?? undefined,
        type_: type,
        sort,
        listing_type: listingType,
        page,
        limit: fetchLimit,
        auth,
      };

      if (auth) {
        const resolveObjectForm: ResolveObject = {
          q,
          auth,
        };
        WebSocketService.Instance.send(
          wsClient.resolveObject(resolveObjectForm)
        );
      }

      this.setState({
        searchResponse: undefined,
        resolveObjectResponse: undefined,
        searchLoading: true,
      });

      WebSocketService.Instance.send(wsClient.search(form));
    }
  }

  handleCreatorSearch = debounce(async (text: string) => {
    const { creatorId } = getSearchQueryParams();
    const { creatorSearchOptions } = this.state;
    this.setState({
      searchCreatorLoading: true,
    });

    const newOptions: Choice[] = [];

    const selectedChoice = creatorSearchOptions.find(
      choice => getIdFromString(choice.value) === creatorId
    );

    if (selectedChoice) {
      newOptions.push(selectedChoice);
    }

    if (text.length > 0) {
      newOptions.push(...(await fetchUsers(text)).users.map(personToChoice));
    }

    this.setState({
      searchCreatorLoading: false,
      creatorSearchOptions: newOptions,
    });
  });

  handleCommunitySearch = debounce(async (text: string) => {
    const { communityId } = getSearchQueryParams();
    const { communitySearchOptions } = this.state;
    this.setState({
      searchCommunitiesLoading: true,
    });

    const newOptions: Choice[] = [];

    const selectedChoice = communitySearchOptions.find(
      choice => getIdFromString(choice.value) === communityId
    );

    if (selectedChoice) {
      newOptions.push(selectedChoice);
    }

    if (text.length > 0) {
      newOptions.push(
        ...(await fetchCommunities(text)).communities.map(communityToChoice)
      );
    }

    this.setState({
      searchCommunitiesLoading: false,
      communitySearchOptions: newOptions,
    });
  });

  handleSortChange(sort: SortType) {
    this.updateUrl({ sort, page: 1n });
  }

  handleTypeChange(i: Search, event: any) {
    const type = event.target.value as SearchType;

    i.updateUrl({
      type,
      page: 1n,
    });
  }

  handlePageChange(page: bigint) {
    this.updateUrl({ page });
  }

  handleListingTypeChange(listingType: ListingType) {
    this.updateUrl({
      listingType,
      page: 1n,
    });
  }

  handleCommunityFilterChange({ value }: Choice) {
    this.updateUrl({
      communityId: getIdFromString(value) ?? null,
      page: 1n,
    });
  }

  handleCreatorFilterChange({ value }: Choice) {
    this.updateUrl({
      creatorId: getIdFromString(value) ?? null,
      page: 1n,
    });
  }

  handleSearchSubmit(i: Search, event: any) {
    event.preventDefault();

    i.updateUrl({
      q: i.state.searchText,
      page: 1n,
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
      communityId: getUpdatedSearchId(communityId, urlCommunityId),
      creatorId: getUpdatedSearchId(creatorId, urlCreatorId),
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
    if (this.state.searchResponse || this.state.resolveObjectResponse) {
      this.setState({ searchLoading: false });
    }
  }
}
