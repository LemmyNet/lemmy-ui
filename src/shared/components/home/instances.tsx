import { setIsoData } from "@utils/app";
import { RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import {
  GetFederatedInstancesResponse,
  GetSiteResponse,
  Instance,
} from "lemmy-js-client";
import classNames from "classnames";
import { relTags } from "../../config";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import Tabs from "../common/tabs";

type InstancesData = RouteDataResponse<{
  federatedInstancesResponse: GetFederatedInstancesResponse;
}>;

interface InstancesState {
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

export class Instances extends Component<any, InstancesState> {
  private isoData = setIsoData<InstancesData>(this.context);
  state: InstancesState = {
    instancesRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    isIsomorphic: false,
  };

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
      instancesRes: { state: "loading" },
    });

    this.setState({
      instancesRes: await HttpService.client.getFederatedInstances({}),
    });
  }

  static async fetchInitialData({
    client,
  }: InitialFetchRequest): Promise<InstancesData> {
    return {
      federatedInstancesResponse: await client.getFederatedInstances({}),
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
          <>
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
                      {this.itemList(instances[status])}
                    </div>
                  ),
                }))}
            />
          </>
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

  itemList(items: Instance[]) {
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
                  <a href={`https://${i.domain}`} rel={relTags}>
                    {i.domain}
                  </a>
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
