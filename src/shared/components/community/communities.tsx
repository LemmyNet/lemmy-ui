import { editCommunity, setIsoData, showLocal } from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
  numToSI,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component, FormEvent } from "inferno";
import {
  CommunityResponse,
  CommunitySortType,
  GetRandomCommunity,
  LemmyHttp,
  ListCommunities,
  PagedResponse,
  CommunityView,
  ListingType,
  PaginationCursor,
} from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService } from "@services/FirstLoadService";
import { I18NextService } from "@services/I18NextService";

import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "@services/HttpService";
import { HtmlTags } from "@components/common/html-tags";
import { Spinner } from "@components/common/icon";
import { CommunitiesSortDropdown } from "@components/common/sort-dropdown";
import { SubscribeButton } from "@components/common/subscribe-button";
import { Icon } from "@components/common/icon";
import { communityLink, CommunityLink } from "./community-link";
import { communityLimit } from "@utils/config";
import { getHttpBaseInternal } from "@utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { TableHr } from "@components/common/tables";
import { NoOptionI18nKeys } from "i18next";
import { CreateCommunityButton } from "@components/common/content-actions/create-item-buttons";
import { ListingTypeDropdown } from "@components/common/listing-type-dropdown";
import { RouterContext } from "inferno-router/dist/Router";

type CommunitiesData = RouteDataResponse<{
  listCommunitiesResponse: PagedResponse<CommunityView>;
}>;

interface CommunitiesState {
  listCommunitiesResponse: RequestState<PagedResponse<CommunityView>>;
  searchText: string;
  isIsomorphic: boolean;
}

interface CommunitiesProps {
  listingType: ListingType;
  sort: CommunitySortType;
  cursor?: PaginationCursor;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "local";
}

function getSortTypeFromQuery(type?: string): CommunitySortType {
  return type ? (type as CommunitySortType) : "active_monthly";
}

export function getCommunitiesQueryParams(source?: string): CommunitiesProps {
  return getQueryParams<CommunitiesProps>(
    {
      listingType: getListingTypeFromQuery,
      sort: getSortTypeFromQuery,
      cursor: (cursor?: string) => cursor,
    },
    source,
  );
}

type CommunitiesPathProps = Record<string, never>;
type CommunitiesRouteProps = RouteComponentProps<CommunitiesPathProps> &
  CommunitiesProps;
export type CommunitiesFetchConfig = IRoutePropsWithFetch<
  CommunitiesData,
  CommunitiesPathProps,
  CommunitiesProps
>;

@scrollMixin
export class Communities extends Component<
  CommunitiesRouteProps,
  CommunitiesState
