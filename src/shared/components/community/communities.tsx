import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import {
  HttpService,
  RequestState,
  apiWrapper,
  apiWrapperIso,
} from "../../services/HttpService";
import {
  QueryParams,
  editCommunities,
  getPageFromString,
  getQueryParams,
  getQueryString,
  isBrowser,
  isInitialRoute,
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

interface CommunitiesState {
  listCommunitiesResponse: RequestState<ListCommunitiesResponse>;
  siteRes: GetSiteResponse;
  searchText: string;
}

interface CommunitiesProps {
  listingType: ListingType;
  page: number;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "Local";
}

export class Communities extends Component<any, CommunitiesState> {
  private subscription?: Subscription;
  private isoData = setIsoData(this.context);
  state: CommunitiesState = {
    listCommunitiesResponse: { state: "empty" },
    siteRes: this.isoData.site_res,
    searchText: "",
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        listCommunitiesResponse: apiWrapperIso(
          this.isoData.routeData[0] as ListCommunitiesResponse
        ),
      };
    }
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.refetch();
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
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
              <div className="col-md-6">
                <div className="float-md-right">{this.searchForm()}</div>
              </div>
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
        className="form-inline"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <input
          type="text"
          id="communities-search"
          className="form-control mr-2 mb-2"
          value={this.state.searchText}
          placeholder={`${i18n.t("search")}...`}
          onInput={linkEvent(this, this.handleSearchChange)}
          required
          minLength={3}
        />
        <label className="sr-only" htmlFor="communities-search">
          {i18n.t("search")}
        </label>
        <button type="submit" className="btn btn-secondary mr-2 mb-2">
          <span>{i18n.t("search")}</span>
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

  static fetchInitialData({
    query: { listingType, page },
    client,
    auth,
  }: InitialFetchRequest<QueryParams<CommunitiesProps>>): Promise<any>[] {
    const listCommunitiesForm: ListCommunities = {
      type_: getListingTypeFromQuery(listingType),
      sort: "TopMonth",
      limit: communityLimit,
      page: getPageFromString(page),
      auth: auth,
    };

    return [client.listCommunities(listCommunitiesForm)];
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
    const res = await apiWrapper(
      HttpService.client.followCommunity({
        community_id: data.communityId,
        follow: data.follow,
        auth: myAuthRequired(),
      })
    );

    data.i.findAndUpdateCommunity(res);
  }

  async refetch() {
    this.setState({ listCommunitiesResponse: { state: "loading" } });

    const { listingType, page } = this.getCommunitiesQueryParams();

    this.setState({
      listCommunitiesResponse: await apiWrapper(
        HttpService.client.listCommunities({
          type_: listingType,
          sort: "TopMonth",
          limit: communityLimit,
          page,
          auth: myAuth(),
        })
      ),
    });

    window.scrollTo(0, 0);
  }

  findAndUpdateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (
        s.listCommunitiesResponse.state == "success" &&
        res.state == "success"
      ) {
        s.listCommunitiesResponse.data.communities = editCommunities(
          res.data.community_view,
          s.listCommunitiesResponse.data.communities
        );
      }
      return s;
    });
  }
}
