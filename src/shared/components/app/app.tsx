import { isAnonymousPath, isAuthPath, setIsoData } from "@utils/app";
import { Component, createRef, linkEvent } from "inferno";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { IsoDataOptionalSite } from "@utils/types";
import { routes } from "@utils/routes";
import { FirstLoadService, I18NextService } from "@services/index";
import AuthGuard from "../common/auth-guard";
import ErrorGuard from "../common/error-guard";
import { ErrorPage } from "./error-page";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import "./styles.scss";
import { Theme } from "./theme";
import AnonymousGuard from "../common/anonymous-guard";
import AdultConsentModal from "../common/modal/adult-consent-modal";
import { destroyTippy, setupTippy } from "@utils/tippy";
import { Locale, setDefaultOptions } from "date-fns";
import { i18n } from "i18next";

function handleJumpToContent(app: App, event: any) {
  event.preventDefault();
  app.contentRef.current?.focus();
}

interface AppProps {
  dateFnsLocale: Locale;
  i18n: i18n;
}

export default class App extends Component<AppProps, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  private readonly rootRef = createRef<HTMLDivElement>();
  readonly contentRef = createRef<HTMLDivElement>();

  constructor(props: AppProps, context: any) {
    super(props, context);

    I18NextService.i18n = this.props.i18n;
    I18NextService.forceUpdate = () => {
      this.forceUpdate();
    };
    setDefaultOptions({ locale: this.props.dateFnsLocale });
  }

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
          if (getQueryParams && this.isoData.siteRes) {
            // ErrorGuard will not render its children when
            // siteRes is missing, this guarantees that props
            // will always contain the query params.
            queryProps = {
              ...routeProps,
              ...getQueryParams(
                routeProps.location.search,
                this.isoData.siteRes,
                this.isoData.myUserInfo,
              ),
            };
          }

          // When key is location.key the component will be recreated when
          // navigating to itself. This is usesful to e.g. reset forms.
          const key = mountedSameRouteNavKey ?? routeProps.location.key;

          return (
            <ErrorGuard>
              <div tabIndex={-1} ref={this.contentRef}>
                {RouteComponent &&
                  (isAuthPath(path ?? "") ? (
                    <AuthGuard
                      {...routeProps}
                      myUserInfo={this.isoData.myUserInfo}
                    >
                      <RouteComponent key={key} {...queryProps} />
                    </AuthGuard>
                  ) : isAnonymousPath(path ?? "") ? (
                    <AnonymousGuard myUserInfo={this.isoData.myUserInfo}>
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
    const siteRes = this.isoData.siteRes;
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
              <Theme
                defaultTheme={siteView.local_site.default_theme}
                myUserInfo={this.isoData.myUserInfo}
              />
            )}
            <Navbar siteRes={siteRes} myUserInfo={this.isoData.myUserInfo} />
            <main className="mt-4 p-0 fl-1">
              <Switch>
                {this.routes}
                <Route component={ErrorPage} />
              </Switch>
            </main>
            <Footer site={siteRes} />
          </div>
        </>
      </Provider>
    );
  }
}
