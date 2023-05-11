import { Component } from "inferno";
import {
  GetFederatedInstancesResponse,
  GetSiteResponse,
  Instance,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { WebSocketService } from "../../services";
import {
  isBrowser,
  relTags,
  setIsoData,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";

interface InstancesState {
  siteRes: GetSiteResponse;
  instancesRes?: GetFederatedInstancesResponse;
  loading: boolean;
}

export class Instances extends Component<any, InstancesState> {
  private isoData = setIsoData(this.context);
  state: InstancesState = {
    siteRes: this.isoData.site_res,
    loading: true,
  };
  private subscription?: Subscription;

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        instancesRes: this.isoData
          .routeData[0] as GetFederatedInstancesResponse,
        loading: false,
      };
    } else {
      WebSocketService.Instance.send(wsClient.getFederatedInstances({}));
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    promises.push(req.client.getFederatedInstances({}));

    return promises;
  }

  get documentTitle(): string {
    return `${i18n.t("instances")} - ${this.state.siteRes.site_view.site.name}`;
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  render() {
    let federated_instances = this.state.instancesRes?.federated_instances;
    return federated_instances ? (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-md-6">
            <h5>{i18n.t("linked_instances")}</h5>
            {this.itemList(federated_instances.linked)}
          </div>
          {federated_instances.allowed &&
            federated_instances.allowed.length > 0 && (
              <div className="col-md-6">
                <h5>{i18n.t("allowed_instances")}</h5>
                {this.itemList(federated_instances.allowed)}
              </div>
            )}
          {federated_instances.blocked &&
            federated_instances.blocked.length > 0 && (
              <div className="col-md-6">
                <h5>{i18n.t("blocked_instances")}</h5>
                {this.itemList(federated_instances.blocked)}
              </div>
            )}
        </div>
      </div>
    ) : (
      <></>
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
  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.context.router.history.push("/");
      this.setState({ loading: false });
      return;
    } else if (op == UserOperation.GetFederatedInstances) {
      let data = wsJsonToRes<GetFederatedInstancesResponse>(msg);
      this.setState({ loading: false, instancesRes: data });
    }
  }
}
