import { isAnonymousPath, isAuthPath } from "@utils/app";
import { dataBsTheme } from "@utils/browser";
import { Component, RefObject, createRef, linkEvent } from "inferno";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { IsoDataOptionalSite } from "../../interfaces";
import { routes } from "../../routes";
import { FirstLoadService, I18NextService } from "../../services";
import AuthGuard from "../common/auth-guard";
import ErrorGuard from "../common/error-guard";
import { ErrorPage } from "./error-page";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import "./styles.scss";
import { Theme } from "./theme";
import AnonymousGuard from "../common/anonymous-guard";
import { CodeTheme } from "./code-theme";

export class App extends Component<any, any> {
  get isoData(): IsoDataOptionalSite {
    return this.context.store.getState().value;
  }
  private readonly mainContentRef: RefObject<HTMLElement>;
  constructor(props: any, context: any) {
    super(props, context);
    this.mainContentRef = createRef();
  }

  handleJumpToContent(event: any) {
    event.preventDefault();
    this.mainContentRef.current?.focus();
  }

  render() {
    const siteRes = this.isoData.site_res;
    const siteView = siteRes?.site_view;

    return (
      <>
        <Provider i18next={I18NextService.i18n}>
          <div
            id="app"
            className="lemmy-site"
            data-bs-theme={dataBsTheme(siteRes)}
          >
            <button
              type="button"
              className="btn skip-link bg-light position-absolute start-0 z-3"
              onClick={linkEvent(this, this.handleJumpToContent)}
            >
              {I18NextService.i18n.t("jump_to_content", "Jump to content")}
            </button>
            {siteView && (
              <>
                <Theme defaultTheme={siteView.local_site.default_theme} />
                <CodeTheme />
              </>
            )}
            <Navbar siteRes={siteRes} />
            <div className="mt-4 p-0 fl-1">
              <Switch>
                {routes.map(
                  ({ path, component: RouteComponent, fetchInitialData }) => (
                    <Route
                      key={path}
                      path={path}
                      exact
                      component={routeProps => {
                        if (!fetchInitialData) {
                          FirstLoadService.falsify();
                        }

                        return (
                          <ErrorGuard>
                            <div tabIndex={-1}>
                              {RouteComponent &&
                                (isAuthPath(path ?? "") ? (
                                  <AuthGuard
                                    isLoggedIn={!!siteRes?.my_user}
                                    componentProps={routeProps}
                                  >
                                    <RouteComponent {...routeProps} />
                                  </AuthGuard>
                                ) : isAnonymousPath(path ?? "") ? (
                                  <AnonymousGuard
                                    isLoggedIn={!!siteRes?.my_user}
                                  >
                                    <RouteComponent {...routeProps} />
                                  </AnonymousGuard>
                                ) : (
                                  <RouteComponent {...routeProps} />
                                ))}
                            </div>
                          </ErrorGuard>
                        );
                      }}
                    />
                  ),
                )}
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
