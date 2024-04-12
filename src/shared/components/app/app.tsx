import { isAnonymousPath, isAuthPath, setIsoData } from "@utils/app";
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
import { destroyTippy, setupTippy } from "../../tippy";
import { adultConsentLocalStorageKey } from "shared/config";

export class App extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  private readonly mainContentRef: RefObject<HTMLElement>;
  private readonly rootRef = createRef<HTMLDivElement>();
  constructor(props: any, context: any) {
    super(props, context);
    this.mainContentRef = createRef();
  }

  componentDidMount(): void {
    const siteRes = this.isoData.site_res;

    if (
      siteRes?.site_view.site.content_warning &&
      !(siteRes?.my_user || localStorage.getItem(adultConsentLocalStorageKey))
    ) {
      if (confirm(siteRes.site_view.site.content_warning)) {
        localStorage.setItem(adultConsentLocalStorageKey, "true");
      } else {
        history.back();
      }
    }

    setupTippy(this.rootRef);
  }

  componentWillUnmount(): void {
    destroyTippy();
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
          <div id="app" className="lemmy-site" ref={this.rootRef}>
            <button
              type="button"
              className="btn skip-link bg-light position-absolute start-0 z-3"
              onClick={linkEvent(this, this.handleJumpToContent)}
            >
              {I18NextService.i18n.t("jump_to_content", "Jump to content")}
            </button>
            {siteView && (
              <Theme defaultTheme={siteView.local_site.default_theme} />
            )}
            <Navbar siteRes={siteRes} />
            <div className="mt-4 p-0 fl-1">
              <Switch>
                {routes.map(
                  ({
                    path,
                    component: RouteComponent,
                    fetchInitialData,
                    getQueryParams,
                  }) => (
                    <Route
                      key={path}
                      path={path}
                      exact
                      component={routeProps => {
                        if (!fetchInitialData) {
                          FirstLoadService.falsify();
                        }

                        let queryProps = routeProps;
                        if (getQueryParams && this.isoData.site_res) {
                          // ErrorGuard will not render its children when
                          // site_res is missing, this guarantees that props
                          // will always contain the query params.
                          queryProps = {
                            ...routeProps,
                            ...getQueryParams(
                              routeProps.location.search,
                              this.isoData.site_res,
                            ),
                          };
                        }

                        return (
                          <ErrorGuard>
                            <div tabIndex={-1}>
                              {RouteComponent &&
                                (isAuthPath(path ?? "") ? (
                                  <AuthGuard {...routeProps}>
                                    <RouteComponent {...queryProps} />
                                  </AuthGuard>
                                ) : isAnonymousPath(path ?? "") ? (
                                  <AnonymousGuard>
                                    <RouteComponent {...queryProps} />
                                  </AnonymousGuard>
                                ) : (
                                  <RouteComponent {...queryProps} />
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
