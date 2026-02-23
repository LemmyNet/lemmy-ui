import { setIsoData } from "@utils/app";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  ItemIdAndRes,
  itemLoading,
  QueryParams,
  RouteDataResponse,
} from "@utils/types";
import { Component } from "inferno";
import {
  ApproveCommunityPendingFollower,
  CommunityId,
  LemmyHttp,
  PagedResponse,
  PaginationCursor,
  PendingFollowerView,
  PendingFollow as PendingFollowView,
  PersonId,
  SuccessResponse,
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
  RegistrationStateDropdown,
} from "@components/common/registration-state-dropdown";

type PendingFollowsData = RouteDataResponse<{
  listPendingFollowsResponse: PagedResponse<PendingFollowerView>;
}>;

type CommunityAndPerson = {
  communityId: CommunityId;
  personId: PersonId;
};

interface PendingFollowsState {
  appsRes: RequestState<PagedResponse<PendingFollowerView>>;
  approveRes: ItemIdAndRes<CommunityAndPerson, SuccessResponse>;
  isIsomorphic: boolean;
}

interface PendingFollowsProps {
  viewState: RegistrationState;
  cursor?: PaginationCursor;
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
    approveRes: { id: { communityId: 0, personId: 0 }, res: EMPTY_REQUEST },
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.appsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

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

  async componentWillReceiveProps(
    nextProps: PendingFollowsRouteProps & { children?: InfernoNode },
  ) {
    if (
      nextProps.viewState !== this.props.viewState ||
      nextProps.cursor !== this.props.cursor
    ) {
      await this.refetch(nextProps);
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
                  onPageChange={cursor => handlePageChange(this, cursor)}
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
        <RegistrationStateDropdown
          currentOption={this.props.viewState}
          onSelect={val => handlePendingFollowsStateChange(this, val)}
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
        {pending.map(pendingFollow => (
          <>
            <hr />
            <PendingFollow
              pending_follow={pendingFollow}
              myUserInfo={this.isoData.myUserInfo}
              loading={
                itemLoading(this.state.approveRes)?.communityId ===
                  pendingFollow.community.id &&
                itemLoading(this.state.approveRes)?.personId ===
                  pendingFollow.person.id
              }
              onApproveFollower={form => handleApproveFollower(this, form)}
            />
          </>
        ))}
      </div>
    );
  }

  static fetchInitialData = async ({
    headers,
    match: {
      params: { viewState, cursor },
    },
  }: InitialFetchRequest<
    Record<string, never>,
    PendingFollowsProps
  >): Promise<PendingFollowsData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    // TODO: this is always undefined after page reload
    const state = viewState ?? "unread";
    return {
      listPendingFollowsResponse: headers["Authorization"]
        ? await client.listCommunityPendingFollows({
            unread_only: state === "unread",
            page_cursor: cursor,
            limit: fetchLimit,
          })
        : EMPTY_REQUEST,
    };
  };

  refetchToken?: symbol;
  async refetch(props: PendingFollowsProps) {
    const token = (this.refetchToken = Symbol());
    const { viewState, cursor } = props;
    this.setState({
      appsRes: LOADING_REQUEST,
    });
    const appsRes = await HttpService.client.listCommunityPendingFollows({
      unread_only: viewState === "unread",
      page_cursor: cursor,
      limit: fetchLimit,
    });
    if (token === this.refetchToken) {
      this.setState({ appsRes });
    }
  }

  updateUrl(props: Partial<PendingFollowsProps>) {
    const { cursor, viewState: state } = { ...this.props, ...props };

    const queryParams: QueryParams<PendingFollowsProps> = {
      cursor,
      viewState: state,
    };

    this.props.history.push(`/pending_follows${getQueryString(queryParams)}`);
  }
}

async function handleApproveFollower(
  i: PendingFollows,
  form: ApproveCommunityPendingFollower,
) {
  i.setState({
    approveRes: {
      id: { communityId: form.community_id, personId: form.follower_id },
      res: LOADING_REQUEST,
    },
  });
  const res = await HttpService.client.approveCommunityPendingFollow(form);
  i.setState({
    approveRes: {
      id: { communityId: form.community_id, personId: form.follower_id },
      res,
    },
  });
  if (i.state.appsRes.state === "success" && res.state === "success") {
    await i.refetch(i.props);
  }
}

function handlePendingFollowsStateChange(
  i: PendingFollows,
  val: RegistrationState,
) {
  i.updateUrl({ viewState: val, cursor: undefined });
}

function handlePageChange(i: PendingFollows, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}