> {
  private isoData = setIsoData<CommunitiesData>(this.context);
  state: CommunitiesState = {
    listCommunitiesResponse: EMPTY_REQUEST,
    searchText: "",
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.listCommunitiesResponse]);
  }

  constructor(props: CommunitiesRouteProps, context: any) {
    super(props, context);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { listCommunitiesResponse } = this.isoData.routeData;

      this.state = {
        ...this.state,
        listCommunitiesResponse,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.refetch(this.props);
    }
  }

  componentWillReceiveProps(nextProps: CommunitiesRouteProps) {
    this.refetch(nextProps);
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("communities")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  renderListingsTable() {
    const nameCols = "col-12 col-md-7";
    const countCols = "col-6 col-md-1";

    switch (this.state.listCommunitiesResponse.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        return (
          <div id="community_table">
            <div className="row">
              <div className={`${nameCols} fw-bold`}>
                {I18NextService.i18n.t("name")}
              </div>
              <div className={`${countCols} fw-bold`}>
                {I18NextService.i18n.t("community_visibility")}
              </div>
              <div className={`${countCols} fw-bold`}>
                {I18NextService.i18n.t("users")} /{" "}
                {I18NextService.i18n.t("month")}
              </div>
              <div className={`${countCols} fw-bold`}>
                {I18NextService.i18n.t("posts")}
              </div>
              <div className={`${countCols} fw-bold`}>
                {I18NextService.i18n.t("comments")}
              </div>
            </div>
            <TableHr />
            {this.state.listCommunitiesResponse.data.items.map(cv => (
              <>
                <div className="row">
                  <div className={nameCols}>
                    <CommunityLink
                      community={cv.community}
                      myUserInfo={this.isoData.myUserInfo}
                    />
                  </div>
                  <div className={countCols}>
                    {I18NextService.i18n.t(
                      ("community_visibility_" +
                        cv.community.visibility) as NoOptionI18nKeys,
                    )}
                  </div>
                  <div className={countCols}>
                    {numToSI(cv.community.users_active_month)}
                  </div>
                  <div className={countCols}>{numToSI(cv.community.posts)}</div>
                  <div className={countCols}>
                    {numToSI(cv.community.comments)}
                  </div>
                  <div className={countCols}>
                    <SubscribeButton
                      followState={cv.community_actions?.follow_state}
                      apId={cv.community.ap_id}
                      onFollow={() => handleFollow(this, cv.community.id, true)}
                      onUnFollow={() =>
                        handleFollow(this, cv.community.id, false)
                      }
                      isLink
                      showRemoteFetch={!this.isoData.myUserInfo}
                    />
                  </div>
                </div>
                <hr />
              </>
            ))}
          </div>
        );
      }
    }
  }

  render() {
    const { listingType, sort } = this.props;
    const myUserInfo = this.isoData.myUserInfo;
    const localSite = this.isoData.siteRes.site_view.local_site;

    return (
      <div className="communities container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div>
          <h1 className="h4 mb-4">
            {I18NextService.i18n.t("list_of_communities")}
          </h1>
          <div className="row row-cols-auto align-items-center g-3 mb-2">
            <div className="col">
              <ListingTypeDropdown
                currentOption={listingType}
                showLocal={showLocal(this.isoData)}
                showSubscribed
                showSuggested={
                  !!this.isoData.siteRes.site_view.local_site
                    .suggested_communities
                }
                myUserInfo={myUserInfo}
                showLabel
                onSelect={val => handleListingTypeChange(this, val)}
              />
            </div>
            <div className="col">
              <CommunitiesSortDropdown
                currentOption={sort}
                onSelect={val => handleSortChange(this, val)}
                showLabel
              />
            </div>
            <div className="col">
              <CreateCommunityButton
                localSite={localSite}
                myUserInfo={myUserInfo}
                blockButton={false}
              />
            </div>
            <div className="col me-auto">
              <button
                className="btn btn-sm btn-light border-outline-subtle"
                onClick={() => handleVisitRandomCommunity(this)}
                aria-label={I18NextService.i18n.t("visit_random_community")}
                data-tippy-content={I18NextService.i18n.t(
                  "visit_random_community",
                )}
              >
                <Icon icon="shuffle" />
              </button>
            </div>
            <div className="col">{this.searchForm()}</div>
          </div>
          <div>{this.renderListingsTable()}</div>
          <PaginatorCursor
            current={this.props.cursor}
            resource={this.state.listCommunitiesResponse}
            onPageChange={cursor => handlePageChange(this, cursor)}
          />
        </div>
      </div>
    );
  }

  searchForm() {
    return (
      <form className="d-flex col" onSubmit={e => handleSearchSubmit(this, e)}>
        <input
          type="text"
          id="communities-search"
          className="form-control"
          value={this.state.searchText}
          placeholder={`${I18NextService.i18n.t("search")}...`}
          onInput={e => handleSearchChange(this, e)}
          required
          minLength={3}
        />
        <label className="visually-hidden" htmlFor="communities-search">
          {I18NextService.i18n.t("search")}
        </label>
        <button
          type="submit"
          className="btn btn-light border-light-subtle ms-1"
        >
          <Icon icon="search" />
        </button>
      </form>
    );
  }

  updateUrl(props: Partial<CommunitiesProps>) {
    const { listingType, sort } = { ...this.props, ...props };

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType,
      sort: sort,
    };

    this.props.history.push(`/communities${getQueryString(queryParams)}`);
  }

  static fetchInitialData = async ({
    headers,
    query: { listingType, sort, cursor },
  }: InitialFetchRequest<
    CommunitiesPathProps,
    CommunitiesProps
  >): Promise<CommunitiesData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    // TODO add time range picker
    const listCommunitiesForm: ListCommunities = {
      type_: listingType,
      sort,
      limit: communityLimit,
      page_cursor: cursor,
    };

    return {
      listCommunitiesResponse:
        await client.listCommunities(listCommunitiesForm),
    };
  };

  fetchToken?: symbol;
  async refetch({ listingType, sort, cursor }: CommunitiesProps) {
    const token = (this.fetchToken = Symbol());
    this.setState({ listCommunitiesResponse: LOADING_REQUEST });
    const listCommunitiesResponse = await HttpService.client.listCommunities({
      type_: listingType,
      sort: sort,
      limit: communityLimit,
      page_cursor: cursor,
    });
    if (token === this.fetchToken) {
      this.setState({ listCommunitiesResponse });
    }
  }

  findAndUpdateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (
        s.listCommunitiesResponse.state === "success" &&
        res.state === "success"
      ) {
        s.listCommunitiesResponse.data.items = editCommunity(
          res.data.community_view,
          s.listCommunitiesResponse.data.items,
        );
      }
      return s;
    });
  }
}

function handlePageChange(i: Communities, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleSortChange(i: Communities, val: CommunitySortType) {
  i.updateUrl({ sort: val, cursor: undefined });
}

function handleListingTypeChange(i: Communities, val: ListingType) {
  i.updateUrl({
    listingType: val,
    cursor: undefined,
  });
}

function handleSearchChange(
  i: Communities,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ searchText: (event.target as HTMLInputElement).value });
}

function handleSearchSubmit(i: Communities, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const searchParamEncoded = i.state.searchText;
  const { listingType } = i.props;
  const context: RouterContext = i.context;
  context.router.history.push(
    `/search${getQueryString({ q: searchParamEncoded, type: "communities", listingType })}`,
  );
}

async function handleVisitRandomCommunity(i: Communities) {
  const form: GetRandomCommunity = {
    type_: i.props.listingType,
  };

  const res = await HttpService.client.getRandomCommunity(form);

  if (res.state === "success") {
    const link = communityLink(res.data.community_view.community).link;
    const context: RouterContext = i.context;
    context.router.history.push(link);
  }
}

async function handleFollow(
  i: Communities,
  communityId: number,
  follow: boolean,
) {
  const res = await HttpService.client.followCommunity({
    community_id: communityId,
    follow: follow,
  });
  i.findAndUpdateCommunity(res);
}
