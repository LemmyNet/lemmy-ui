import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  FollowCommunity,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  SortType,
  SubscribedType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest } from "shared/interfaces";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  auth,
  getListingTypeFromPropsNoDefault,
  getPageFromProps,
  isBrowser,
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
  listCommunitiesResponse: Option<ListCommunitiesResponse>;
  page: number;
  loading: boolean;
  siteRes: GetSiteResponse;
  searchText: string;
  listingType: ListingType;
}

interface CommunitiesProps {
  listingType?: ListingType;
  page?: number;
}

export class Communities extends Component<any, CommunitiesState> {
  private subscription: Subscription;
  private isoData = setIsoData(this.context, ListCommunitiesResponse);
  private emptyState: CommunitiesState = {
    listCommunitiesResponse: None,
    loading: true,
    page: getPageFromProps(this.props),
    listingType: getListingTypeFromPropsNoDefault(this.props),
    siteRes: this.isoData.site_res,
    searchText: "",
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let listRes = Some(this.isoData.routeData[0] as ListCommunitiesResponse);
      this.state = {
        ...this.state,
        listCommunitiesResponse: listRes,
        loading: false,
      };
    } else {
      this.refetch();
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  static getDerivedStateFromProps(props: any): CommunitiesProps {
    return {
      listingType: getListingTypeFromPropsNoDefault(props),
      page: getPageFromProps(props),
    };
  }

  componentDidUpdate(_: any, lastState: CommunitiesState) {
    if (
      lastState.page !== this.state.page ||
      lastState.listingType !== this.state.listingType
    ) {
      this.setState({ loading: true });
      this.refetch();
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView => `${i18n.t("communities")} - ${siteView.site.name}`,
      none: "",
    });
  }

  render() {
    return (
      <div className="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
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
                    type_={this.state.listingType}
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
                  {this.state.listCommunitiesResponse
                    .map(l => l.communities)
                    .unwrapOr([])
                    .map(cv => (
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
                          {cv.subscribed == SubscribedType.Subscribed && (
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
                          {cv.subscribed == SubscribedType.NotSubscribed && (
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
                          {cv.subscribed == SubscribedType.Pending && (
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
            <Paginator
              page={this.state.page}
              onChange={this.handlePageChange}
            />
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

  updateUrl(paramUpdates: CommunitiesProps) {
    const page = paramUpdates.page || this.state.page;
    const listingTypeStr = paramUpdates.listingType || this.state.listingType;
    this.props.history.push(
      `/communities/listing_type/${listingTypeStr}/page/${page}`
    );
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

  handleUnsubscribe(communityId: number) {
    let form = new FollowCommunity({
      community_id: communityId,
      follow: false,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.followCommunity(form));
  }

  handleSubscribe(communityId: number) {
    let form = new FollowCommunity({
      community_id: communityId,
      follow: true,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.followCommunity(form));
  }

  handleSearchChange(i: Communities, event: any) {
    i.setState({ searchText: event.target.value });
  }

  handleSearchSubmit(i: Communities) {
    const searchParamEncoded = encodeURIComponent(i.state.searchText);
    i.context.router.history.push(
      `/search/q/${searchParamEncoded}/type/Communities/sort/TopAll/listing_type/All/community_id/0/creator_id/0/page/1`
    );
  }

  refetch() {
    let listCommunitiesForm = new ListCommunities({
      type_: Some(this.state.listingType),
      sort: Some(SortType.TopMonth),
      limit: Some(communityLimit),
      page: Some(this.state.page),
      auth: auth(false).ok(),
    });

    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let type_: Option<ListingType> = Some(
      pathSplit[3] ? ListingType[pathSplit[3]] : ListingType.Local
    );
    let page = Some(pathSplit[5] ? Number(pathSplit[5]) : 1);
    let listCommunitiesForm = new ListCommunities({
      type_,
      sort: Some(SortType.TopMonth),
      limit: Some(communityLimit),
      page,
      auth: req.auth,
    });

    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(
        msg,
        ListCommunitiesResponse
      );
      this.setState({ listCommunitiesResponse: Some(data), loading: false });
      window.scrollTo(0, 0);
    } else if (op == UserOperation.FollowCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg, CommunityResponse);
      this.state.listCommunitiesResponse.match({
        some: res => {
          let found = res.communities.find(
            c => c.community.id == data.community_view.community.id
          );
          found.subscribed = data.community_view.subscribed;
          found.counts.subscribers = data.community_view.counts.subscribers;
        },
        none: void 0,
      });
      this.setState(this.state);
    }
  }
}
