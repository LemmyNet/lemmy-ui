import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { Metadata } from "@utils/routes";

export class Legal extends Component<object, object> {
  private isoData = setIsoData(this.context);

  static metadata = (): Metadata | undefined => {
    const title = I18NextService.i18n.t("legal_information");
    return { title };
  };

  render() {
    const legal = this.isoData.siteRes?.site_view.local_site.legal_information;
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
