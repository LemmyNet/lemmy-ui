import { editMultiCommunity, setIsoData, showLocal } from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
  numToSI,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import {
  LemmyHttp,
  ListMultiCommunities,
  PagedResponse,
  MultiCommunityView,
  MultiCommunityId,
  MultiCommunityListingType,
  MultiCommunityResponse,
  MultiCommunitySortType,
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
import { MultiCommunitiesSortSelect } from "@components/common/sort-select";
import { SubscribeButton } from "@components/common/subscribe-button";
import { multiCommunityLimit } from "@utils/config";
import { getHttpBaseInternal } from "@utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { TableHr } from "@components/common/tables";
import { MultiCommunityLink } from "./multi-community-link";
import { MultiCommunityListingTypeSelect } from "@components/common/multi-community-listing-type-select";

type MultiCommunitiesData = RouteDataResponse<{
  listMultiCommunitiesRes: PagedResponse<MultiCommunityView>;
}>;

interface State {
  listMultiCommunitiesRes: RequestState<PagedResponse<MultiCommunityView>>;
  searchText: string;
  isIsomorphic: boolean;
}

interface Props {
  listingType: MultiCommunityListingType;
  sort: MultiCommunitySortType;
  cursor?: PaginationCursor;
}

function getListingTypeFromQuery(
  listingType?: string,
): MultiCommunityListingType {
  return listingType ? (listingType as MultiCommunityListingType) : "local";
}

function getSortTypeFromQuery(type?: string): MultiCommunitySortType {
  return type ? (type as MultiCommunitySortType) : "subscribers";
}

export function getMultiCommunitiesQueryParams(source?: string): Props {
  return getQueryParams<Props>(
    {
      listingType: getListingTypeFromQuery,
      sort: getSortTypeFromQuery,
      cursor: (cursor?: string) => cursor,
    },
    source,
  );
}

type PathProps = Record<string, never>;
type RouteProps = RouteComponentProps<PathProps> & Props;
export type MultiCommunitiesFetchConfig = IRoutePropsWithFetch<
  MultiCommunitiesData,
  PathProps,
  Props
>;

@scrollMixin
export class MultiCommunities extends Component<RouteProps, State> {
  private isoData = setIsoData<MultiCommunitiesData>(this.context);
  state: State = {
    listMultiCommunitiesRes: EMPTY_REQUEST,
    searchText: "",
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.listMultiCommunitiesRes]);
  }

  constructor(props: RouteProps, context: any) {
    super(props, context);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { listMultiCommunitiesRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        listMultiCommunitiesRes,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.refetch(this.props);
    }
  }

  componentWillReceiveProps(nextProps: RouteProps) {
    this.refetch(nextProps);
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("multi_communities")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  renderListingsTable() {
    const nameCols = "col-12 col-md-9";
    // 3 of these: subscribers, communities, subscribe
    const countCols = "col-4 col-md-1";

    switch (this.state.listMultiCommunitiesRes.state) {
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
                {I18NextService.i18n.t("subscribers")}
              </div>
              <div className={`${countCols} fw-bold`}>
                {I18NextService.i18n.t("communities")}
              </div>
            </div>
            <TableHr />
            {this.state.listMultiCommunitiesRes.data.items.map(v => (
              <>
                <div className="row" key={v.multi.id}>
                  <div className={nameCols}>
                    <MultiCommunityLink
                      multiCommunity={v.multi}
                      myUserInfo={this.isoData.myUserInfo}
                    />
                  </div>
                  <div className={countCols}>
                    {numToSI(v.multi.subscribers)}
                  </div>
                  <div className={countCols}>
                    {numToSI(v.multi.communities)}
                  </div>
                  <div className={countCols}>
                    <SubscribeButton
                      followState={v.follow_state}
                      apId={v.multi.ap_id}
                      onFollow={() => handleFollow(this, v.multi.id, true)}
                      onUnFollow={() => handleFollow(this, v.multi.id, false)}
                      showRemoteFetch={!this.isoData.myUserInfo}
                      isLink
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
    return (
      <div className="multi-communities container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div>
          <h1 className="h4 mb-4">
            {I18NextService.i18n.t("multi_communities")}
          </h1>
          <div className="row g-3 align-items-center mb-2">
            <div className="col-auto">
              <MultiCommunityListingTypeSelect
                type_={listingType}
                showLocal={showLocal(this.isoData)}
                showSubscribed
                myUserInfo={this.isoData.myUserInfo}
                onChange={val => handleListingTypeChange(this, val)}
              />
            </div>
            <div className="col-auto me-auto">
              <MultiCommunitiesSortSelect
                current={sort}
                onChange={val => handleSortChange(this, val)}
              />
            </div>
            <div className="col-auto">{this.searchForm()}</div>
          </div>
          <div>{this.renderListingsTable()}</div>
          <PaginatorCursor
            current={this.props.cursor}
            resource={this.state.listMultiCommunitiesRes}
            onPageChange={cursor => handlePageChange(this, cursor)}
          />
        </div>
      </div>
    );
  }

  searchForm() {
    return (
      <form className="row" onSubmit={e => handleSearchSubmit(this, e)}>
        <div className="col-auto">
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

  async updateUrl(props: Partial<Props>) {
    const { listingType, sort } = { ...this.props, ...props };

    const queryParams: QueryParams<Props> = {
      listingType: listingType,
      sort: sort,
    };

    this.props.history.push(`/multi_communities${getQueryString(queryParams)}`);
  }

  static async fetchInitialData({
    headers,
    query: { listingType, sort, cursor },
  }: InitialFetchRequest<PathProps, Props>): Promise<MultiCommunitiesData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    // TODO add time range picker
    const form: ListMultiCommunities = {
      type_: listingType,
      sort,
      limit: multiCommunityLimit,
      page_cursor: cursor,
    };

    return {
      listMultiCommunitiesRes: await client.listMultiCommunities(form),
    };
  }

  fetchToken?: symbol;
  async refetch({ listingType, sort, cursor }: Props) {
    const token = (this.fetchToken = Symbol());
    this.setState({ listMultiCommunitiesRes: LOADING_REQUEST });
    const listMultiCommunitiesRes =
      await HttpService.client.listMultiCommunities({
        type_: listingType,
        sort: sort,
        limit: multiCommunityLimit,
        page_cursor: cursor,
      });
    if (token === this.fetchToken) {
      this.setState({ listMultiCommunitiesRes });
    }
  }

  findAndUpdateMultiCommunity(res: RequestState<MultiCommunityResponse>) {
    this.setState(s => {
      if (
        s.listMultiCommunitiesRes.state === "success" &&
        res.state === "success"
      ) {
        s.listMultiCommunitiesRes.data.items = editMultiCommunity(
          res.data.multi_community_view,
          s.listMultiCommunitiesRes.data.items,
        );
      }
      return s;
    });
  }
}

function handlePageChange(i: MultiCommunities, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleSortChange(i: MultiCommunities, val: MultiCommunitySortType) {
  i.updateUrl({ sort: val, cursor: undefined });
}

function handleListingTypeChange(
  i: MultiCommunities,
  val: MultiCommunityListingType,
) {
  i.updateUrl({
    listingType: val,
    cursor: undefined,
  });
}

function handleSearchChange(i: MultiCommunities, event: any) {
  i.setState({ searchText: event.target.value });
}

function handleSearchSubmit(i: MultiCommunities, event: any) {
  event.preventDefault();
  const searchParamEncoded = i.state.searchText;
  const { listingType } = i.props;
  i.context.router.history.push(
    `/search${getQueryString({ q: searchParamEncoded, type: "multi_communities", listingType })}`,
  );
}

async function handleFollow(
  i: MultiCommunities,
  multi_community_id: MultiCommunityId,
  follow: boolean,
) {
  const res = await HttpService.client.followMultiCommunity({
    multi_community_id,
    follow,
  });
  i.findAndUpdateMultiCommunity(res);
}
