import {
  editCommunity,
  myAuth,
  myAuthRequired,
  setIsoData,
  showLocal,
} from "@utils/app";
import {
  getPageFromString,
  getQueryParams,
  getQueryString,
  numToSI,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  SortType,
} from "lemmy-js-client";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "./community-link";

import { communityLimit } from "../../config";
import { SubscribeButton } from "../common/subscribe-button";

type CommunitiesData = RouteDataResponse<{
  listCommunitiesResponse: ListCommunitiesResponse;
}>;

interface CommunitiesState {
  listCommunitiesResponse: RequestState<ListCommunitiesResponse>;
  siteRes: GetSiteResponse;
  searchText: string;
  isIsomorphic: boolean;
}

interface CommunitiesProps {
  listingType: ListingType;
  sort: SortType;
  page: number;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "Local";
}

function getSortTypeFromQuery(type?: string): SortType {
  return type ? (type as SortType) : "TopMonth";
}
function getCommunitiesQueryParams() {
  return getQueryParams<CommunitiesProps>({
    listingType: getListingTypeFromQuery,
    sort: getSortTypeFromQuery,
    page: getPageFromString,
  });
}

export class Communities extends Component<any, CommunitiesState> {
  private isoData = setIsoData<CommunitiesData>(this.context);
  state: CommunitiesState = {
    listCommunitiesResponse: { state: "empty" },
    siteRes: this.isoData.site_res,
    searchText: "",
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);

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

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.refetch();
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("communities")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  renderListings() {
    switch (this.state.listCommunitiesResponse.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const { listingType, sort, page } = getCommunitiesQueryParams();
        return (
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
                  onChange={this.handleListingTypeChange}
                />
              </div>
              <div className="col-auto me-auto">
                <SortSelect sort={sort} onChange={this.handleSortChange} />
              </div>
              <div className="col-auto">{this.searchForm()}</div>
            </div>

            <div className="table-responsive">
              <table
                id="community_table"
                className="table table-sm table-hover"
              >
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
                  {this.state.listCommunitiesResponse.data.communities.map(
                    cv => (
                      <tr key={cv.community.id}>
                        <td>
                          <CommunityLink community={cv.community} />
                        </td>
                        <td className="text-right">
                          {numToSI(cv.counts.subscribers)}
                        </td>
                        <td className="text-right">
                          {numToSI(cv.counts.users_active_month)}
                        </td>
                        <td className="text-right d-none d-lg-table-cell">
                          {numToSI(cv.counts.posts)}
                        </td>
                        <td className="text-right d-none d-lg-table-cell">
                          {numToSI(cv.counts.comments)}
                        </td>
                        <td className="text-right">
                          <SubscribeButton
                            communityView={cv}
                            onFollow={linkEvent(
                              {
                                i: this,
                                communityId: cv.community.id,
                                follow: false,
                              },
                              this.handleFollow,
                            )}
                            onUnFollow={linkEvent(
                              {
                                i: this,
                                communityId: cv.community.id,
                                follow: true,
                              },
                              this.handleFollow,
                            )}
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <Paginator
              page={page}
              onChange={this.handlePageChange}
              nextDisabled={
                communityLimit >
                this.state.listCommunitiesResponse.data.communities.length
              }
            />
          </div>
        );
      }
    }
  }

  render() {
    return (
      <div className="communities container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.renderListings()}
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

  async updateUrl({ listingType, sort, page }: Partial<CommunitiesProps>) {
    const {
      listingType: urlListingType,
      sort: urlSort,
      page: urlPage,
    } = getCommunitiesQueryParams();

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType ?? urlListingType,
      sort: sort ?? urlSort,
      page: (page ?? urlPage)?.toString(),
    };

    this.props.history.push(`/communities${getQueryString(queryParams)}`);

    await this.refetch();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
  }

  handleListingTypeChange(val: ListingType) {
    this.updateUrl({
      listingType: val,
      page: 1,
    });
  }

  handleSearchChange(i: Communities, event: any) {
    i.setState({ searchText: event.target.value });
  }

  handleSearchSubmit(i: Communities, event: any) {
    event.preventDefault();
    const searchParamEncoded = encodeURIComponent(i.state.searchText);
    const { listingType } = getCommunitiesQueryParams();
    i.context.router.history.push(
      `/search?q=${searchParamEncoded}&type=Communities&listingType=${listingType}`,
    );
  }

  static async fetchInitialData({
    query: { listingType, sort, page },
    client,
    auth,
  }: InitialFetchRequest<
    QueryParams<CommunitiesProps>
  >): Promise<CommunitiesData> {
    const listCommunitiesForm: ListCommunities = {
      type_: getListingTypeFromQuery(listingType),
      sort: getSortTypeFromQuery(sort),
      limit: communityLimit,
      page: getPageFromString(page),
      auth: auth,
    };

    return {
      listCommunitiesResponse: await client.listCommunities(
        listCommunitiesForm,
      ),
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
      auth: myAuthRequired(),
    });
    data.i.findAndUpdateCommunity(res);
  }

  async refetch() {
    this.setState({ listCommunitiesResponse: { state: "loading" } });

    const { listingType, sort, page } = getCommunitiesQueryParams();

    this.setState({
      listCommunitiesResponse: await HttpService.client.listCommunities({
        type_: listingType,
        sort: sort,
        limit: communityLimit,
        page,
        auth: myAuth(),
      }),
    });

    window.scrollTo(0, 0);
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
