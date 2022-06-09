import { None, Option, Some } from "@sniptt/monads";
import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { relTags, setIsoData, toOption } from "../../utils";
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
    return toOption(this.state.siteRes.federated_instances).match({
      some: federated_instances => (
        <div class="container">
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            description={None}
            image={None}
          />
          <div class="row">
            <div class="col-md-6">
              <h5>{i18n.t("linked_instances")}</h5>
              {this.itemList(Some(federated_instances.linked))}
            </div>
            {federated_instances.allowed?.length > 0 && (
              <div class="col-md-6">
                <h5>{i18n.t("allowed_instances")}</h5>
                {this.itemList(toOption(federated_instances.allowed))}
              </div>
            )}
            {federated_instances.blocked?.length > 0 && (
              <div class="col-md-6">
                <h5>{i18n.t("blocked_instances")}</h5>
                {this.itemList(toOption(federated_instances.blocked))}
              </div>
            )}
          </div>
        </div>
      ),
      none: <></>,
    });
  }

  itemList(items: Option<string[]>) {
    let noneFound = <div>{i18n.t("none_found")}</div>;
    return items.match({
      some: items =>
        items.length > 0 ? (
          <ul>
            {items.map(i => (
              <li>
                <a href={`https://${i}`} rel={relTags}>
                  {i}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          noneFound
        ),
      none: noneFound,
    });
  }
}
