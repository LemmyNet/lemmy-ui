import { isAuthPath, setIsoData } from "@utils/app";
import { Component, RefObject, createRef, linkEvent } from "inferno";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { IsoDataOptionalSite } from "../../interfaces";
import { routes } from "../../routes";
import { I18NextService } from "../../services";
import AuthGuard from "../common/auth-guard";
import ErrorGuard from "../common/error-guard";
import { ErrorPage } from "./error-page";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import "./styles.scss";
import { Theme } from "./theme";

export class App extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  private readonly mainContentRef: RefObject<HTMLElement>;
  constructor(props: any, context: any) {
    super(props, context);
    this.mainContentRef = createRef();
  }

  handleJumpToContent(event) {
    event.preventDefault();
    this.mainContentRef.current?.focus();
  }
  render() {
    const siteRes = this.isoData.site_res;
    const siteView = siteRes?.site_view;

    return (
      <>
        <Provider i18next={I18NextService.i18n}>
          <div id="app" className="lemmy-site">
            <a
              className="skip-link bg-light text-dark p-2 text-decoration-none position-absolute start-0 z-3"
              onClick={linkEvent(this, this.handleJumpToContent)}
            >
              ${I18NextService.i18n.t("jump_to_content", "Jump to content")}
            </a>
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
                        <main tabIndex={-1} ref={this.mainContentRef}>
                          {RouteComponent &&
                            (isAuthPath(path ?? "") ? (
                              <AuthGuard>
                                <RouteComponent {...routeProps} />
                              </AuthGuard>
                            ) : (
                              <RouteComponent {...routeProps} />
                            ))}
                        </main>
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
