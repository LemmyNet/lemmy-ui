import { Component } from "inferno";
import { NavLink } from "inferno-router";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { docsUrl, joinLemmyUrl, repoUrl } from "../../utils";
import { VERSION } from "../../version";

interface FooterProps {
  site: GetSiteResponse;
}

export class Footer extends Component<FooterProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <nav class="container navbar navbar-expand-md navbar-light navbar-bg p-3">
        <div className="navbar-collapse">
          <ul class="navbar-nav ml-auto">
            {this.props.site.version !== VERSION && (
              <li class="nav-item">
                <span class="nav-link">UI: {VERSION}</span>
              </li>
            )}
            <li class="nav-item">
              <span class="nav-link">BE: {this.props.site.version}</span>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/modlog">
                {i18n.t("modlog")}
              </NavLink>
            </li>
            {this.props.site.federated_instances && (
              <li class="nav-item">
                <NavLink className="nav-link" to="/instances">
                  {i18n.t("instances")}
                </NavLink>
              </li>
            )}
            <li class="nav-item">
              <a className="nav-link" href={docsUrl}>
                {i18n.t("docs")}
              </a>
            </li>
            <li class="nav-item">
              <a className="nav-link" href={repoUrl}>
                {i18n.t("code")}
              </a>
            </li>
            <li class="nav-item">
              <a className="nav-link" href={joinLemmyUrl}>
                {i18n.t("join_lemmy")}
              </a>
            </li>
          </ul>
        </div>
      </nav>
    );
  }
}
