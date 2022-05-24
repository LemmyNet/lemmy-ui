import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  CommunityView,
  FollowCommunity,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  SiteView,
  SortType,
  SubscribedType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { InitialFetchRequest } from "shared/interfaces";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  authField,
  getListingTypeFromPropsNoDefault,
  getPageFromProps,
  isBrowser,
  numToSI,
  setIsoData,
  setOptionalAuth,
  showLocal,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { CommunityLink } from "./community-link";

const communityLimit = 100;

interface CommunitiesState {
  communities: CommunityView[];
  page: number;
  loading: boolean;
  site_view: SiteView;
  searchText: string;
  listingType: ListingType;
}

interface CommunitiesProps {
  listingType?: ListingType;
  page?: number;
}

export class Communities extends Component<any, CommunitiesState> {
  private subscription: Subscription;
  private isoData = setIsoData(this.context);
  private emptyState: CommunitiesState = {
    communities: [],
    loading: true,
    page: getPageFromProps(this.props),
    listingType: getListingTypeFromPropsNoDefault(this.props),
    site_view: this.isoData.site_res.site_view,
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
      this.state.communities = this.isoData.routeData[0].communities;
      this.state.loading = false;
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
    return `${i18n.t("communities")} - ${this.state.site_view.site.name}`;
  }

  render() {
    return (
      <div class="container">
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
            <div class="row">
              <div class="col-md-6">
                <h4>{i18n.t("list_of_communities")}</h4>
                <span class="mb-2">
                  <ListingTypeSelect
                    type_={this.state.listingType}
                    showLocal={showLocal(this.isoData)}
                    showSubscribed
                    onChange={this.handleListingTypeChange}
                  />
                </span>
              </div>
              <div class="col-md-6">
                <div class="float-md-right">{this.searchForm()}</div>
              </div>
            </div>

            <div class="table-responsive">
              <table id="community_table" class="table table-sm table-hover">
                <thead class="pointer">
                  <tr>
                    <th>{i18n.t("name")}</th>
                    <th class="text-right">{i18n.t("subscribers")}</th>
                    <th class="text-right">
                      {i18n.t("users")} / {i18n.t("month")}
                    </th>
                    <th class="text-right d-none d-lg-table-cell">
                      {i18n.t("posts")}
                    </th>
                    <th class="text-right d-none d-lg-table-cell">
                      {i18n.t("comments")}
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.communities.map(cv => (
                    <tr>
                      <td>
                        <CommunityLink community={cv.community} />
                      </td>
                      <td class="text-right">
                        {numToSI(cv.counts.subscribers)}
                      </td>
                      <td class="text-right">
                        {numToSI(cv.counts.users_active_month)}
                      </td>
                      <td class="text-right d-none d-lg-table-cell">
                        {numToSI(cv.counts.posts)}
                      </td>
                      <td class="text-right d-none d-lg-table-cell">
                        {numToSI(cv.counts.comments)}
                      </td>
                      <td class="text-right">
                        {cv.subscribed == SubscribedType.Subscribed && (
                          <button
                            class="btn btn-link d-inline-block"
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
                            class="btn btn-link d-inline-block"
                            onClick={linkEvent(
                              cv.community.id,
                              this.handleSubscribe
                            )}
                          >
                            {i18n.t("subscribe")}
                          </button>
                        )}
                        {cv.subscribed == SubscribedType.Pending && (
                          <div class="text-warning d-inline-block">
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
        class="form-inline"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <input
          type="text"
          id="communities-search"
          class="form-control mr-2 mb-2"
          value={this.state.searchText}
          placeholder={`${i18n.t("search")}...`}
          onInput={linkEvent(this, this.handleSearchChange)}
          required
          minLength={3}
        />
        <label class="sr-only" htmlFor="communities-search">
          {i18n.t("search")}
        </label>
        <button type="submit" class="btn btn-secondary mr-2 mb-2">
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
    let form: FollowCommunity = {
      community_id: communityId,
      follow: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.followCommunity(form));
  }

  handleSubscribe(communityId: number) {
    let form: FollowCommunity = {
      community_id: communityId,
      follow: true,
      auth: authField(),
    };
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
    let listCommunitiesForm: ListCommunities = {
      type_: this.state.listingType,
      sort: SortType.TopMonth,
      limit: communityLimit,
      page: this.state.page,
      auth: authField(false),
    };

    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let type_: ListingType = pathSplit[3]
      ? ListingType[pathSplit[3]]
      : ListingType.Local;
    let page = pathSplit[5] ? Number(pathSplit[5]) : 1;
    let listCommunitiesForm: ListCommunities = {
      type_,
      sort: SortType.TopMonth,
      limit: communityLimit,
      page,
    };
    setOptionalAuth(listCommunitiesForm, req.auth);

    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg).data;
      this.state.communities = data.communities;
      this.state.loading = false;
      window.scrollTo(0, 0);
      this.setState(this.state);
    } else if (op == UserOperation.FollowCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg).data;
      let found = this.state.communities.find(
        c => c.community.id == data.community_view.community.id
      );
      found.subscribed = data.community_view.subscribed;
      found.counts.subscribers = data.community_view.counts.subscribers;
      this.setState(this.state);
    }
  }
}
