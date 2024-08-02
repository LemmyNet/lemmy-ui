import { isAnonymousPath, isAuthPath, setIsoData } from "@utils/app";
import { Component, createRef, linkEvent } from "inferno";
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
import AdultConsentModal from "../common/modal/adult-consent-modal";
import { destroyTippy, setupTippy } from "../../tippy";

function handleJumpToContent(event) {
  event.preventDefault();
}

export default class App extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  private readonly rootRef = createRef<HTMLDivElement>();

  componentDidMount() {
    setupTippy(this.rootRef);
  }

  componentWillUnmount() {
    destroyTippy();
  }

  routes = routes.map(
    ({
      path,
      component: RouteComponent,
      fetchInitialData,
      getQueryParams,
      mountedSameRouteNavKey,
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

          // When key is location.key the component will be recreated when
          // navigating to itself. This is usesful to e.g. reset forms.
          const key = mountedSameRouteNavKey ?? routeProps.location.key;

          return (
            <ErrorGuard>
              <div tabIndex={-1}>
                {RouteComponent &&
                  (isAuthPath(path ?? "") ? (
                    <AuthGuard {...routeProps}>
                      <RouteComponent key={key} {...queryProps} />
                    </AuthGuard>
                  ) : isAnonymousPath(path ?? "") ? (
                    <AnonymousGuard>
                      <RouteComponent key={key} {...queryProps} />
                    </AnonymousGuard>
                  ) : (
                    <RouteComponent key={key} {...queryProps} />
                  ))}
              </div>
            </ErrorGuard>
          );
        }}
      />
    ),
  );

  render() {
    const siteRes = this.isoData.site_res;
    const siteView = siteRes?.site_view;

    return (
      <Provider i18next={I18NextService.i18n}>
        {/* This fragment is required to avoid an SSR error*/}
        <>
          {this.isoData.showAdultConsentModal && (
            <AdultConsentModal
              contentWarning={siteView!.site.content_warning!}
            />
          )}
          <div
            id="app"
            className="lemmy-site"
            ref={this.rootRef}
            data-adult-consent={this.isoData.showAdultConsentModal || null}
          >
            <button
              type="button"
              className="btn skip-link bg-light position-absolute start-0 z-3"
              onClick={linkEvent(this, handleJumpToContent)}
            >
              {I18NextService.i18n.t("jump_to_content", "Jump to content")}
            </button>
            {siteView && (
              <Theme defaultTheme={siteView.local_site.default_theme} />
            )}
            <Navbar siteRes={siteRes} />
            <div className="mt-4 p-0 fl-1">
              <Switch>
                {this.routes}
                <Route component={ErrorPage} />
              </Switch>
            </div>
            <Footer site={siteRes} />
          </div>
        </>
      </Provider>
    );
  }
}
