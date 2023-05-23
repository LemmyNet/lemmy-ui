import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  FollowCommunity,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest } from "shared/interfaces";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  QueryParams,
  getPageFromString,
  getQueryParams,
  getQueryString,
  isBrowser,
  myAuth,
  numToSI,
  setIsoData,
  showLocal,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { CommunityLink } from "./community-link";

const communityLimit = 50;

interface CommunitiesState {
  listCommunitiesResponse?: ListCommunitiesResponse;
  loading: boolean;
  siteRes: GetSiteResponse;
  searchText: string;
}

interface CommunitiesProps {
  listingType: ListingType;
  page: number;
}

function getCommunitiesQueryParams() {
  return getQueryParams<CommunitiesProps>({
    listingType: getListingTypeFromQuery,
    page: getPageFromString,
  });
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "Local";
}

function toggleSubscribe(community_id: number, follow: boolean) {
  const auth = myAuth();
  if (auth) {
    const form: FollowCommunity = {
      community_id,
      follow,
      auth,
    };

    WebSocketService.Instance.send(wsClient.followCommunity(form));
  }
}

function refetch() {
  const { listingType, page } = getCommunitiesQueryParams();

  const listCommunitiesForm: ListCommunities = {
    type_: listingType,
    sort: "TopMonth",
    limit: communityLimit,
    page,
    auth: myAuth(false),
  };

  WebSocketService.Instance.send(wsClient.listCommunities(listCommunitiesForm));
}

export class Communities extends Component<any, CommunitiesState> {
  private subscription?: Subscription;
  private isoData = setIsoData(this.context);
  state: CommunitiesState = {
    loading: true,
    siteRes: this.isoData.site_res,
    searchText: "",
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path === this.context.router.route.match.url) {
      const listRes = this.isoData.routeData[0] as ListCommunitiesResponse;
      this.state = {
        ...this.state,
        listCommunitiesResponse: listRes,
        loading: false,
      };
    } else {
      refetch();
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

  render() {
    const { listingType, page } = getCommunitiesQueryParams();

    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div>
            <div className="row">
              <div className="col-md-6">
                <h4>{i18n.t("list_of_communities")}</h4>
                <span className="mb-2">
                  <ListingTypeSelect
                    type_={listingType}
                    showLocal={showLocal(this.isoData)}
                    showSubscribed
                    onChange={linkEvent({i: this, val: val}, this.handleListingTypeChange)}
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
                  {this.state.listCommunitiesResponse?.communities.map(cv => (
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
                              cv.community.id,
                              this.handleUnsubscribe
                            )}
                          >
                            {i18n.t("unsubscribe")}
                          </button>
                        )}
                        {cv.subscribed === "NotSubscribed" && (
                          <button
                            className="btn btn-link d-inline-block"
                            onClick={linkEvent(
                              cv.community.id,
                              this.handleSubscribe
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
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={page} onChange={this.handlePageChange} />
          </div>
        )}
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

  updateUrl({ listingType, page }: Partial<CommunitiesProps>) {
    const { listingType: urlListingType, page: urlPage } =
      getCommunitiesQueryParams();

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType ?? urlListingType,
      page: (page ?? urlPage)?.toString(),
    };

    this.props.history.push(`/communities${getQueryString(queryParams)}`);

    refetch();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleListingTypeChange(data: {i: Communities, val: ListingType}) {
    data.i.updateUrl({
      listingType: data.val,
      page: 1,
    });
  }

  handleUnsubscribe(communityId: number) {
    toggleSubscribe(communityId, false);
  }

  handleSubscribe(communityId: number) {
    toggleSubscribe(communityId, true);
  }

  handleSearchChange(i: Communities, event: any) {
    i.setState({ searchText: event.target.value });
  }

  handleSearchSubmit(i: Communities) {
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

  parseMessage(msg: any) {
    const op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
    } else if (op === UserOperation.ListCommunities) {
      const data = wsJsonToRes<ListCommunitiesResponse>(msg);
      this.setState({ listCommunitiesResponse: data, loading: false });
      window.scrollTo(0, 0);
    } else if (op === UserOperation.FollowCommunity) {
      const {
        community_view: {
          community,
          subscribed,
          counts: { subscribers },
        },
      } = wsJsonToRes<CommunityResponse>(msg);
      const res = this.state.listCommunitiesResponse;
      const found = res?.communities.find(
        ({ community: { id } }) => id == community.id
      );

      if (found) {
        found.subscribed = subscribed;
        found.counts.subscribers = subscribers;
        this.setState(this.state);
      }
    }
  }
}
