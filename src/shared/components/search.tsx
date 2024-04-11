import {
  commentsToFlatNodes,
  communityToChoice,
  enableDownvotes,
  enableNsfw,
  fetchCommunities,
  fetchUsers,
  getUpdatedSearchId,
  myAuth,
  personToChoice,
  setIsoData,
  showLocal,
} from "@utils/app";
import { scrollMixin } from "./mixins/scroll-mixin";
import {
  capitalizeFirstLetter,
  debounce,
  dedupByProperty,
  getIdFromString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  numToSI,
  resourcesSettled,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import type { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent, createRef } from "inferno";
import {
  CommentView,
  CommunityView,
  GetCommunity,
  GetCommunityResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  LemmyHttp,
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
import { fetchLimit } from "../config";
import { CommentViewType, InitialFetchRequest } from "../interfaces";
import { FirstLoadService, I18NextService } from "../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../services/HttpService";
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
import { getHttpBaseInternal } from "../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "../routes";

interface SearchProps {
  q?: string;
  type: SearchType;
  sort: SortType;
  listingType: ListingType;
  communityId?: number;
  creatorId?: number;
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

export function getSearchQueryParams(source?: string): SearchProps {
  return getQueryParams<SearchProps>(
    {
      q: getSearchQueryFromQuery,
      type: getSearchTypeFromQuery,
      sort: getSortTypeFromQuery,
      listingType: getListingTypeFromQuery,
      communityId: getIdFromString,
      creatorId: getIdFromString,
      page: getPageFromString,
    },
    source,
  );
}

const getSearchQueryFromQuery = (q?: string): string | undefined => q;

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
    <div className="col-sm-6">
      <label className="mb-1" htmlFor={`${filterType}-filter`}>
        {capitalizeFirstLetter(I18NextService.i18n.t(filterType))}
      </label>
      <SearchableSelect
        id={`${filterType}-filter`}
        options={[
          {
            label: I18NextService.i18n.t("all"),
            value: "0",
          },
        ].concat(dedupByProperty(options, option => option.value))}
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
    "number_of_subscribers",
  );

const personListing = ({ person, counts: { comment_count } }: PersonView) =>
  getListing(
    <PersonListing person={person} showApubName />,
    comment_count,
    "number_of_comments",
  );

function getListing(
  listing: JSX.ElementClass,
  count: number,
  translationKey: "number_of_comments" | "number_of_subscribers",
) {
  return (
    <>
      <span>{listing}</span>
      <span>{` - ${I18NextService.i18n.t(translationKey, {
        count: Number(count),
        formattedCount: numToSI(count),
      })}`}</span>
    </>
  );
}

type SearchPathProps = Record<string, never>;
type SearchRouteProps = RouteComponentProps<SearchPathProps> & SearchProps;
export type SearchFetchConfig = IRoutePropsWithFetch<
  SearchData,
  SearchPathProps,
  SearchProps
>;

@scrollMixin
export class Search extends Component<SearchRouteProps, SearchState> {
  private isoData = setIsoData<SearchData>(this.context);
  searchInput = createRef<HTMLInputElement>();

  state: SearchState = {
    resolveObjectRes: EMPTY_REQUEST,
    siteRes: this.isoData.site_res,
    creatorSearchOptions: [],
    communitySearchOptions: [],
    searchRes: EMPTY_REQUEST,
    searchCreatorLoading: false,
    searchCommunitiesLoading: false,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.searchRes]);
  }

  constructor(props: SearchRouteProps, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleCommunityFilterChange =
      this.handleCommunityFilterChange.bind(this);
    this.handleCreatorFilterChange = this.handleCreatorFilterChange.bind(this);

    const { q } = this.props;

    this.state.searchText = q;

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const {
        communityResponse: communityRes,
        creatorDetailsResponse: creatorDetailsRes,
        listCommunitiesResponse: communitiesRes,
        resolveObjectResponse: resolveObjectRes,
        searchResponse: searchRes,
      } = this.isoData.routeData;

      this.state.isIsomorphic = true;

      if (creatorDetailsRes?.state === "success") {
        this.state.creatorSearchOptions =
          creatorDetailsRes.state === "success"
            ? [personToChoice(creatorDetailsRes.data.person_view)]
            : [];
      }

      if (communitiesRes?.state === "success") {
        this.state.communitySearchOptions =
          communitiesRes.data.communities.map(communityToChoice);
      }

      if (communityRes?.state === "success") {
        this.state.communitySearchOptions.unshift(
          communityToChoice(communityRes.data.community_view),
        );
      }

      if (searchRes?.state === "success") {
        this.state.searchRes = searchRes;
      }

      if (resolveObjectRes?.state === "success") {
        this.state.resolveObjectRes = resolveObjectRes;
      }
    }
  }

  async componentDidMount() {
    if (this.props.history.action !== "POP") {
      this.searchInput.current?.select();
    }

    if (!this.state.isIsomorphic) {
      this.setState({
        searchCommunitiesLoading: true,
        searchCreatorLoading: true,
      });

      const promises = [
        HttpService.client
          .listCommunities({
            type_: defaultListingType,
            sort: defaultSortType,
            limit: fetchLimit,
          })
          .then(res => {
            if (res.state === "success") {
              this.setState({
                communitySearchOptions:
                  res.data.communities.map(communityToChoice),
              });
            }
          }),
      ];

      const { communityId, creatorId } = this.props;

      if (communityId) {
        promises.push(
          HttpService.client.getCommunity({ id: communityId }).then(res => {
            if (res.state === "success") {
              this.setState(prev => {
                prev.communitySearchOptions.unshift(
                  communityToChoice(res.data.community_view),
                );

                return prev;
              });
            }
          }),
        );
      }

      if (creatorId) {
        promises.push(
          HttpService.client
            .getPersonDetails({
              person_id: creatorId,
            })
            .then(res => {
              if (res.state === "success") {
                this.setState(prev => {
                  prev.creatorSearchOptions.push(
                    personToChoice(res.data.person_view),
                  );
                });
              }
            }),
        );
      }

      if (this.state.searchText) {
        promises.push(this.search());
      }

      await Promise.all(promises);

      this.setState({
        searchCommunitiesLoading: false,
        searchCreatorLoading: false,
      });
    }
  }

  static async fetchInitialData({
    headers,
    query: {
      q: query,
      type: searchType,
      sort,
      listingType: listing_type,
      communityId: community_id,
      creatorId: creator_id,
      page,
    },
  }: InitialFetchRequest<SearchPathProps, SearchProps>): Promise<SearchData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    let communityResponse: RequestState<GetCommunityResponse> = EMPTY_REQUEST;
    if (community_id) {
      const getCommunityForm: GetCommunity = {
        id: community_id,
      };

      communityResponse = await client.getCommunity(getCommunityForm);
    }

    const listCommunitiesResponse = await client.listCommunities({
      type_: defaultListingType,
      sort: defaultSortType,
      limit: fetchLimit,
    });

    let creatorDetailsResponse: RequestState<GetPersonDetailsResponse> =
      EMPTY_REQUEST;
    if (creator_id) {
      const getCreatorForm: GetPersonDetails = {
        person_id: creator_id,
      };

      creatorDetailsResponse = await client.getPersonDetails(getCreatorForm);
    }

    let searchResponse: RequestState<SearchResponse> = EMPTY_REQUEST;
    let resolveObjectResponse: RequestState<ResolveObjectResponse> =
      EMPTY_REQUEST;

    if (query) {
      const form: SearchForm = {
        q: query,
        community_id,
        creator_id,
        type_: searchType,
        sort,
        listing_type,
        page,
        limit: fetchLimit,
      };

      searchResponse = await client.search(form);
      if (headers["Authorization"]) {
        const resolveObjectForm: ResolveObject = {
          q: query,
        };
        resolveObjectResponse =
          await HttpService.client.resolveObject(resolveObjectForm);

        // If we return this object with a state of failed, the catch-all-handler will redirect
        // to an error page, so we ignore it by covering up the error with the empty state.
        if (resolveObjectResponse.state === "failed") {
          resolveObjectResponse = EMPTY_REQUEST;
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
    const { q } = this.props;
    const name = this.state.siteRes.site_view.site.name;
    return `${I18NextService.i18n.t("search")} - ${q ? `${q} - ` : ""}${name}`;
  }

  render() {
    const { type, page } = this.props;

    return (
      <div className="search container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          canonicalPath={
            this.context.router.route.match.url +
            this.context.router.route.location.search
          }
        />
        <h1 className="h4 mb-4">{I18NextService.i18n.t("search")}</h1>
        {this.selects}
        {this.searchForm}
        {this.displayResults(type)}
        {this.resultsCount === 0 &&
          this.state.searchRes.state === "success" && (
            <span>{I18NextService.i18n.t("no_results")}</span>
          )}
        <Paginator
          page={page}
          onChange={this.handlePageChange}
          nextDisabled={
            this.state.searchRes.state !== "success" ||
            fetchLimit > this.resultsCount
          }
        />
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
        className="row gx-2 gy-3"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <div className="col-auto flex-grow-1 flex-sm-grow-0">
          <input
            type="text"
            className="form-control me-2 mb-2 col-sm-8"
            value={this.state.searchText}
            placeholder={`${I18NextService.i18n.t("search")}...`}
            aria-label={I18NextService.i18n.t("search")}
            onInput={linkEvent(this, this.handleQChange)}
            required
            minLength={1}
            ref={this.searchInput}
          />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-secondary mb-2">
            {this.state.searchRes.state === "loading" ? (
              <Spinner />
            ) : (
              <span>{I18NextService.i18n.t("search")}</span>
            )}
          </button>
        </div>
      </form>
    );
  }

  get selects() {
    const { type, listingType, sort, communityId, creatorId } = this.props;
    const {
      communitySearchOptions,
      creatorSearchOptions,
      searchCommunitiesLoading,
      searchCreatorLoading,
    } = this.state;

    return (
      <>
        <div className="row row-cols-auto g-2 g-sm-3 mb-2 mb-sm-3">
          <div className="col">
            <select
              value={type}
              onChange={linkEvent(this, this.handleTypeChange)}
              className="form-select d-inline-block w-auto"
              aria-label={I18NextService.i18n.t("type")}
            >
              <option disabled aria-hidden="true">
                {I18NextService.i18n.t("type")}
              </option>
              {searchTypes.map(option => (
                <option value={option} key={option}>
                  {I18NextService.i18n.t(
                    option.toString().toLowerCase() as NoOptionI18nKeys,
                  )}
                </option>
              ))}
            </select>
          </div>
          <div className="col">
            <ListingTypeSelect
              type_={listingType}
              showLocal={showLocal(this.isoData)}
              showSubscribed
              onChange={this.handleListingTypeChange}
            />
          </div>
          <div className="col">
            <SortSelect
              sort={sort}
              onChange={this.handleSortChange}
              hideHot
              hideMostComments
            />
          </div>
        </div>
        <div className="row gy-2 gx-4 mb-3">
          <Filter
            filterType="community"
            onChange={this.handleCommunityFilterChange}
            onSearch={this.handleCommunitySearch}
            options={communitySearchOptions}
            value={communityId}
            loading={searchCommunitiesLoading}
          />
          <Filter
            filterType="creator"
            onChange={this.handleCreatorFilterChange}
            onSearch={this.handleCreatorSearch}
            options={creatorSearchOptions}
            value={creatorId}
            loading={searchCreatorLoading}
          />
        </div>
      </>
    );
  }

  buildCombined(): Combined[] {
    const combined: Combined[] = [];
    const {
      resolveObjectRes: resolveObjectResponse,
      searchRes: searchResponse,
    } = this.state;

    // Push the possible resolve / federated objects first
    if (resolveObjectResponse.state === "success") {
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
        ],
      );
    }

    const { sort } = this.props;

    // Sort it
    if (sort === "New") {
      combined.sort((a, b) => b.published.localeCompare(a.published));
    } else {
      combined.sort((a, b) =>
        Number(
          ((b.data as CommentView | PostView).counts.score |
            (b.data as CommunityView).counts.subscribers |
            (b.data as PersonView).counts.comment_count) -
            ((a.data as CommentView | PostView).counts.score |
              (a.data as CommunityView).counts.subscribers |
              (a.data as PersonView).counts.comment_count),
        ),
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
                  onPostEdit={async () => EMPTY_REQUEST}
                  onPostVote={async () => EMPTY_REQUEST}
                  onPostReport={async () => {}}
                  onBlockPerson={async () => {}}
                  onLockPost={async () => {}}
                  onDeletePost={async () => {}}
                  onRemovePost={async () => {}}
                  onSavePost={async () => {}}
                  onFeaturePost={async () => {}}
                  onPurgePerson={async () => {}}
                  onPurgePost={async () => {}}
                  onBanPersonFromCommunity={async () => {}}
                  onBanPerson={async () => {}}
                  onAddModToCommunity={async () => {}}
                  onAddAdmin={async () => {}}
                  onTransferCommunity={async () => {}}
                  onMarkPostAsRead={async () => {}}
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
                  isTopLevel
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                  // All of these are unused, since its viewonly
                  finished={new Map()}
                  onSaveComment={async () => {}}
                  onBlockPerson={async () => {}}
                  onDeleteComment={async () => {}}
                  onRemoveComment={async () => {}}
                  onCommentVote={async () => {}}
                  onCommentReport={async () => {}}
                  onDistinguishComment={async () => {}}
                  onAddModToCommunity={async () => {}}
                  onAddAdmin={async () => {}}
                  onTransferCommunity={async () => {}}
                  onPurgeComment={async () => {}}
                  onPurgePerson={async () => {}}
                  onCommentReplyRead={() => {}}
                  onPersonMentionRead={() => {}}
                  onBanPersonFromCommunity={async () => {}}
                  onBanPerson={async () => {}}
                  onCreateComment={async () => EMPTY_REQUEST}
                  onEditComment={async () => EMPTY_REQUEST}
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
        isTopLevel
        enableDownvotes={enableDownvotes(siteRes)}
        allLanguages={siteRes.all_languages}
        siteLanguages={siteRes.discussion_languages}
        // All of these are unused, since its viewonly
        finished={new Map()}
        onSaveComment={async () => {}}
        onBlockPerson={async () => {}}
        onDeleteComment={async () => {}}
        onRemoveComment={async () => {}}
        onCommentVote={async () => {}}
        onCommentReport={async () => {}}
        onDistinguishComment={async () => {}}
        onAddModToCommunity={async () => {}}
        onAddAdmin={async () => {}}
        onTransferCommunity={async () => {}}
        onPurgeComment={async () => {}}
        onPurgePerson={async () => {}}
        onCommentReplyRead={() => {}}
        onPersonMentionRead={() => {}}
        onBanPersonFromCommunity={async () => {}}
        onBanPerson={async () => {}}
        onCreateComment={async () => EMPTY_REQUEST}
        onEditComment={async () => EMPTY_REQUEST}
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
                onPostEdit={async () => EMPTY_REQUEST}
                onPostVote={async () => EMPTY_REQUEST}
                onPostReport={async () => {}}
                onBlockPerson={async () => {}}
                onLockPost={async () => {}}
                onDeletePost={async () => {}}
                onRemovePost={async () => {}}
                onSavePost={async () => {}}
                onFeaturePost={async () => {}}
                onPurgePerson={async () => {}}
                onPurgePost={async () => {}}
                onBanPersonFromCommunity={async () => {}}
                onBanPerson={async () => {}}
                onAddModToCommunity={async () => {}}
                onAddAdmin={async () => {}}
                onTransferCommunity={async () => {}}
                onMarkPostAsRead={() => {}}
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
    const { searchText: q } = this.state;
    const { communityId, creatorId, type, sort, listingType, page } =
      this.props;

    if (q) {
      this.setState({ searchRes: LOADING_REQUEST });
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
        }),
      });
      window.scrollTo(0, 0);

      if (myAuth()) {
        this.setState({ resolveObjectRes: LOADING_REQUEST });
        this.setState({
          resolveObjectRes: await HttpService.client.resolveObject({
            q,
          }),
        });
      }
    }
  }

  handleCreatorSearch = debounce(async (text: string) => {
    if (text.length > 0) {
      const { creatorId } = this.props;
      const { creatorSearchOptions } = this.state;

      this.setState({ searchCreatorLoading: true });

      const newOptions = creatorSearchOptions
        .filter(choice => getIdFromString(choice.value) === creatorId)
        .concat((await fetchUsers(text)).map(personToChoice));

      this.setState({
        searchCreatorLoading: false,
        creatorSearchOptions: newOptions,
      });
    }
  });

  handleCommunitySearch = debounce(async (text: string) => {
    if (text.length > 0) {
      const { communityId } = this.props;
      const { communitySearchOptions } = this.state;

      this.setState({
        searchCommunitiesLoading: true,
      });

      const newOptions = communitySearchOptions
        .filter(choice => getIdFromString(choice.value) === communityId)
        .concat((await fetchCommunities(text)).map(communityToChoice));

      this.setState({
        searchCommunitiesLoading: false,
        communitySearchOptions: newOptions,
      });
    }
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
      communityId: getIdFromString(value),
      page: 1,
    });
  }

  handleCreatorFilterChange({ value }: Choice) {
    this.updateUrl({
      creatorId: getIdFromString(value),
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
    } = this.props;

    const query = q ?? this.state.searchText ?? urlQ;

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
  }
}
