import { setIsoData } from "@utils/app";
import {
  DirectionalCursor,
  QueryParams,
  RouteDataResponse,
} from "@utils/types";
import { Component } from "inferno";
import {
  FederatedInstanceView,
  GetFederatedInstancesKind,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  LemmyHttp,
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
  cursorComponents,
  getQueryParams,
  getQueryString,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";
import { formatRelativeDate, isWeekOld } from "@utils/date";
import { TableHr } from "@components/common/tables";
import {
  RadioOption,
  RadioButtonGroup,
} from "@components/common/radio-button-group";
import { linkEvent } from "inferno";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { createRef } from "inferno";

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
  federatedInstancesResponse: GetFederatedInstancesResponse;
}>;

interface InstancesState {
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

interface InstancesProps {
  kind: GetFederatedInstancesKind;
  cursor?: DirectionalCursor;
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

    this.handleChange = this.handleChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

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
      await this.fetchInstances();
    }
  }

  componentDidUpdate(prevProps: InstancesRouteProps) {
    if (
      this.props.location.key !== prevProps.location.key &&
      this.props.history.action !== "POP"
    ) {
      this.searchInput.current?.select();
    }
  }

  componentDidMount() {
    if (this.props.history.action !== "POP" || this.state.isIsomorphic) {
      this.searchInput.current?.select();
    }
  }

  async fetchInstances() {
    this.setState({
      instancesRes: LOADING_REQUEST,
    });

    this.setState({
      instancesRes: await HttpService.client.getFederatedInstances({
        kind: this.props.kind,
        domain_filter: this.props.domain_filter,
        ...cursorComponents(this.props.cursor),
        limit: fetchLimit,
      }),
    });
  }

  static async fetchInitialData({
    headers,
    query: { kind, cursor, domain_filter },
  }: InitialFetchRequest<
    Record<string, never>,
    InstancesProps
  >): Promise<InstancesData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      federatedInstancesResponse: await client.getFederatedInstances({
        kind: kind,
        ...cursorComponents(cursor),
        domain_filter,
        limit: fetchLimit,
      }),
    };
  }

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
        const instances = this.state.instancesRes.data.federated_instances;
        return instances ? (
          <InstanceList instances={instances} />
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
        {this.renderRadios()}
        {this.renderInstances()}
        <PaginatorCursor
          current={this.props.cursor}
          resource={this.state.instancesRes}
          onPageChange={this.handlePageChange}
        />
      </div>
    );
  }

  handleChange(state: GetFederatedInstancesKind) {
    this.updateUrl({ kind: state });
    this.fetchInstances();
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  updateUrl(state: Partial<InstancesProps>) {
    const { kind, cursor, domain_filter } = { ...this.props, ...state };

    const queryParams: QueryParams<InstancesProps> = {
      kind,
      cursor,
      domain_filter,
    };

    this.props.history.push(`/instances${getQueryString(queryParams)}`);
  }

  renderRadios() {
    const allStates: RadioOption[] = [
      { value: "all", i18n: "all" },
      { value: "linked", i18n: "linked_instances" },
      { value: "allowed", i18n: "allowed_instances" },
      { value: "blocked", i18n: "blocked_instances" },
    ];
    return (
      <div className="row mb-2">
        <RadioButtonGroup
          className="col-auto"
          allOptions={allStates}
          currentOption={this.props.kind}
          onClick={this.handleChange}
        />
        <div className="col" />
        <form
          className="d-flex col-auto align-self-end"
          onSubmit={linkEvent(this, this.handleSearchSubmit)}
        >
          <input
            name="q"
            type="search"
            className="form-control flex-initial"
            placeholder={`${I18NextService.i18n.t("search")}...`}
            aria-label={I18NextService.i18n.t("search")}
            defaultValue={this.props.domain_filter}
            ref={this.searchInput}
          />
          <button type="submit" className="btn btn-outline-secondary ms-1">
            <Icon icon="search" />
          </button>
        </form>
      </div>
    );
  }
  handleSearchSubmit(i: Instances, event: any) {
    event.preventDefault();
    let domain_filter: string | undefined =
      i.searchInput.current?.value ?? i.props.domain_filter;
    if (domain_filter === "") {
      domain_filter = undefined;
    }
    i.updateUrl({ domain_filter });
    i.fetchInstances();
  }
}

interface InstanceListProps {
  instances: FederatedInstanceView[];
  hideNoneFound?: boolean;
  onRemove?(instance: string): void;
  cursor?: DirectionalCursor;
}

export function InstanceList({
  instances,
  hideNoneFound,
  onRemove,
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
              {onRemove !== undefined && (
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
          </div>
          <hr />
        </>
      ))}
    </div>
  ) : (
    !hideNoneFound && <div>{I18NextService.i18n.t("none_found")}</div>
  );
}
