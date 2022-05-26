import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { mdToHtml, setIsoData } from "../../utils";
import { HtmlTags } from "../common/html-tags";

interface LegalState {
  siteRes: GetSiteResponse;
}

export class Legal extends Component<any, LegalState> {
  private isoData = setIsoData(this.context);
  private emptyState: LegalState = {
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  get documentTitle(): string {
    return i18n.t("legal_information");
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(
            this.state.siteRes.site_view.site.legal_information
          )}
        />
      </div>
    );
  }
}
