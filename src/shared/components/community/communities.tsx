import { editCommunity, setIsoData, showLocal, WithHead } from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component, FormEvent, InfernoNode } from "inferno";
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
import { htmlTags } from "@components/common/html-tags";
import { Spinner } from "@components/common/icon";
import { CommunitiesSortDropdown } from "@components/common/sort-dropdown";
import { Icon } from "@components/common/icon";
import { communityLink } from "./community-link";
import { CommunityListItem } from "./community-list-item";
import { communityLimit } from "@utils/config";
import { getHttpBaseInternal } from "@utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { RouteComponentProps, RouterContext } from "inferno-router";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { CreateCommunityButton } from "@components/common/content-actions/create-item-buttons";
import { ListingTypeDropdown } from "@components/common/listing-type-dropdown";

type CommunitiesData = RouteDataResponse<{
  listCommunitiesResponse: PagedResponse<CommunityView>;
}>;

interface CommunitiesState {
  listCommunitiesResponse: RequestState<PagedResponse<CommunityView>>;
  searchText: string;
  isIsomorphic: boolean;
  pendingCommunityIds: Record<number, boolean>;
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
  CommunitiesProps &
  WithHead;
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
    pendingCommunityIds: {},
  };

  loadingSettled() {
    return resourcesSettled([this.state.listCommunitiesResponse]);
  }

  constructor(props: CommunitiesRouteProps, context: object) {
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

  async componentWillReceiveProps(nextProps: CommunitiesRouteProps) {
    await this.refetch(nextProps);
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("communities")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  renderListings(): InfernoNode | void {
    switch (this.state.listCommunitiesResponse.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        return (
          <ul className="list-group list-group-flush">
            {this.state.listCommunitiesResponse.data.items.map(cv => (
              <CommunityListItem
                key={cv.community.id}
                communityView={cv}
                myUserInfo={this.isoData.myUserInfo}
                followLoading={
                  !!this.state.pendingCommunityIds[cv.community.id]
                }
                onFollow={(communityId, follow) =>
                  handleFollow(this, communityId, follow)
                }
              />
            ))}
          </ul>
        );
      }
    }
  }

  render() {
    const { listingType, sort, head } = this.props;
    const myUserInfo = this.isoData.myUserInfo;
    const localSite = this.isoData.siteRes.site_view.local_site;

    htmlTags({
      head,
      title: this.documentTitle,
      context: this.context as RouterContext,
    });

    return (
      <div className="communities container-lg">
        <div>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h1 className="h4 mb-0">
              {I18NextService.i18n.t("list_of_communities")}
            </h1>
            <div className="d-flex align-items-center gap-2">
              <CreateCommunityButton
                localSite={localSite}
                myUserInfo={myUserInfo}
                blockButton={false}
              />
              <button
                type="button"
                className="btn btn-sm btn-light border-light-subtle"
                onClick={() => handleVisitRandomCommunity(this)}
                aria-label={I18NextService.i18n.t("visit_random_community")}
                title={I18NextService.i18n.t("visit_random_community")}
                data-tippy-content={I18NextService.i18n.t(
                  "visit_random_community",
                )}
              >
                <Icon icon="shuffle" />
              </button>
            </div>
          </div>

          <div className="row align-items-center g-2 mb-3">
            <div className="col-12 col-md-auto d-flex flex-wrap align-items-center gap-2">
              <ListingTypeDropdown
                currentOption={listingType}
                showLocal={showLocal(this.isoData)}
                showSubscribed
                showSuggested={
                  !!this.isoData.siteRes.site_view.local_site
                    .suggested_multi_community_id
                }
                myUserInfo={myUserInfo}
                showLabel
                onSelect={val => handleListingTypeChange(this, val)}
              />
              <CommunitiesSortDropdown
                currentOption={sort}
                onSelect={val => handleSortChange(this, val)}
                showLabel
              />
            </div>
            <div className="col-12 col-md-5 col-lg-4 ms-md-auto">
              {this.searchForm()}
            </div>
          </div>

          <div>{this.renderListings()}</div>
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
      <form
        className="d-flex gap-1"
        onSubmit={e => handleSearchSubmit(this, e)}
      >
        <label className="visually-hidden" htmlFor="communities-search">
          {I18NextService.i18n.t("search")}
        </label>
        <input
          type="search"
          id="communities-search"
          className="form-control form-control-sm"
          value={this.state.searchText}
          placeholder={`${I18NextService.i18n.t("search")}...`}
          onInput={e => handleSearchChange(this, e)}
          required
          minLength={3}
        />
        <button
          type="submit"
          className="btn btn-sm btn-light border-light-subtle flex-shrink-0"
          aria-label={I18NextService.i18n.t("search")}
        >
          <Icon icon="search" />
        </button>
      </form>
    );
  }

  updateUrl(props: Partial<CommunitiesProps>) {
    const { listingType, sort, cursor } = { ...this.props, ...props };

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType,
      sort,
      cursor,
    };

    this.props.history.push({
      pathname: "/communities",
      search: getQueryString(queryParams),
    });
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
  i.setState({ searchText: event.target.value });
}

function handleSearchSubmit(i: Communities, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const searchParamEncoded = i.state.searchText;
  const { listingType } = i.props;
  const context = i.context as RouterContext;
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
    const context = i.context as RouterContext;
    context.router.history.push(link);
  }
}

async function handleFollow(
  instance: Communities,
  communityId: number,
  follow: boolean,
) {
  instance.setState(s => ({
    pendingCommunityIds: { ...s.pendingCommunityIds, [communityId]: true },
  }));
  try {
    const res = await HttpService.client.followCommunity({
      community_id: communityId,
      follow,
    });
    instance.findAndUpdateCommunity(res);
  } finally {
    instance.setState(s => {
      const next = { ...s.pendingCommunityIds };
      delete next[communityId];
      return { pendingCommunityIds: next };
    });
  }
}
