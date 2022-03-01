import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { routes } from "../../routes";
import { favIconPngUrl, favIconUrl } from "../../utils";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { NoMatch } from "./no-match";
import "./styles.scss";
import { Theme } from "./theme";

export interface AppProps {
  siteRes: GetSiteResponse;
}

export class App extends Component<AppProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    let siteRes = this.props.siteRes;
    return (
      <>
        <Provider i18next={i18n}>
          <div>
            <Theme
              myUserInfo={siteRes.my_user}
              defaultTheme={siteRes.site_view.site.default_theme}
            />
            {siteRes &&
              siteRes.site_view &&
              this.props.siteRes.site_view.site.icon && (
                <Helmet>
                  <link
                    id="favicon"
                    rel="shortcut icon"
                    type="image/x-icon"
                    href={this.props.siteRes.site_view.site.icon || favIconUrl}
                  />
                  <link
                    rel="apple-touch-icon"
                    href={
                      this.props.siteRes.site_view.site.icon || favIconPngUrl
                    }
                  />
                </Helmet>
              )}
            <Navbar site_res={this.props.siteRes} />
            <div class="mt-4 p-0 fl-1">
              <Switch>
                {routes.map(({ path, exact, component: C, ...rest }) => (
                  <Route
                    key={path}
                    path={path}
                    exact={exact}
                    render={props => <C {...props} {...rest} />}
                  />
                ))}
                <Route render={props => <NoMatch {...props} />} />
              </Switch>
            </div>
            <Footer site={this.props.siteRes} />
          </div>
        </Provider>
      </>
    );
  }
}
