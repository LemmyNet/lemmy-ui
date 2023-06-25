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
} from "lemmy-js-client";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
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
        const { listingType, page } = this.getCommunitiesQueryParams();
        return (
          <>
            <h1 className="h4">
              {I18NextService.i18n.t("list_of_communities")}
            </h1>
            <div className="row g-2 justify-content-between">
              <div className="col-auto">
                <ListingTypeSelect
                  type_={listingType}
                  showLocal={showLocal(this.isoData)}
                  showSubscribed
                  onChange={this.handleListingTypeChange}
                />
              </div>
              {this.searchForm()}
            </div>

            <div className="table-responsive">
              <table
                id="community_table"
                className="table table-sm table-hover align-middle text-center"
              >
                <thead className="pointer">
                  <tr>
                    <th className="text-start">
                      {I18NextService.i18n.t("name")}
                    </th>
                    <th>{I18NextService.i18n.t("subscribers")}</th>
                    <th>
                      {I18NextService.i18n.t("users")} /{" "}
                      {I18NextService.i18n.t("month")}
                    </th>
                    <th className="d-none d-lg-table-cell">
                      {I18NextService.i18n.t("posts")}
                    </th>
                    <th className="d-none d-lg-table-cell">
                      {I18NextService.i18n.t("comments")}
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.listCommunitiesResponse.data.communities.map(
                    cv => (
                      <tr key={cv.community.id}>
                        <td className="text-start">
                          <CommunityLink community={cv.community} />
                        </td>
                        <td>{numToSI(cv.counts.subscribers)}</td>
                        <td>{numToSI(cv.counts.users_active_month)}</td>
                        <td className="d-none d-lg-table-cell">
                          {numToSI(cv.counts.posts)}
                        </td>
                        <td className="d-none d-lg-table-cell">
                          {numToSI(cv.counts.comments)}
                        </td>
                        <td className="text-end">
                          {cv.subscribed === "Pending" ? (
                            <div className="text-warning d-inline-block">
                              {I18NextService.i18n.t("subscribe_pending")}
                            </div>
                          ) : (
                            <button
                              className="btn btn-link d-inline-block"
                              onClick={linkEvent(
                                {
                                  i: this,
                                  communityId: cv.community.id,
                                  follow: cv.subscribed !== "Subscribed",
                                },
                                this.handleFollow
                              )}
                            >
                              {I18NextService.i18n.t(
                                `${
                                  cv.subscribed === "NotSubscribed" ? "un" : ""
                                }subscribe`
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <Paginator page={page} onChange={this.handlePageChange} />
          </>
        );
      }
    }
  }

  render() {
    return (
      <main className="communities container-flex mx-1 mx-md-4">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.renderListings()}
      </main>
    );
  }

  searchForm() {
    return (
      <form
        className="d-flex mb-2 col-auto flex-nowrap"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <label className="visually-hidden" htmlFor="communities-search">
          {I18NextService.i18n.t("search")}
        </label>
        <input
          type="text"
          id="communities-search"
          className="form-control me-1"
          value={this.state.searchText}
          placeholder={`${I18NextService.i18n.t("search")}...`}
          onInput={linkEvent(this, this.handleSearchChange)}
          required
          minLength={3}
        />
        <button type="submit" className="btn btn-secondary">
          {I18NextService.i18n.t("search")}
        </button>
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
