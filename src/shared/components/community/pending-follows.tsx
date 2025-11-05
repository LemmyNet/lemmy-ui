import { setIsoData } from "@utils/app";
import {
  cursorComponents,
  getQueryParams,
  getQueryString,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  DirectionalCursor,
  QueryParams,
  RouteDataResponse,
} from "@utils/types";
import { Component } from "inferno";
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
import {
  RegistrationState,
  RegistrationStateRadios,
} from "@components/common/registration-state-radios";

type PendingFollowsData = RouteDataResponse<{
  listPendingFollowsResponse: ListCommunityPendingFollowsResponse;
}>;

interface PendingFollowsState {
  appsRes: RequestState<ListCommunityPendingFollowsResponse>;
  isIsomorphic: boolean;
}

interface PendingFollowsProps {
  viewState: RegistrationState;
  cursor?: DirectionalCursor;
}

function stateFromQuery(view?: string): RegistrationState {
  switch (view) {
    case "unread":
    case "all":
    case "denied":
      return view;
    default:
      return "unread";
  }
}

export function getPendingFollowsQueryParams(
  source?: string,
): PendingFollowsProps {
  return getQueryParams<PendingFollowsProps>(
    {
      viewState: stateFromQuery,
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
    this.handlePendingFollowsStateChange =
      this.handlePendingFollowsStateChange.bind(this);

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
      nextProps.viewState !== this.props.viewState ||
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
    return (
      <div className="mb-2">
        <RegistrationStateRadios
          state={this.props.viewState}
          onClick={this.handlePendingFollowsStateChange}
        />
      </div>
    );
  }

  applicationList(pending: PendingFollowView[]) {
    if (this.props.viewState === "denied") {
      pending = pending.filter(p => p.follow_state === "denied");
    }
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

  handlePendingFollowsStateChange(val: RegistrationState) {
    this.updateUrl({ viewState: val, cursor: undefined });
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  static async fetchInitialData({
    headers,
    match: {
      params: { viewState, cursor },
    },
  }: InitialFetchRequest<
    Record<string, never>,
    PendingFollowsProps
  >): Promise<PendingFollowsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    // TODO: this is always undefined after page reload
    const state = viewState ?? "unread";
    return {
      listPendingFollowsResponse: headers["Authorization"]
        ? await client.listCommunityPendingFollows({
            unread_only: state === "unread",
            ...cursorComponents(cursor),
            limit: fetchLimit,
          })
        : EMPTY_REQUEST,
    };
  }

  refetchToken?: symbol;
  async refetch(props: PendingFollowsProps) {
    const token = (this.refetchToken = Symbol());
    const { viewState, cursor } = props;
    this.setState({
      appsRes: LOADING_REQUEST,
    });
    const appsRes = await HttpService.client.listCommunityPendingFollows({
      unread_only: viewState === "unread",
      ...cursorComponents(cursor),
      limit: fetchLimit,
    });
    if (token === this.refetchToken) {
      this.setState({ appsRes });
    }
  }

  async updateUrl(props: Partial<PendingFollowsProps>) {
    const { cursor, viewState: state } = { ...this.props, ...props };

    const queryParams: QueryParams<PendingFollowsProps> = {
      cursor,
      viewState: state,
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
