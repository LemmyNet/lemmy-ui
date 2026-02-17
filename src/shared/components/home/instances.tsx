import { setIsoData } from "@utils/app";
import { QueryParams, RouteDataResponse } from "@utils/types";
import { Component, FormEvent } from "inferno";
import {
  GetFederatedInstancesKind,
  PagedResponse,
  FederatedInstanceView,
  GetSiteResponse,
  LemmyHttp,
  PaginationCursor,
} from "lemmy-js-client";
import { fetchLimit, relTags } from "@utils/config";
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
import { Icon, Spinner } from "../common/icon";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import {
  getQueryParams,
  getQueryString,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";
import { formatRelativeDate, isWeekOld } from "@utils/date";
import { TableHr } from "@components/common/tables";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { createRef } from "inferno";
import { Action } from "history";
import { InstancesKindDropdown } from "@components/common/instances-kind-dropdown";

function getKindFromQuery(kind?: string): GetFederatedInstancesKind {
  return kind ? (kind as GetFederatedInstancesKind) : "all";
}

export function getInstancesQueryParams(source?: string): InstancesProps {
  return getQueryParams<InstancesProps>(
    {
      kind: getKindFromQuery,
      cursor: (cursor?: string) => cursor,
      domain_filter: (domain_filter?: string) => domain_filter,
    },
    source,
  );
}

type InstancesData = RouteDataResponse<{
  federatedInstancesResponse: PagedResponse<FederatedInstanceView>;
}>;

interface InstancesState {
  instancesRes: RequestState<PagedResponse<FederatedInstanceView>>;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

interface InstancesProps {
  kind: GetFederatedInstancesKind;
  cursor?: PaginationCursor;
  domain_filter?: string;
}

type InstancesRouteProps = RouteComponentProps<Record<string, never>> &
  InstancesProps;
export type InstancesFetchConfig = IRoutePropsWithFetch<
  InstancesData,
  Record<string, never>,
  InstancesProps
>;

@scrollMixin
export class Instances extends Component<InstancesRouteProps, InstancesState> {
  private isoData = setIsoData<InstancesData>(this.context);
  searchInput = createRef<HTMLInputElement>();
  state: InstancesState = {
    instancesRes: EMPTY_REQUEST,
    siteRes: this.isoData.siteRes,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.instancesRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      this.state = {
        ...this.state,
        instancesRes: this.isoData.routeData.federatedInstancesResponse,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.fetchInstances(this.props);
    }
  }

  componentDidMount() {
    if (this.props.history.action !== Action.Pop || this.state.isIsomorphic) {
      this.searchInput.current?.select();
    }
  }

  componentWillReceiveProps(nextProps: InstancesRouteProps) {
    this.fetchInstances(nextProps);
  }

  async fetchInstances(props: InstancesProps) {
    this.setState({
      instancesRes: LOADING_REQUEST,
    });

    this.setState({
      instancesRes: await HttpService.client.getFederatedInstances({
        kind: props.kind,
        domain_filter: props.domain_filter,
        page_cursor: props.cursor,
        limit: fetchLimit,
      }),
    });
  }

  static fetchInitialData = async ({
    headers,
    query: { kind, cursor, domain_filter },
  }: InitialFetchRequest<
    Record<string, never>,
    InstancesProps
  >): Promise<InstancesData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      federatedInstancesResponse: await client.getFederatedInstances({
        kind: kind,
        page_cursor: cursor,
        domain_filter,
        limit: fetchLimit,
      }),
    };
  };

  get documentTitle(): string {
    return `${I18NextService.i18n.t("instances")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  renderInstances() {
    switch (this.state.instancesRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const instances = this.state.instancesRes.data.items;
        return instances ? (
          <InstanceList instances={instances} showRemove={false} />
        ) : (
          <h5>No linked instance</h5>
        );
      }
    }
  }

  render() {
    return (
      <div className="home-instances container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.renderFilters()}
        {this.renderInstances()}
        <PaginatorCursor
          current={this.props.cursor}
          resource={this.state.instancesRes}
          onPageChange={cursor => handlePageChange(this, cursor)}
        />
      </div>
    );
  }

  updateUrl(props: Partial<InstancesProps>) {
    const { kind, cursor, domain_filter } = { ...this.props, ...props };

    const queryParams: QueryParams<InstancesProps> = {
      kind,
      cursor,
      domain_filter,
    };

    this.props.history.push(`/instances${getQueryString(queryParams)}`);
  }

  renderFilters() {
    return (
      <div className="row row-cols-auto align-items-center g-3 mb-2">
        <div className="col me-auto">
          <InstancesKindDropdown
            currentOption={this.props.kind}
            onSelect={val => handleKindChange(this, val)}
          />
        </div>
        <form
          className="d-flex col"
          onSubmit={e => handleSearchSubmit(this, e)}
        >
          {/* key is necessary for defaultValue to update when domain_filter
            changes, e.g. back button. */}
          <input
            key={this.context.router.history.location.key}
            name="q"
            type="search"
            className="form-control"
            placeholder={`${I18NextService.i18n.t("search")}...`}
            aria-label={I18NextService.i18n.t("search")}
            defaultValue={this.props.domain_filter ?? ""}
            ref={this.searchInput}
          />
          <button
            type="submit"
            className="btn btn-light border-light-subtle ms-1"
          >
            <Icon icon="search" />
          </button>
        </form>
      </div>
    );
  }
}

interface InstanceListProps {
  instances: FederatedInstanceView[];
  hideNoneFound?: boolean;
  onRemove?: (instance: string) => void;
  showRemove: boolean;
  cursor?: PaginationCursor;
}

export function InstanceList({
  instances,
  hideNoneFound,
  onRemove,
  showRemove,
}: InstanceListProps) {
  const nameCols = "col-12 col-md-6";
  const otherCols = "col-4 col-md-2";

  return instances.length > 0 ? (
    <div id="instances-table">
      <div className="row">
        <div className={`${nameCols} fw-bold`}>
          {I18NextService.i18n.t("name")}
        </div>
        <div className={`${otherCols} fw-bold`}>
          {I18NextService.i18n.t("software")}
        </div>
        <div className={`${otherCols} fw-bold`}>
          {I18NextService.i18n.t("version")}
        </div>
        <div className={`${otherCols} fw-bold`}>
          {I18NextService.i18n.t("last_updated")}
        </div>
      </div>
      <TableHr />
      {instances.map(i => (
        <>
          <div key={i.instance.domain} className="row">
            <div className={nameCols}>
              {!i.blocked ? (
                <a href={`https://${i.instance.domain}`} rel={relTags}>
                  {i.instance.domain}{" "}
                </a>
              ) : (
                <span>{i.instance.domain}</span>
              )}
              {showRemove && onRemove && (
                <button
                  className="btn btn-link"
                  onClick={() => onRemove(i.instance.domain)}
                >
                  <Icon icon={"x"} classes="icon-inline text-danger" />
                </button>
              )}
            </div>
            <div className={otherCols}>{i.instance.software}</div>
            <div className={otherCols}>{i.instance.version}</div>
            <div className={otherCols}>
              {formatRelativeDate(
                i.instance.updated_at ?? i.instance.published_at,
              )}
              {isWeekOld(
                new Date(i.instance.updated_at ?? i.instance.published_at),
              ) && " 💀"}
            </div>
            <hr />
          </div>
        </>
      ))}
    </div>
  ) : (
    !hideNoneFound && <div>{I18NextService.i18n.t("none_found")}</div>
  );
}

function handleSearchSubmit(i: Instances, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  i.updateUrl({ domain_filter: i.searchInput.current?.value });
}

function handleKindChange(i: Instances, kind: GetFederatedInstancesKind) {
  i.updateUrl({ kind });
}

function handlePageChange(i: Instances, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}
