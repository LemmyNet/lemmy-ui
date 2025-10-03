import {
  commentsToFlatNodes,
  communityToChoice,
  enableNsfw,
  fetchCommunities,
  fetchUsers,
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
  getQueryParams,
  getQueryString,
  resourcesSettled,
  cursorComponents,
} from "@utils/helpers";
import type { DirectionalCursor, IsoData, QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import { Component, linkEvent, createRef } from "inferno";
import {
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
  Search as SearchForm,
  SearchResponse,
  SearchType,
  SearchSortType,
  PaginationCursor,
  MyUserInfo,
  CommentView,
  MultiCommunityView,
} from "lemmy-js-client";
import { fetchLimit } from "@utils/config";
import { CommentViewType, InitialFetchRequest } from "@utils/types";
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
import { PersonListing } from "./person/person-listing";
import { PostListing } from "./post/post-listing";
import { getHttpBaseInternal } from "../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "./common/paginator-cursor";
import { SearchSortSelect } from "./common/sort-select";
import { SearchableSelect } from "./common/searchable-select";
import { UserBadges } from "./common/user-badges";
import { Badges } from "./common/badges";
import { CommunityLink } from "./community/community-link";

interface SearchProps {
  q?: string;
  type: SearchType;
  sort: SearchSortType;
  listingType: ListingType;
  titleOnly: boolean;
  communityId?: number;
  creatorId?: number;
  cursor?: DirectionalCursor;
}

type SearchData = RouteDataResponse<{
  communityResponse: GetCommunityResponse;
  listCommunitiesResponse: ListCommunitiesResponse;
  creatorDetailsResponse: GetPersonDetailsResponse;
  searchResponse: SearchResponse;
}>;

type FilterType = "creator" | "community";

interface SearchState {
  searchRes: RequestState<SearchResponse>;
  siteRes: GetSiteResponse;
  communitySearchOptions: Choice[];
  creatorSearchOptions: Choice[];
  searchCreatorLoading: boolean;
  searchCommunitiesLoading: boolean;
  isIsomorphic: boolean;
}

const defaultSearchType = "All";
const defaultSearchSortType = "Top";
const defaultListingType = "All";
const defaultCommunitySortType = "Hot";

const searchTypes = ["All", "Comments", "Posts", "Communities", "Users", "Url"];

export function getSearchQueryParams(source?: string): SearchProps {
  return getQueryParams<SearchProps>(
    {
      q: getSearchQueryFromQuery,
      type: getSearchTypeFromQuery,
      sort: getSortTypeFromQuery,
      listingType: getListingTypeFromQuery,
      titleOnly: getTitleOnlyFromQuery,
      communityId: getIdFromString,
      creatorId: getIdFromString,
      cursor: (cursor?: string) => cursor,
    },
    source,
  );
}

const getSearchQueryFromQuery = (q?: string): string | undefined => q;

function getSearchTypeFromQuery(type_?: string): SearchType {
  return type_ ? (type_ as SearchType) : defaultSearchType;
}

function getSortTypeFromQuery(sort?: string): SearchSortType {
  return sort ? (sort as SearchSortType) : defaultSearchSortType;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : defaultListingType;
}

const getTitleOnlyFromQuery = (titleOnly?: string): boolean =>
  titleOnly?.toLowerCase() === "true";

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
            label: I18NextService.i18n.t("all") as string,
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

const communityListing = (
  communities: CommunityView[],
  myUserInfo: MyUserInfo | undefined,
) => {
  return (
    communities.length > 0 && (
      <>
        <h3>{I18NextService.i18n.t("communities")}</h3>
        {communities.map(c => (
          <div>
            <CommunityLink community={c.community} myUserInfo={myUserInfo} />
            <Badges
              className="ms-1 d-inline-flex"
              communityId={c.community.id}
              subject={c.community}
              lessBadges
            />
          </div>
        ))}
        <hr class="border m-2" />
      </>
    )
  );
};

const personListing = (
  persons: PersonView[],
  myUserInfo: MyUserInfo | undefined,
) => {
  return (
    persons.length > 0 && (
      <>
        <h3>{I18NextService.i18n.t("users")}</h3>
        {persons.map(p => (
          <div>
            <PersonListing
              person={p.person}
              showApubName
              myUserInfo={myUserInfo}
            />
            <UserBadges
              classNames="ms-1"
              isAdmin={p.is_admin}
              isBanned={p.banned}
              myUserInfo={myUserInfo}
              personActions={p.person_actions}
              creator={p.person}
              showCounts
            />
          </div>
        ))}
        <hr class="border m-2" />
      </>
    )
  );
};

const postListing = (posts: PostView[], isoData: IsoData) => {
  return (
    posts.length > 0 && (
      <>
        <h3>{I18NextService.i18n.t("posts")}</h3>
        {posts.map(post_view => (
          <div>
            <PostListing
              key={post_view.post.id}
              post_view={post_view}
              showDupes="ShowSeparately"
              showCommunity
              myUserInfo={isoData.myUserInfo}
              localSite={isoData.siteRes.site_view.local_site}
              showAdultConsentModal={isoData.showAdultConsentModal}
              enableNsfw={enableNsfw(isoData.siteRes)}
              allLanguages={isoData.siteRes.all_languages}
              siteLanguages={isoData.siteRes.discussion_languages}
              admins={isoData.siteRes.admins}
              viewOnly
              // All of these are unused, since its view only
              onPostEdit={async () => EMPTY_REQUEST}
              onPostVote={async () => EMPTY_REQUEST}
              onPostReport={async () => {}}
              onBlockPerson={async () => {}}
              onBlockCommunity={async () => {}}
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
              onHidePost={async () => {}}
              onPersonNote={async () => {}}
            />
          </div>
        ))}
        <hr class="border m-2" />
      </>
    )
  );
};

const commentListing = (comments: CommentView[], isoData: IsoData) => {
  return (
    comments.length > 0 && (
      <>
        <h3>{I18NextService.i18n.t("comments")}</h3>
        {comments.map(c => (
          <div>
            <CommentNodes
              key={c.comment.id}
              nodes={[
                {
                  comment_view: c,
                  children: [],
                  depth: 0,
                },
              ]}
              viewType={CommentViewType.Flat}
              viewOnly
              postLocked
              isTopLevel
              showCommunity
              myUserInfo={isoData.myUserInfo}
              localSite={isoData.siteRes.site_view.local_site}
              allLanguages={isoData.siteRes.all_languages}
              siteLanguages={isoData.siteRes.discussion_languages}
              admins={isoData.siteRes.admins}
              // All of these are unused, since its viewonly
              onSaveComment={async () => {}}
              onBlockPerson={async () => {}}
              onBlockCommunity={async () => {}}
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
              onBanPersonFromCommunity={async () => {}}
              onBanPerson={async () => {}}
              onCreateComment={async () => EMPTY_REQUEST}
              onEditComment={async () => EMPTY_REQUEST}
              onPersonNote={async () => {}}
              onLockComment={async () => {}}
            />
          </div>
        ))}
        <hr class="border m-2" />
      </>
    )
  );
};

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
    siteRes: this.isoData.siteRes,
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

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const {
        communityResponse: communityRes,
        creatorDetailsResponse: creatorDetailsRes,
        listCommunitiesResponse: communitiesRes,
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
    }
  }

  componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      this.fetchAll(this.props);
    }
  }

  componentDidMount() {
    if (this.props.history.action !== "POP" || this.state.isIsomorphic) {
      this.searchInput.current?.select();
    }
  }

  componentWillReceiveProps(nextProps: SearchRouteProps) {
    if (nextProps.communityId !== this.props.communityId) {
      this.fetchSelectedCommunity(nextProps);
    }
    if (nextProps.creatorId !== this.props.creatorId) {
      this.fetchSelectedCreator(nextProps);
    }
    this.search(nextProps);
  }

  componentDidUpdate(prevProps: SearchRouteProps) {
    if (this.props.location.key !== prevProps.location.key) {
      if (this.props.history.action !== "POP") {
        this.searchInput.current?.select();
      }
    }
  }

  fetchDefaultCommunitiesToken?: symbol;
  async fetchDefaultCommunities({
    communityId,
  }: Pick<SearchRouteProps, "communityId">) {
    const token = (this.fetchDefaultCommunitiesToken = Symbol());
    this.setState({
      searchCommunitiesLoading: true,
    });

    const res = await HttpService.client.listCommunities({
      type_: defaultListingType,
      sort: defaultCommunitySortType,
      limit: fetchLimit,
    });

    if (token !== this.fetchDefaultCommunitiesToken) {
      return;
    }

    if (res.state === "success") {
      const retainSelected: false | undefined | Choice =
        !res.data.communities.some(cv => cv.community.id === communityId) &&
        this.state.communitySearchOptions.find(
          choice => choice.value === communityId?.toString(),
        );
      const choices = res.data.communities.map(communityToChoice);
      this.setState({
        communitySearchOptions: retainSelected
          ? [retainSelected, ...choices]
          : choices,
      });
    }

    this.setState({
      searchCommunitiesLoading: false,
    });
  }

  fetchSelectedCommunityToken?: symbol;
  async fetchSelectedCommunity({
    communityId,
  }: Pick<SearchRouteProps, "communityId">) {
    const token = (this.fetchSelectedCommunityToken = Symbol());
    const needsSelectedCommunity = () => {
      return !this.state.communitySearchOptions.some(
        choice => choice.value === communityId?.toString(),
      );
    };
    if (communityId && needsSelectedCommunity()) {
      const res = await HttpService.client.getCommunity({ id: communityId });
      if (
        res.state === "success" &&
        needsSelectedCommunity() &&
        token === this.fetchSelectedCommunityToken
      ) {
        this.setState(prev => {
          prev.communitySearchOptions.unshift(
            communityToChoice(res.data.community_view),
          );
          return prev;
        });
      }
    }
  }

  fetchSelectedCreatorToken?: symbol;
  async fetchSelectedCreator({
    creatorId,
  }: Pick<SearchRouteProps, "creatorId">) {
    const token = (this.fetchSelectedCreatorToken = Symbol());
    const needsSelectedCreator = () => {
      return !this.state.creatorSearchOptions.some(
        choice => choice.value === creatorId?.toString(),
      );
    };

    if (!creatorId || !needsSelectedCreator()) {
      return;
    }

    this.setState({ searchCreatorLoading: true });

    const res = await HttpService.client.getPersonDetails({
      person_id: creatorId,
    });

    if (token !== this.fetchSelectedCreatorToken) {
      return;
    }

    if (res.state === "success" && needsSelectedCreator()) {
      this.setState(prev => {
        prev.creatorSearchOptions.push(personToChoice(res.data.person_view));
      });
    }

    this.setState({ searchCreatorLoading: false });
  }

  async fetchAll(props: SearchRouteProps) {
    await Promise.all([
      this.fetchDefaultCommunities(props),
      this.fetchSelectedCommunity(props),
      this.fetchSelectedCreator(props),
      this.search(props),
    ]);
  }

  static async fetchInitialData({
    headers,
    query: {
      q: query,
      type: searchType,
      sort,
      listingType: listing_type,
      titleOnly: title_only,
      communityId: community_id,
      creatorId: creator_id,
      cursor,
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
      sort: defaultCommunitySortType,
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

    if (query) {
      const form: SearchForm = {
        q: query,
        community_id,
        creator_id,
        type_: searchType,
        sort,
        listing_type,
        ...cursorComponents(cursor),
        limit: fetchLimit,
        title_only,
      };

      searchResponse = await client.search(form);
    }

    return {
      communityResponse,
      creatorDetailsResponse,
      listCommunitiesResponse,
      searchResponse,
    };
  }

  get getNextPage(): PaginationCursor | undefined {
    const { searchRes: res } = this.state;
    return res.state === "success" ? res.data.next_page : undefined;
  }

  get documentTitle(): string {
    const { q } = this.props;
    const name = this.state.siteRes.site_view.site.name;
    return `${I18NextService.i18n.t("search")} - ${q ? `${q} - ` : ""}${name}`;
  }

  render() {
    const { type } = this.props;

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
        <PaginatorCursor
          current={this.props.cursor}
          resource={this.state.searchRes}
          onPageChange={this.handlePageChange}
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
          {/* key is necessary for defaultValue to update when props.q changes,
              e.g. back button. */}
          <input
            key={this.context.router.history.location.key}
            type="text"
            className="form-control me-2 mb-2 col-sm-8"
            defaultValue={this.props.q ?? ""}
            placeholder={`${I18NextService.i18n.t("search")}...`}
            aria-label={I18NextService.i18n.t("search")}
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
        <div className="col-auto form-check ms-2 h-min d-flex align-items-center">
          <input
            type="checkbox"
            className="form-check-input mt-0"
            onChange={linkEvent(this, this.handleTitleOnlyChange)}
            checked={this.props.titleOnly}
            id="title_only"
          />
          <label for="title_only" className="m-1 form-check-label">
            {I18NextService.i18n.t("post_title_only")}
          </label>
        </div>
      </form>
    );
  }

  get selects() {
    const { type, listingType, titleOnly, sort, communityId, creatorId } =
      this.props;
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
              {searchTypes.map((option: SearchType) => (
                <option value={option} key={option}>
                  {I18NextService.i18n.t(option.toLowerCase())}
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
              myUserInfo={this.isoData.myUserInfo}
            />
          </div>
          {(type === "All" || type === "Posts") && (
            <div className="col">
              <input
                className="btn-check"
                id="title-only"
                type="checkbox"
                checked={titleOnly}
                onChange={linkEvent(this, this.handleTitleOnlyChange)}
              />
              <label className="btn btn-outline-secondary" htmlFor="title-only">
                {I18NextService.i18n.t("post_title_only")}
              </label>
            </div>
          )}
          <div className="col">
            <SearchSortSelect current={sort} onChange={this.handleSortChange} />
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

  get all() {
    const { searchRes: searchResponse } = this.state;
    const comments_array: CommentView[] = [];
    const posts_array: PostView[] = [];
    const communities_array: CommunityView[] = [];
    const persons_array: PersonView[] = [];
    const multi_communities_array: MultiCommunityView[] = [];
    if (searchResponse.state === "success") {
      searchResponse.data.results.forEach(sr => {
        switch (sr.type_) {
          case "Post":
            posts_array.push(sr);
            break;
          case "Comment":
            comments_array.push(sr);
            break;
          case "Community":
            communities_array.push(sr);
            break;
          case "Person":
            persons_array.push(sr);
            break;
          case "MultiCommunity":
            multi_communities_array.push(sr); //TODO: display these
            break;
        }
      });
    }

    return (
      <>
        {communityListing(communities_array, this.isoData.myUserInfo)}
        {personListing(persons_array, this.isoData.myUserInfo)}
        {postListing(posts_array, this.isoData)}
        {commentListing(comments_array, this.isoData)}
      </>
    );
  }

  get comments() {
    const { searchRes: searchResponse, siteRes } = this.state;
    const comments =
      searchResponse.state === "success"
        ? searchResponse.data.results.filter(s => s.type_ === "Comment")
        : [];

    return (
      <CommentNodes
        nodes={commentsToFlatNodes(comments)}
        viewType={CommentViewType.Flat}
        viewOnly
        postLocked
        isTopLevel
        showCommunity
        allLanguages={siteRes.all_languages}
        siteLanguages={siteRes.discussion_languages}
        myUserInfo={this.isoData.myUserInfo}
        localSite={siteRes.site_view.local_site}
        admins={this.isoData.siteRes.admins}
        // All of these are unused, since its viewonly
        onSaveComment={async () => {}}
        onBlockPerson={async () => {}}
        onBlockCommunity={async () => {}}
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
        onBanPersonFromCommunity={async () => {}}
        onBanPerson={async () => {}}
        onCreateComment={async () => EMPTY_REQUEST}
        onEditComment={async () => EMPTY_REQUEST}
        onPersonNote={async () => {}}
        onLockComment={async () => {}}
      />
    );
  }

  get posts() {
    const { searchRes: searchResponse, siteRes } = this.state;
    const posts =
      searchResponse.state === "success"
        ? searchResponse.data.results.filter(s => s.type_ === "Post")
        : [];

    return (
      <>
        {posts.map(pv => (
          <div key={pv.post.id} className="row">
            <div className="col-12">
              <PostListing
                post_view={pv}
                showDupes="ShowSeparately"
                showCommunity
                enableNsfw={enableNsfw(siteRes)}
                showAdultConsentModal={this.isoData.showAdultConsentModal}
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
                viewOnly
                myUserInfo={this.isoData.myUserInfo}
                localSite={siteRes.site_view.local_site}
                admins={this.isoData.siteRes.admins}
                // All of these are unused, since its view only
                onPostEdit={async () => EMPTY_REQUEST}
                onPostVote={async () => EMPTY_REQUEST}
                onPostReport={async () => {}}
                onBlockPerson={async () => {}}
                onBlockCommunity={async () => {}}
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
                onHidePost={async () => {}}
                onPersonNote={async () => {}}
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  get communities() {
    const { searchRes: searchResponse } = this.state;
    const communities =
      searchResponse.state === "success"
        ? searchResponse.data.results.filter(s => s.type_ === "Community")
        : [];

    return (
      <>
        <div className="col-12">
          {communityListing(communities, this.isoData.myUserInfo)}
        </div>
      </>
    );
  }

  get users() {
    const { searchRes: searchResponse } = this.state;
    const users =
      searchResponse.state === "success"
        ? searchResponse.data.results.filter(s => s.type_ === "Person")
        : [];

    return (
      <>
        <div className="col-12">
          {personListing(users, this.isoData.myUserInfo)}
        </div>
      </>
    );
  }

  get resultsCount(): number {
    const { searchRes: r } = this.state;

    const searchCount = r.state === "success" ? r.data.results.length : 0;

    return searchCount;
  }

  searchToken?: symbol;
  async search(props: SearchRouteProps) {
    const token = (this.searchToken = Symbol());
    const {
      q,
      communityId,
      creatorId,
      type,
      sort,
      listingType,
      titleOnly,
      cursor,
    } = props;

    if (q) {
      this.setState({ searchRes: LOADING_REQUEST });
      const searchRes = await HttpService.client.search({
        q,
        community_id: communityId ?? undefined,
        creator_id: creatorId ?? undefined,
        type_: type,
        sort,
        listing_type: listingType,
        title_only: titleOnly,
        limit: fetchLimit,
        ...cursorComponents(cursor),
      });
      if (token !== this.searchToken) {
        return;
      }
      this.setState({ searchRes });
    } else {
      this.setState({ searchRes: EMPTY_REQUEST });
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

  getQ(): string | undefined {
    return this.searchInput.current?.value ?? this.props.q;
  }

  handleSortChange(sort: SearchSortType) {
    this.updateUrl({ sort, cursor: undefined, q: this.getQ() });
  }

  handleTitleOnlyChange(i: Search, event: any) {
    const titleOnly = event.target.checked;
    i.updateUrl({ titleOnly, q: i.getQ() });
  }

  handleTypeChange(i: Search, event: any) {
    const type = event.target.value as SearchType;

    i.updateUrl({
      type,
      cursor: undefined,
      q: i.getQ(),
    });
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  handleListingTypeChange(listingType: ListingType) {
    this.updateUrl({
      listingType,
      cursor: undefined,
      q: this.getQ(),
    });
  }

  handleCommunityFilterChange({ value }: Choice) {
    this.updateUrl({
      communityId: getIdFromString(value),
      cursor: undefined,
      q: this.getQ(),
    });
  }

  handleCreatorFilterChange({ value }: Choice) {
    this.updateUrl({
      creatorId: getIdFromString(value),
      cursor: undefined,
      q: this.getQ(),
    });
  }

  handleSearchSubmit(i: Search, event: any) {
    event.preventDefault();

    i.updateUrl({
      q: i.getQ(),
      cursor: undefined,
    });
  }

  async updateUrl(props: Partial<SearchProps>) {
    const {
      q,
      type,
      listingType,
      titleOnly,
      sort,
      communityId,
      creatorId,
      cursor,
    } = {
      ...this.props,
      ...props,
    };

    const queryParams: QueryParams<SearchProps> = {
      q,
      type,
      listingType,
      titleOnly: titleOnly?.toString(),
      communityId: communityId?.toString(),
      creatorId: creatorId?.toString(),
      cursor,
      sort,
    };

    this.props.history.push(`/search${getQueryString(queryParams)}`);
  }
}
