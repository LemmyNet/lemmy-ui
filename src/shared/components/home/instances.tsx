import { None } from "@sniptt/monads";
import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { relTags, setIsoData } from "../../utils";
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
    return this.state.siteRes.federated_instances.match({
      some: federated_instances => (
        <div className="container-lg">
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            description={None}
            image={None}
          />
          <div className="row">
            <div className="col-md-6">
              <h5>{i18n.t("linked_instances")}</h5>
              {this.itemList(federated_instances.linked)}
            </div>
            {federated_instances.allowed.match({
              some: allowed =>
                allowed.length > 0 && (
                  <div className="col-md-6">
                    <h5>{i18n.t("allowed_instances")}</h5>
                    {this.itemList(allowed)}
                  </div>
                ),
              none: <></>,
            })}
            {federated_instances.blocked.match({
              some: blocked =>
                blocked.length > 0 && (
                  <div className="col-md-6">
                    <h5>{i18n.t("blocked_instances")}</h5>
                    {this.itemList(blocked)}
                  </div>
                ),
              none: <></>,
            })}
          </div>
        </div>
      ),
      none: <></>,
    });
  }

  itemList(items: string[]) {
    let noneFound = <div>{i18n.t("none_found")}</div>;
    return items.length > 0 ? (
      <ul>
        {items.map(i => (
          <li key={i}>
            <a href={`https://${i}`} rel={relTags}>
              {i}
            </a>
          </li>
        ))}
      </ul>
    ) : (
      noneFound
    );
  }
}
