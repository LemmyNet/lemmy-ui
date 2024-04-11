import { setIsoData } from "@utils/app";
import { RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import {
  GetFederatedInstancesResponse,
  GetSiteResponse,
  Instance,
  LemmyHttp,
} from "lemmy-js-client";
import classNames from "classnames";
import { relTags } from "../../config";
import { InitialFetchRequest } from "../../interfaces";
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
import Tabs from "../common/tabs";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "../../routes";
import { resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";

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
    siteRes: this.isoData.site_res,
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

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.fetchInstances();
    }
  }

  async fetchInstances() {
    this.setState({
      instancesRes: LOADING_REQUEST,
    });

    this.setState({
      instancesRes: await HttpService.client.getFederatedInstances(),
    });
  }

  static async fetchInitialData({
    headers,
  }: InitialFetchRequest): Promise<InstancesData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      federatedInstancesResponse: await client.getFederatedInstances(),
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
          <div className="row">
            <div className="col-lg-8">
              <Tabs
                tabs={["linked", "allowed", "blocked"]
                  .filter(status => instances[status].length)
                  .map(status => ({
                    key: status,
                    label: I18NextService.i18n.t(`${status}_instances`),
                    getNode: isSelected => (
                      <div
                        role="tabpanel"
                        className={classNames("tab-pane show", {
                          active: isSelected,
                        })}
                      >
                        {status === "blocked"
                          ? this.itemList(instances[status], false)
                          : this.itemList(instances[status])}
                      </div>
                    ),
                  }))}
              />
            </div>
          </div>
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
        {this.renderInstances()}
      </div>
    );
  }

  itemList(items: Instance[], link = true) {
    return items.length > 0 ? (
      <div className="table-responsive">
        <table id="instances_table" className="table table-sm table-hover">
          <thead className="pointer">
            <tr>
              <th>{I18NextService.i18n.t("name")}</th>
              <th>{I18NextService.i18n.t("software")}</th>
              <th>{I18NextService.i18n.t("version")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.domain}>
                <td>
                  {link ? (
                    <a href={`https://${i.domain}`} rel={relTags}>
                      {i.domain}{" "}
                    </a>
                  ) : (
                    <span>{i.domain}</span>
                  )}
                </td>
                <td>{i.software}</td>
                <td>{i.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div>{I18NextService.i18n.t("none_found")}</div>
    );
  }
}
