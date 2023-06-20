import { getQueryParams, getQueryString } from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService } from "../../services/FirstLoadService";
import { HttpService, RequestState } from "../../services/HttpService";
import {
  RouteDataResponse,
  editCommunity,
  getPageFromString,
  myAuth,
  myAuthRequired,
  numToSI,
  setIsoData,
  showLocal,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { CommunityLink } from "./community-link";

const communityLimit = 50;

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
  page: number;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "Local";
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
    return `${i18n.t("communities")} - ${
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
        const { listingType, page } = this.getCommunitiesQueryParams();
        return (
          <div>
            <div className="row">
              <div className="col-md-6">
                <h4>{i18n.t("list_of_communities")}</h4>
                <span className="mb-2">
                  <ListingTypeSelect
                    type_={listingType}
                    showLocal={showLocal(this.isoData)}
                    showSubscribed
                    onChange={this.handleListingTypeChange}
                  />
                </span>
              </div>
              <div className="col-md-6">{this.searchForm()}</div>
            </div>

            <div className="table-responsive">
              <table
                id="community_table"
                className="table table-sm table-hover"
              >
                <thead className="pointer">
                  <tr>
                    <th>{i18n.t("name")}</th>
                    <th className="text-right">{i18n.t("subscribers")}</th>
                    <th className="text-right">
                      {i18n.t("users")} / {i18n.t("month")}
                    </th>
                    <th className="text-right d-none d-lg-table-cell">
                      {i18n.t("posts")}
                    </th>
                    <th className="text-right d-none d-lg-table-cell">
                      {i18n.t("comments")}
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
                          {cv.subscribed == "Subscribed" && (
                            <button
                              className="btn btn-link d-inline-block"
                              onClick={linkEvent(
                                {
                                  i: this,
                                  communityId: cv.community.id,
                                  follow: false,
                                },
                                this.handleFollow
                              )}
                            >
                              {i18n.t("unsubscribe")}
                            </button>
                          )}
                          {cv.subscribed === "NotSubscribed" && (
                            <button
                              className="btn btn-link d-inline-block"
                              onClick={linkEvent(
                                {
                                  i: this,
                                  communityId: cv.community.id,
                                  follow: true,
                                },
                                this.handleFollow
                              )}
                            >
                              {i18n.t("subscribe")}
                            </button>
                          )}
                          {cv.subscribed === "Pending" && (
                            <div className="text-warning d-inline-block">
                              {i18n.t("subscribe_pending")}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <Paginator page={page} onChange={this.handlePageChange} />
          </div>
        );
      }
    }
  }

  render() {
    return (
      <div className="container-lg">
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
      <form
        className="row justify-content-end"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <div className="col-auto">
          <input
            type="text"
            id="communities-search"
            className="form-control me-2 mb-2"
            value={this.state.searchText}
            placeholder={`${i18n.t("search")}...`}
            onInput={linkEvent(this, this.handleSearchChange)}
            required
            minLength={3}
          />
        </div>
        <div className="col-auto">
          <label className="visually-hidden" htmlFor="communities-search">
            {i18n.t("search")}
          </label>
          <button type="submit" className="btn btn-secondary mb-2">
            <span>{i18n.t("search")}</span>
          </button>
        </div>
      </form>
    );
  }

  async updateUrl({ listingType, page }: Partial<CommunitiesProps>) {
    const { listingType: urlListingType, page: urlPage } =
      this.getCommunitiesQueryParams();

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType ?? urlListingType,
      page: (page ?? urlPage)?.toString(),
    };

    this.props.history.push(`/communities${getQueryString(queryParams)}`);

    await this.refetch();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
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
    i.context.router.history.push(`/search?q=${searchParamEncoded}`);
  }

  static async fetchInitialData({
    query: { listingType, page },
    client,
    auth,
  }: InitialFetchRequest<
    QueryParams<CommunitiesProps>
  >): Promise<CommunitiesData> {
    const listCommunitiesForm: ListCommunities = {
      type_: getListingTypeFromQuery(listingType),
      sort: "TopMonth",
      limit: communityLimit,
      page: getPageFromString(page),
      auth: auth,
    };

    return {
      listCommunitiesResponse: await client.listCommunities(
        listCommunitiesForm
      ),
    };
  }

  getCommunitiesQueryParams() {
    return getQueryParams<CommunitiesProps>({
      listingType: getListingTypeFromQuery,
      page: getPageFromString,
    });
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

    const { listingType, page } = this.getCommunitiesQueryParams();

    this.setState({
      listCommunitiesResponse: await HttpService.client.listCommunities({
        type_: listingType,
        sort: "TopMonth",
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
        s.listCommunitiesResponse.state == "success" &&
        res.state == "success"
      ) {
        s.listCommunitiesResponse.data.communities = editCommunity(
          res.data.community_view,
          s.listCommunitiesResponse.data.communities
        );
      }
      return s;
    });
  }
}
