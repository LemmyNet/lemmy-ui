import { setIsoData } from "@utils/app";
import {
  cursorComponents,
  getQueryParams,
  getQueryString,
  randomStr,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  DirectionalCursor,
  QueryParams,
  RouteDataResponse,
} from "@utils/types";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import {
  ApproveCommunityPendingFollower,
  LemmyHttp,
  ListCommunityPendingFollowsResponse,
  PendingFollow as PendingFollowView,
} from "lemmy-js-client";
import { fetchLimit } from "@utils/config";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { getHttpBaseInternal } from "../../utils/env";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { InfernoNode } from "inferno";
import { PendingFollow } from "@components/common/pending-follow";

type ViewState = "Unread" | "All";

type PendingFollowsData = RouteDataResponse<{
  listPendingFollowsResponse: ListCommunityPendingFollowsResponse;
}>;

interface PendingFollowsState {
  appsRes: RequestState<ListCommunityPendingFollowsResponse>;
  isIsomorphic: boolean;
}

interface PendingFollowsProps {
  view_state: ViewState;
  cursor?: DirectionalCursor;
}

function stateFromQuery(view?: string): ViewState {
  switch (view) {
    case "Unread":
    case "All":
      return view;
    default:
      return "Unread";
  }
}

export function getPendingFollowsQueryParams(
  source?: string,
): PendingFollowsProps {
  return getQueryParams<PendingFollowsProps>(
    {
      view_state: stateFromQuery,
      cursor: (cursor?: string) => cursor,
    },
    source,
  );
}

export type PendingFollowsFetchConfig = IRoutePropsWithFetch<
  PendingFollowsData,
  Record<string, never>,
  PendingFollowsProps
>;

type PendingFollowsRouteProps = RouteComponentProps<Record<string, never>> &
  PendingFollowsProps;

@scrollMixin
export class PendingFollows extends Component<
  PendingFollowsRouteProps,
  PendingFollowsState
> {
  private isoData = setIsoData<PendingFollowsData>(this.context);
  state: PendingFollowsState = {
    appsRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.appsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleApproveFollower = this.handleApproveFollower.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      this.state = {
        ...this.state,
        appsRes: this.isoData.routeData.listPendingFollowsResponse,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.refetch(this.props);
    }
  }

  componentWillReceiveProps(
    nextProps: PendingFollowsRouteProps & { children?: InfernoNode },
  ): void {
    if (
      nextProps.view_state !== this.props.view_state ||
      nextProps.cursor !== this.props.cursor
    ) {
      this.refetch(nextProps);
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t(
      "community_pending_follows",
    )} - ${this.isoData.siteRes.site_view.site.name}`;
  }

  render() {
    const state = this.state.appsRes.state;
    const pending = state === "success" && this.state.appsRes.data.items;
    return (
      <div className="container-lg">
        <div className="row">
          <div className="col-12">
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("community_pending_follows")}
            </h1>
            {this.selects()}
            {pending ? (
              <>
                {this.applicationList(pending)}
                <PaginatorCursor
                  current={this.props.cursor}
                  resource={this.state.appsRes}
                  onPageChange={this.handlePageChange}
                />
              </>
            ) : (
              state === "loading" && (
                <div className="text-center">
                  <Spinner large />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  selects() {
    const radioId = randomStr();
    return (
      <div className="mb-2">
        <span className="me-3">
          <div
            className="btn-group btn-group-toggle flex-wrap mb-2"
            role="group"
          >
            <input
              id={`${radioId}-unread`}
              type="radio"
              className="btn-check"
              value={"Unread"}
              checked={this.props.view_state === "Unread"}
              onChange={linkEvent(this, this.handlePendingFollowsStateChange)}
            />
            <label
              htmlFor={`${radioId}-unread`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.props.view_state === "Unread",
              })}
            >
              {I18NextService.i18n.t("unread")}
            </label>

            <input
              id={`${radioId}-all`}
              type="radio"
              className="btn-check"
              value={"All"}
              checked={this.props.view_state === "All"}
              onChange={linkEvent(this, this.handlePendingFollowsStateChange)}
            />
            <label
              htmlFor={`${radioId}-all`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.props.view_state === "All",
              })}
            >
              {I18NextService.i18n.t("all")}
            </label>
          </div>
        </span>
      </div>
    );
  }

  applicationList(pending: PendingFollowView[]) {
    return (
      <div>
        {pending.map(pending_follow => (
          <>
            <hr />
            <PendingFollow
              pending_follow={pending_follow}
              myUserInfo={this.isoData.myUserInfo}
              onApproveFollower={this.handleApproveFollower}
            />
          </>
        ))}
      </div>
    );
  }

  handlePendingFollowsStateChange(i: PendingFollows, event: any) {
    i.updateUrl({ view_state: event.target.value, cursor: undefined });
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  static async fetchInitialData({
    headers,
    match: {
      params: { view, cursor },
    },
  }: InitialFetchRequest<
    Record<string, never>,
    PendingFollowsProps
  >): Promise<PendingFollowsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      listPendingFollowsResponse: headers["Authorization"]
        ? await client.listCommunityPendingFollows({
            pending_only: view === "Unread",
            ...cursorComponents(cursor),
            limit: fetchLimit,
          })
        : EMPTY_REQUEST,
    };
  }

  refetchToken?: symbol;
  async refetch(props: PendingFollowsProps) {
    const token = (this.refetchToken = Symbol());
    const { view_state: state, cursor } = props;
    this.setState({
      appsRes: LOADING_REQUEST,
    });
    const appsRes = await HttpService.client.listCommunityPendingFollows({
      pending_only: state === "Unread",
      ...cursorComponents(cursor),
      limit: fetchLimit,
    });
    if (token === this.refetchToken) {
      this.setState({ appsRes });
    }
  }

  async updateUrl(props: Partial<PendingFollowsProps>) {
    const { cursor, view_state: state } = { ...this.props, ...props };

    const queryParams: QueryParams<PendingFollowsProps> = {
      cursor,
      view_state: state,
    };

    this.props.history.push(`/pending_follows${getQueryString(queryParams)}`);
  }

  async handleApproveFollower(form: ApproveCommunityPendingFollower) {
    const approveRes =
      await HttpService.client.approveCommunityPendingFollow(form);
    this.setState(s => {
      if (s.appsRes.state === "success" && approveRes.state === "success") {
        this.refetch(this.props);
      }
      return s;
    });
  }
}
