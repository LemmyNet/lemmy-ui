import { isAnonymousPath, isAuthPath, setIsoData } from "@utils/app";
import {
  Component,
  RefObject,
  createRef,
  forwardRef,
  linkEvent,
} from "inferno";
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
import AdultConsentModal from "../common/adult-consent-modal";

interface AppProps {
  ref: RefObject<HTMLDivElement>;
}

function handleJumpToContent(event) {
  event.preventDefault();
}

class App extends Component<AppProps, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);

  render() {
    const siteRes = this.isoData.site_res;
    const siteView = siteRes?.site_view;

    return (
      <div id="app" className="lemmy-site" ref={this.props.ref}>
        <button
          type="button"
          className="btn skip-link bg-light position-absolute start-0 z-3"
          onClick={linkEvent(this, handleJumpToContent)}
        >
          {I18NextService.i18n.t("jump_to_content", "Jump to content")}
        </button>
        {siteView && <Theme defaultTheme={siteView.local_site.default_theme} />}
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
    );
  }
}

const AppForwardRef = forwardRef((props, ref) => <App {...props} ref={ref} />);

export default class AppWrapper extends Component<any, any> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  private readonly rootRef = createRef<HTMLDivElement>();

  componentDidMount(): void {
    setupTippy(this.rootRef);
  }

  componentWillUnmount(): void {
    destroyTippy();
  }

  render() {
    const contentWarning =
      this.isoData.site_res?.site_view.site.content_warning;

    return (
      <Provider i18next={I18NextService.i18n}>
        {contentWarning && (
          <AdultConsentModal contentWarning={contentWarning} />
        )}
        <AppForwardRef ref={this.rootRef} />
      </Provider>
    );
  }
}
