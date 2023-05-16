import { Component } from "inferno";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { IsoDataOptionalSite } from "shared/interfaces";
import { i18n } from "../../i18next";
import { routes } from "../../routes";
import { isAuthPath, setIsoData } from "../../utils";
import AuthGuard from "../common/auth-guard";
import ErrorGuard from "../common/error-guard";
import { ErrorPage } from "./error-page";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import "./styles.scss";
import { Theme } from "./theme";

export class App extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    const siteRes = this.isoData.site_res;
    const siteView = siteRes?.site_view;

    return (
      <>
        <Provider i18next={i18n}>
          <div id="app">
            {siteView && (
              <Theme defaultTheme={siteView.local_site.default_theme} />
            )}
            <Navbar siteRes={siteRes} />
            <div className="mt-4 p-0 fl-1">
              <Switch>
                {routes.map(({ path, component: RouteComponent }) => (
                  <Route
                    key={path}
                    path={path}
                    exact
                    component={routeProps => (
                      <ErrorGuard>
                        {RouteComponent &&
                          (isAuthPath(path ?? "") ? (
                            <AuthGuard>
                              <RouteComponent {...routeProps} />
                            </AuthGuard>
                          ) : (
                            <RouteComponent {...routeProps} />
                          ))}
                      </ErrorGuard>
                    )}
                  />
                ))}
                <Route component={ErrorPage} />
              </Switch>
            </div>
            <Footer site={siteRes} />
          </div>
        </Provider>
      </>
    );
  }
}
