import { Component } from "inferno";
import {
  GetFederatedInstancesResponse,
  GetSiteResponse,
  Instance,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService } from "../../services/FirstLoadService";
import { HttpService, RequestState } from "../../services/HttpService";
import { relTags, setIsoData } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface InstancesState {
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

export class Instances extends Component<any, InstancesState> {
  private isoData = setIsoData(this.context);
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
        instancesRes: this.isoData.routeData[0],
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

  static fetchInitialData(
    req: InitialFetchRequest
  ): Promise<RequestState<any>>[] {
    return [req.client.getFederatedInstances({})];
  }

  get documentTitle(): string {
    return `${i18n.t("instances")} - ${this.state.siteRes.site_view.site.name}`;
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
            <div className="col-md-6">
              <h5>{i18n.t("linked_instances")}</h5>
              {this.itemList(instances.linked)}
            </div>
            {instances.allowed && instances.allowed.length > 0 && (
              <div className="col-md-6">
                <h5>{i18n.t("allowed_instances")}</h5>
                {this.itemList(instances.allowed)}
              </div>
            )}
            {instances.blocked && instances.blocked.length > 0 && (
              <div className="col-md-6">
                <h5>{i18n.t("blocked_instances")}</h5>
                {this.itemList(instances.blocked)}
              </div>
            )}
          </div>
        ) : (
          <></>
        );
      }
    }
  }

  render() {
    return (
      <div className="container-lg">
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
              <th>{i18n.t("name")}</th>
              <th>{i18n.t("software")}</th>
              <th>{i18n.t("version")}</th>
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
      <div>{i18n.t("none_found")}</div>
    );
  }
}
