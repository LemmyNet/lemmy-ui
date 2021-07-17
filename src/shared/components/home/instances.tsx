import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { setIsoData } from "../../utils";
import { HtmlTags } from "../common/html-tags";

interface InstancesState {
  siteRes: GetSiteResponse;
}

export class Instances extends Component<any, InstancesState> {
  private isoData = setIsoData(this.context);
  private emptyState: InstancesState = {
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  get documentTitle(): string {
    return `${i18n.t("instances")} - ${this.state.siteRes.site_view.site.name}`;
  }

  render() {
    let federated_instances = this.state.siteRes?.federated_instances;
    return (
      federated_instances && (
        <div class="container">
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
          />
          <div class="row">
            <div class="col-md-6">
              <h5>{i18n.t("linked_instances")}</h5>
              {this.itemList(federated_instances.linked)}
            </div>
            {federated_instances.allowed?.length > 0 && (
              <div class="col-md-6">
                <h5>{i18n.t("allowed_instances")}</h5>
                {this.itemList(federated_instances.allowed)}
              </div>
            )}
            {federated_instances.blocked?.length > 0 && (
              <div class="col-md-6">
                <h5>{i18n.t("blocked_instances")}</h5>
                {this.itemList(federated_instances.blocked)}
              </div>
            )}
          </div>
        </div>
      )
    );
  }

  itemList(items: string[]) {
    return items.length > 0 ? (
      <ul>
        {items.map(i => (
          <li>
            <a href={`https://${i}`} rel="noopener">
              {i}
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <div>{i18n.t("none_found")}</div>
    );
  }
}
