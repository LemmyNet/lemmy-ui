import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { mdToHtml } from "../../markdown";
import { FirstLoadService, I18NextService } from "../../services";
import { HtmlTags } from "../common/html-tags";

interface LegalState {
  siteRes: GetSiteResponse;
}

export class Legal extends Component<any, LegalState> {
  private isoData = setIsoData(this.context);
  state: LegalState = {
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    FirstLoadService.isFirstLoad;
  }

  get documentTitle(): string {
    return I18NextService.i18n.t("legal_information");
  }

  render() {
    const legal = this.state.siteRes.site_view.local_site.legal_information;
    return (
      <div className="legal container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {legal && (
          <div className="md-div" dangerouslySetInnerHTML={mdToHtml(legal)} />
        )}
      </div>
    );
  }
}
