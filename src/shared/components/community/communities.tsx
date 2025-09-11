import { editCommunity, setIsoData, showLocal } from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  numToSI,
  cursorComponents,
  resourcesSettled,
} from "@utils/helpers";
import type { DirectionalCursor, QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  CommunitySortType,
  GetRandomCommunity,
  LemmyHttp,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
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
import { ListingTypeSelect } from "@components/common/listing-type-select";
import { CommunitiesSortSelect } from "@components/common/sort-select";
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

type CommunitiesData = RouteDataResponse<{
  listCommunitiesResponse: ListCommunitiesResponse;
}>;

interface CommunitiesState {
  listCommunitiesResponse: RequestState<ListCommunitiesResponse>;
  searchText: string;
  isIsomorphic: boolean;
}

interface CommunitiesProps {
  listingType: ListingType;
  sort: CommunitySortType;
  cursor?: DirectionalCursor;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "Local";
}

function getSortTypeFromQuery(type?: string): CommunitySortType {
  return type ? (type as CommunitySortType) : "Hot";
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
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleVisitRandomCommunity =
      this.handleVisitRandomCommunity.bind(this);

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
    switch (this.state.listCommunitiesResponse.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        return (
          <table id="community_table" className="table table-sm table-hover">
            <thead className="pointer">
              <tr>
                <th>{I18NextService.i18n.t("name")}</th>
                <th className="text-right">
                  {I18NextService.i18n.t("subscribers")}
                </th>
                <th className="text-right">
                  {I18NextService.i18n.t("users")} /{" "}
                  {I18NextService.i18n.t("month")}
                </th>
                <th className="text-right d-none d-lg-table-cell">
                  {I18NextService.i18n.t("posts")}
                </th>
                <th className="text-right d-none d-lg-table-cell">
                  {I18NextService.i18n.t("comments")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {this.state.listCommunitiesResponse.data.communities.map(cv => (
                <tr key={cv.community.id}>
                  <td>
                    <CommunityLink
                      community={cv.community}
                      myUserInfo={this.isoData.myUserInfo}
                    />
                  </td>
                  <td className="text-right">
                    {numToSI(cv.community.subscribers)}
                  </td>
                  <td className="text-right">
                    {numToSI(cv.community.users_active_month)}
                  </td>
                  <td className="text-right d-none d-lg-table-cell">
                    {numToSI(cv.community.posts)}
                  </td>
                  <td className="text-right d-none d-lg-table-cell">
                    {numToSI(cv.community.comments)}
                  </td>
                  <td className="text-right">
                    <SubscribeButton
                      communityView={cv}
                      onFollow={linkEvent(
                        {
                          i: this,
                          communityId: cv.community.id,
                          follow: true,
                        },
                        this.handleFollow,
                      )}
                      onUnFollow={linkEvent(
                        {
                          i: this,
                          communityId: cv.community.id,
                          follow: false,
                        },
                        this.handleFollow,
                      )}
                      isLink
                      showRemoteFetch={!this.isoData.myUserInfo}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
    }
  }

  render() {
    const { listingType, sort } = this.props;
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
          <div className="row g-3 align-items-center mb-2">
            <div className="col-auto">
              <ListingTypeSelect
                type_={listingType}
                showLocal={showLocal(this.isoData)}
                showSubscribed
                myUserInfo={this.isoData.myUserInfo}
                onChange={this.handleListingTypeChange}
              />
            </div>
            <div className="col-auto me-auto">
              <CommunitiesSortSelect
                current={sort}
                onChange={this.handleSortChange}
              />
            </div>
            <div className="col">
              <button
                className="btn btn-secondary"
                onClick={this.handleVisitRandomCommunity}
                aria-label={I18NextService.i18n.t("visit_random_community")}
                data-tippy-content={I18NextService.i18n.t(
                  "visit_random_community",
                )}
              >
                <Icon icon="shuffle" />
              </button>
            </div>
            <div className="col-auto">{this.searchForm()}</div>
          </div>
          <div className="table-responsive">{this.renderListingsTable()}</div>
          <PaginatorCursor
            current={this.props.cursor}
            resource={this.state.listCommunitiesResponse}
            onPageChange={this.handlePageChange}
          />
        </div>
      </div>
    );
  }

  searchForm() {
    return (
      <form className="row" onSubmit={linkEvent(this, this.handleSearchSubmit)}>
        <div className="col-auto">
          <input
            type="text"
            id="communities-search"
            className="form-control"
            value={this.state.searchText}
            placeholder={`${I18NextService.i18n.t("search")}...`}
            onInput={linkEvent(this, this.handleSearchChange)}
            required
            minLength={3}
          />
        </div>
        <div className="col-auto">
          <label className="visually-hidden" htmlFor="communities-search">
            {I18NextService.i18n.t("search")}
          </label>
          <button type="submit" className="btn btn-secondary">
            <span>{I18NextService.i18n.t("search")}</span>
          </button>
        </div>
      </form>
    );
  }

  async updateUrl(props: Partial<CommunitiesProps>) {
    const { listingType, sort } = { ...this.props, ...props };

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType,
      sort: sort,
    };

    this.props.history.push(`/communities${getQueryString(queryParams)}`);
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  handleSortChange(val: CommunitySortType) {
    this.updateUrl({ sort: val, cursor: undefined });
  }

  handleListingTypeChange(val: ListingType) {
    this.updateUrl({
      listingType: val,
      cursor: undefined,
    });
  }

  handleSearchChange(i: Communities, event: any) {
    i.setState({ searchText: event.target.value });
  }

  handleSearchSubmit(i: Communities, event: any) {
    event.preventDefault();
    const searchParamEncoded = i.state.searchText;
    const { listingType } = i.props;
    i.context.router.history.push(
      `/search${getQueryString({ q: searchParamEncoded, type: "Communities", listingType })}`,
    );
  }

  async handleVisitRandomCommunity() {
    const form: GetRandomCommunity = {
      type_: this.props.listingType,
    };

    const res = await HttpService.client.getRandomCommunity(form);

    if (res.state === "success") {
      const link = communityLink(res.data.community_view.community).link;
      this.context.router.history.push(link);
    }
  }

  static async fetchInitialData({
    headers,
    query: { listingType, sort, cursor },
  }: InitialFetchRequest<
    CommunitiesPathProps,
    CommunitiesProps
  >): Promise<CommunitiesData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    // TODO add time range picker
    const listCommunitiesForm: ListCommunities = {
      type_: listingType,
      sort,
      limit: communityLimit,
      ...cursorComponents(cursor),
    };

    return {
      listCommunitiesResponse:
        await client.listCommunities(listCommunitiesForm),
    };
  }

  async handleFollow(data: {
    i: Communities;
    communityId: number;
    follow: boolean;
  }) {
    const res = await HttpService.client.followCommunity({
      community_id: data.communityId,
      follow: data.follow,
    });
    data.i.findAndUpdateCommunity(res);
  }

  fetchToken?: symbol;
  async refetch({ listingType, sort, cursor }: CommunitiesProps) {
    const token = (this.fetchToken = Symbol());
    this.setState({ listCommunitiesResponse: LOADING_REQUEST });
    const listCommunitiesResponse = await HttpService.client.listCommunities({
      type_: listingType,
      sort: sort,
      limit: communityLimit,
      ...cursorComponents(cursor),
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
        s.listCommunitiesResponse.data.communities = editCommunity(
          res.data.community_view,
          s.listCommunitiesResponse.data.communities,
        );
      }
      return s;
    });
  }
}
