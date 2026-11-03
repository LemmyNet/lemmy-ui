import { setIsoData, WithHead } from "@utils/app";
import { Component } from "inferno";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { htmlTags } from "../common/html-tags";
import { RouterContext } from "inferno-router";

type RouteProps = WithHead;

export class Legal extends Component<RouteProps, object> {
  private isoData = setIsoData(this.context);

  get documentTitle(): string {
    return I18NextService.i18n.t("legal_information");
  }

  render() {
    const legal = this.isoData.siteRes?.site_view.local_site.legal_information;
    htmlTags({
      head: this.props.head,
      title: this.documentTitle,
      context: this.context as RouterContext,
    });

    return (
      <div className="legal container-lg">
        {legal && (
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(legal, () => this.forceUpdate())}
          />
        )}
      </div>
    );
  }
}
