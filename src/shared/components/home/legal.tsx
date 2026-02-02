import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { HtmlTags } from "../common/html-tags";

export class Legal extends Component<any, any> {
  private isoData = setIsoData(this.context);

  get documentTitle(): string {
    return I18NextService.i18n.t("legal_information");
  }

  render() {
    const legal = this.isoData.siteRes?.site_view.local_site.legal_information;
    return (
      <div className="legal container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
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
