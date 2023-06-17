import type { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import {
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
  PostView,
  ResolveObject,
  ResolveObjectResponse,
  Search as SearchForm,
  SearchResponse,
  SearchType,
  SortType,
} from "lemmy-js-client";
import { i18n } from "../i18next";
import { CommentViewType, InitialFetchRequest } from "../interfaces";
import { FirstLoadService } from "../services/FirstLoadService";
import { HttpService, RequestState } from "../services/HttpService";
import {
  Choice,
  QueryParams,
  RouteDataResponse,
  capitalizeFirstLetter,
  commentsToFlatNodes,
  communityToChoice,
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
  page: number;
}

type SearchData = RouteDataResponse<{
  communityResponse: GetCommunityResponse;
  listCommunitiesResponse: ListCommunitiesResponse;
  creatorDetailsResponse: GetPersonDetailsResponse;
  searchResponse: SearchResponse;
  resolveObjectResponse: ResolveObjectResponse;
}>;

type FilterType = "creator" | "community";

interface SearchState {
  searchRes: RequestState<SearchResponse>;
  resolveObjectRes: RequestState<ResolveObjectResponse>;
  creatorDetailsRes: RequestState<GetPersonDetailsResponse>;
  communitiesRes: RequestState<ListCommunitiesResponse>;
  communityRes: RequestState<GetCommunityResponse>;
  siteRes: GetSiteResponse;
  searchText?: string;
  communitySearchOptions: Choice[];
  creatorSearchOptions: Choice[];
  searchCreatorLoading: boolean;
  searchCommunitiesLoading: boolean;
  isIsomorphic: boolean;
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
  count: number,
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
  private isoData = setIsoData<SearchData>(this.context);

  state: SearchState = {
    resolveObjectRes: { state: "empty" },
    creatorDetailsRes: { state: "empty" },
    communitiesRes: { state: "empty" },
    communityRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    creatorSearchOptions: [],
    communitySearchOptions: [],
    searchRes: { state: "empty" },
    searchCreatorLoading: false,
    searchCommunitiesLoading: false,
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleCommunityFilterChange =
      this.handleCommunityFilterChange.bind(this);
    this.handleCreatorFilterChange = this.handleCreatorFilterChange.bind(this);

    const { q } = getSearchQueryParams();

    this.state = {
      ...this.state,
      searchText: q,
    };

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const {
        communityResponse: communityRes,
        creatorDetailsResponse: creatorDetailsRes,
        listCommunitiesResponse: communitiesRes,
        resolveObjectResponse: resolveObjectRes,
        searchResponse: searchRes,
      } = this.isoData.routeData;

      this.state = {
        ...this.state,
        isIsomorphic: true,
      };

      if (creatorDetailsRes?.state === "success") {
        this.state = {
          ...this.state,
          creatorSearchOptions:
            creatorDetailsRes?.state === "success"
              ? [personToChoice(creatorDetailsRes.data.person_view)]
              : [],
          creatorDetailsRes,
        };
      }

      if (communitiesRes?.state === "success") {
        this.state = {
          ...this.state,
          communitiesRes,
        };
      }

      if (communityRes?.state === "success") {
        this.state = {
          ...this.state,
          communityRes,
        };
      }

      if (q !== "") {
        this.state = {
          ...this.state,
        };

        if (searchRes?.state === "success") {
          this.state = {
            ...this.state,
            searchRes,
          };
        }

        if (resolveObjectRes?.state === "success") {
          this.state = {
            ...this.state,
            resolveObjectRes,
          };
        }
      }
    }
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      const promises = [this.fetchCommunities()];
      if (this.state.searchText) {
        promises.push(this.search());
      }

      await Promise.all(promises);
    }
  }

  async fetchCommunities() {
    this.setState({ communitiesRes: { state: "loading" } });
    this.setState({
      communitiesRes: await HttpService.client.listCommunities({
        type_: defaultListingType,
        sort: defaultSortType,
        limit: fetchLimit,
        auth: myAuth(),
      }),
    });
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
  }

  static async fetchInitialData({
    client,
    auth,
    query: { communityId, creatorId, q, type, sort, listingType, page },
  }: InitialFetchRequest<QueryParams<SearchProps>>): Promise<SearchData> {
    const community_id = getIdFromString(communityId);
    let communityResponse: RequestState<GetCommunityResponse> = {
      state: "empty",
    };
    let listCommunitiesResponse: RequestState<ListCommunitiesResponse> = {
      state: "empty",
    };
    if (community_id) {
      const getCommunityForm: GetCommunity = {
        id: community_id,
        auth,
      };

      communityResponse = await client.getCommunity(getCommunityForm);
    } else {
      const listCommunitiesForm: ListCommunities = {
        type_: defaultListingType,
        sort: defaultSortType,
        limit: fetchLimit,
        auth,
      };

      listCommunitiesResponse = await client.listCommunities(
        listCommunitiesForm
      );
    }

    const creator_id = getIdFromString(creatorId);
    let creatorDetailsResponse: RequestState<GetPersonDetailsResponse> = {
      state: "empty",
    };
    if (creator_id) {
      const getCreatorForm: GetPersonDetails = {
        person_id: creator_id,
        auth,
      };

      creatorDetailsResponse = await client.getPersonDetails(getCreatorForm);
    }

    const query = getSearchQueryFromQuery(q);

    let searchResponse: RequestState<SearchResponse> = { state: "empty" };
    let resolveObjectResponse: RequestState<ResolveObjectResponse> = {
      state: "empty",
    };

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
        searchResponse = await client.search(form);
        if (auth) {
          const resolveObjectForm: ResolveObject = {
            q: query,
            auth,
          };
          resolveObjectResponse = await client.resolveObject(resolveObjectForm);
        }
      }
    }

    return {
      communityResponse,
      creatorDetailsResponse,
      listCommunitiesResponse,
      resolveObjectResponse,
      searchResponse,
    };
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
        {this.resultsCount === 0 &&
          this.state.searchRes.state === "success" && (
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
          {this.state.searchRes.state === "loading" ? (
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
      communitiesRes,
    } = this.state;

    const hasCommunities =
      communitiesRes.state == "success" &&
      communitiesRes.data.communities.length > 0;

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
          {hasCommunities && (
            <Filter
              filterType="community"
              onChange={this.handleCommunityFilterChange}
              onSearch={this.handleCommunitySearch}
              options={communitySearchOptions}
              value={communityId}
              loading={searchCommunitiesLoading}
            />
          )}
          <Filter
            filterType="creator"
            onChange={this.handleCreatorFilterChange}
            onSearch={this.handleCreatorSearch}
            options={creatorSearchOptions}
            value={creatorId}
            loading={searchCreatorLoading}
          />
        </div>
      </div>
    );
  }

  buildCombined(): Combined[] {
    const combined: Combined[] = [];
    const {
      resolveObjectRes: resolveObjectResponse,
      searchRes: searchResponse,
    } = this.state;

    // Push the possible resolve / federated objects first
    if (resolveObjectResponse.state == "success") {
      const { comment, post, community, person } = resolveObjectResponse.data;

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
    if (searchResponse.state === "success") {
      const { comments, posts, communities, users } = searchResponse.data;

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
                  // All of these are unused, since its view only
                  onPostEdit={() => {}}
                  onPostVote={() => {}}
                  onPostReport={() => {}}
                  onBlockPerson={() => {}}
                  onLockPost={() => {}}
                  onDeletePost={() => {}}
                  onRemovePost={() => {}}
                  onSavePost={() => {}}
                  onFeaturePost={() => {}}
                  onPurgePerson={() => {}}
                  onPurgePost={() => {}}
                  onBanPersonFromCommunity={() => {}}
                  onBanPerson={() => {}}
                  onAddModToCommunity={() => {}}
                  onAddAdmin={() => {}}
                  onTransferCommunity={() => {}}
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
                  // All of these are unused, since its viewonly
                  finished={new Map()}
                  onSaveComment={() => {}}
                  onBlockPerson={() => {}}
                  onDeleteComment={() => {}}
                  onRemoveComment={() => {}}
                  onCommentVote={() => {}}
                  onCommentReport={() => {}}
                  onDistinguishComment={() => {}}
                  onAddModToCommunity={() => {}}
                  onAddAdmin={() => {}}
                  onTransferCommunity={() => {}}
                  onPurgeComment={() => {}}
                  onPurgePerson={() => {}}
                  onCommentReplyRead={() => {}}
                  onPersonMentionRead={() => {}}
                  onBanPersonFromCommunity={() => {}}
                  onBanPerson={() => {}}
                  onCreateComment={() => Promise.resolve({ state: "empty" })}
                  onEditComment={() => Promise.resolve({ state: "empty" })}
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
    const {
      searchRes: searchResponse,
      resolveObjectRes: resolveObjectResponse,
      siteRes,
    } = this.state;
    const comments =
      searchResponse.state === "success" ? searchResponse.data.comments : [];

    if (
      resolveObjectResponse.state === "success" &&
      resolveObjectResponse.data.comment
    ) {
      comments.unshift(resolveObjectResponse.data.comment);
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
        // All of these are unused, since its viewonly
        finished={new Map()}
        onSaveComment={() => {}}
        onBlockPerson={() => {}}
        onDeleteComment={() => {}}
        onRemoveComment={() => {}}
        onCommentVote={() => {}}
        onCommentReport={() => {}}
        onDistinguishComment={() => {}}
        onAddModToCommunity={() => {}}
        onAddAdmin={() => {}}
        onTransferCommunity={() => {}}
        onPurgeComment={() => {}}
        onPurgePerson={() => {}}
        onCommentReplyRead={() => {}}
        onPersonMentionRead={() => {}}
        onBanPersonFromCommunity={() => {}}
        onBanPerson={() => {}}
        onCreateComment={() => Promise.resolve({ state: "empty" })}
        onEditComment={() => Promise.resolve({ state: "empty" })}
      />
    );
  }

  get posts() {
    const {
      searchRes: searchResponse,
      resolveObjectRes: resolveObjectResponse,
      siteRes,
    } = this.state;
    const posts =
      searchResponse.state === "success" ? searchResponse.data.posts : [];

    if (
      resolveObjectResponse.state === "success" &&
      resolveObjectResponse.data.post
    ) {
      posts.unshift(resolveObjectResponse.data.post);
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
                // All of these are unused, since its view only
                onPostEdit={() => {}}
                onPostVote={() => {}}
                onPostReport={() => {}}
                onBlockPerson={() => {}}
                onLockPost={() => {}}
                onDeletePost={() => {}}
                onRemovePost={() => {}}
                onSavePost={() => {}}
                onFeaturePost={() => {}}
                onPurgePerson={() => {}}
                onPurgePost={() => {}}
                onBanPersonFromCommunity={() => {}}
                onBanPerson={() => {}}
                onAddModToCommunity={() => {}}
                onAddAdmin={() => {}}
                onTransferCommunity={() => {}}
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  get communities() {
    const {
      searchRes: searchResponse,
      resolveObjectRes: resolveObjectResponse,
    } = this.state;
    const communities =
      searchResponse.state === "success" ? searchResponse.data.communities : [];

    if (
      resolveObjectResponse.state === "success" &&
      resolveObjectResponse.data.community
    ) {
      communities.unshift(resolveObjectResponse.data.community);
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
    const {
      searchRes: searchResponse,
      resolveObjectRes: resolveObjectResponse,
    } = this.state;
    const users =
      searchResponse.state === "success" ? searchResponse.data.users : [];

    if (
      resolveObjectResponse.state === "success" &&
      resolveObjectResponse.data.person
    ) {
      users.unshift(resolveObjectResponse.data.person);
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
    const { searchRes: r, resolveObjectRes: resolveRes } = this.state;

    const searchCount =
      r.state === "success"
        ? r.data.posts.length +
          r.data.comments.length +
          r.data.communities.length +
          r.data.users.length
        : 0;

    const resObjCount =
      resolveRes.state === "success"
        ? resolveRes.data.post ||
          resolveRes.data.person ||
          resolveRes.data.community ||
          resolveRes.data.comment
          ? 1
          : 0
        : 0;

    return resObjCount + searchCount;
  }

  async search() {
    const auth = myAuth();
    const { searchText: q } = this.state;
    const { communityId, creatorId, type, sort, listingType, page } =
      getSearchQueryParams();

    if (q) {
      this.setState({ searchRes: { state: "loading" } });
      this.setState({
        searchRes: await HttpService.client.search({
          q,
          community_id: communityId ?? undefined,
          creator_id: creatorId ?? undefined,
          type_: type,
          sort,
          listing_type: listingType,
          page,
          limit: fetchLimit,
          auth,
        }),
      });
      window.scrollTo(0, 0);
      restoreScrollPosition(this.context);

      if (auth) {
        this.setState({ resolveObjectRes: { state: "loading" } });
        this.setState({
          resolveObjectRes: await HttpService.client.resolveObject({
            q,
            auth,
          }),
        });
      }
    }
  }

  handleCreatorSearch = debounce(async (text: string) => {
    const { creatorId } = getSearchQueryParams();
    const { creatorSearchOptions } = this.state;
    const newOptions: Choice[] = [];

    this.setState({ searchCreatorLoading: true });

    const selectedChoice = creatorSearchOptions.find(
      choice => getIdFromString(choice.value) === creatorId
    );

    if (selectedChoice) {
      newOptions.push(selectedChoice);
    }

    if (text.length > 0) {
      newOptions.push(...(await fetchUsers(text)).map(personToChoice));
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
      newOptions.push(...(await fetchCommunities(text)).map(communityToChoice));
    }

    this.setState({
      searchCommunitiesLoading: false,
      communitySearchOptions: newOptions,
    });
  });

  handleSortChange(sort: SortType) {
    this.updateUrl({ sort, page: 1 });
  }

  handleTypeChange(i: Search, event: any) {
    const type = event.target.value as SearchType;

    i.updateUrl({
      type,
      page: 1,
    });
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleListingTypeChange(listingType: ListingType) {
    this.updateUrl({
      listingType,
      page: 1,
    });
  }

  handleCommunityFilterChange({ value }: Choice) {
    this.updateUrl({
      communityId: getIdFromString(value) ?? null,
      page: 1,
    });
  }

  handleCreatorFilterChange({ value }: Choice) {
    this.updateUrl({
      creatorId: getIdFromString(value) ?? null,
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

  async updateUrl({
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

    await this.search();
  }
}
