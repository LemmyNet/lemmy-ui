import { setIsoData } from "@utils/app";
import { RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import {
  GetFederatedInstancesResponse,
  GetSiteResponse,
  Instance,
  LemmyHttp,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
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
import { resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";
import { formatRelativeDate, isWeekOld } from "@utils/date";
import { TableHr } from "@components/common/tables";

type InstancesData = RouteDataResponse<{
  federatedInstancesResponse: GetFederatedInstancesResponse;
}>;

interface InstancesState {
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

type InstancesRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type InstancesFetchConfig = IRoutePropsWithFetch<
  InstancesData,
  Record<string, never>,
  Record<string, never>
>;

@scrollMixin
export class Instances extends Component<InstancesRouteProps, InstancesState> {
  private isoData = setIsoData<InstancesData>(this.context);
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
      await this.fetchInstances();
    }
  }

  async fetchInstances() {
    this.setState({
      instancesRes: LOADING_REQUEST,
    });

    this.setState({
      instancesRes: await HttpService.client.getFederatedInstances({
        kind: "all",
      }),
    });
  }

  static async fetchInitialData({
    headers,
  }: InitialFetchRequest): Promise<InstancesData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      federatedInstancesResponse: await client.getFederatedInstances({
        kind: "all",
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
        // TODO this needs fixed, and I'm not doing it in this ticket.
        // const instances = this.state.instancesRes.data.federated_instances;
        // return instances ? (
        //   <Tabs
        //     tabs={["linked", "allowed", "blocked"]
        //       .filter(status => instances[status].length)
        //       .map((status: keyof FederatedInstances) => ({
        //         key: status,
        //         label: I18NextService.i18n.t(`${status}_instances`),
        //         getNode: isSelected => (
        //           <div
        //             role="tabpanel"
        //             className={classNames("tab-pane show", {
        //               active: isSelected,
        //             })}
        //           >
        //             {status === "blocked" ? (
        //               <InstanceList items={instances[status]} blocked />
        //             ) : (
        //               <InstanceList items={instances[status]} />
        //             )}
        //           </div>
        //         ),
        //       }))}
        // />
        // ) : (
        //   <h5>No linked instance</h5>
        // );
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
        {this.renderInstances()}
      </div>
    );
  }
}

interface InstanceListProps {
  items: Instance[];
  /// Only use link for non-blocked
  blocked?: boolean;
  onRemove?(instance: string): void;
  hideNoneFound?: boolean;
}

export function InstanceList({
  items,
  blocked,
  onRemove,
  hideNoneFound,
}: InstanceListProps) {
  const nameCols = "col-12 col-md-6";
  const otherCols = "col-4 col-md-2";

  return items.length > 0 ? (
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
      {items.map(i => (
        <>
          <div key={i.domain} className="row">
            <div className={nameCols}>
              {!blocked ? (
                <a href={`https://${i.domain}`} rel={relTags}>
                  {i.domain}{" "}
                </a>
              ) : (
                <span>{i.domain}</span>
              )}
              {onRemove !== undefined && (
                <button
                  className="btn btn-link"
                  onClick={() => onRemove(i.domain)}
                >
                  <Icon icon={"x"} classes="icon-inline text-danger" />
                </button>
              )}
            </div>
            <div className={otherCols}>{i.software}</div>
            <div className={otherCols}>{i.version}</div>
            <div className={otherCols}>
              {formatRelativeDate(i.updated_at ?? i.published_at)}
              {isWeekOld(new Date(i.updated_at ?? i.published_at)) && " 💀"}
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
