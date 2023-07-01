import { myAuth } from "@utils/app";
import { Component } from "inferno";
import { NavLink } from "inferno-router";
import { GetSiteResponse } from "lemmy-js-client";
import { docsUrl, joinLemmyUrl, repoUrl } from "../../config";
import { I18NextService } from "../../services";
import { VERSION } from "../../version";

interface FooterProps {
  site?: GetSiteResponse;
}

export class Footer extends Component<FooterProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <footer className="app-footer container-lg navbar navbar-expand-md navbar-light navbar-bg p-3">
        <div className="navbar-collapse">
          <ul className="navbar-nav ms-auto">
            {this.props.site?.version !== VERSION && (
              <li className="nav-item">
                <span className="nav-link">UI: {VERSION}</span>
              </li>
            )}
            <li className="nav-item">
              <span className="nav-link">BE: {this.props.site?.version}</span>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/modlog">
                {I18NextService.i18n.t("modlog")}
              </NavLink>
            </li>
            {this.props.site?.site_view.local_site.legal_information && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/legal">
                  {I18NextService.i18n.t("legal_information")}
                </NavLink>
              </li>
            )}
            {this.props.site?.site_view.local_site.federation_enabled && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/instances">
                  {I18NextService.i18n.t("instances")}
                </NavLink>
              </li>
            )}
            <li className="nav-item">
              <a className="nav-link" href={docsUrl}>
                {I18NextService.i18n.t("docs")}
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href={repoUrl}>
                {I18NextService.i18n.t("code")}
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href={joinLemmyUrl}>
                {myAuth()
                  ? new URL(joinLemmyUrl).hostname
                  : I18NextService.i18n.t("join_lemmy")}
              </a>
            </li>
          </ul>
        </div>
      </footer>
    );
  }
}
