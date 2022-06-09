import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { i18n } from "../../i18next";
import { routes } from "../../routes";
import { favIconPngUrl, favIconUrl, setIsoData, toOption } from "../../utils";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { NoMatch } from "./no-match";
import "./styles.scss";
import { Theme } from "./theme";

export class App extends Component<any, any> {
  private isoData = setIsoData(this.context);
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    let siteRes = this.isoData.site_res;
    let siteView = toOption(siteRes.site_view);
    return (
      <>
        <Provider i18next={i18n}>
          <div>
            <Theme defaultTheme={siteView.map(s => s.site.default_theme)} />
            {siteView
              .andThen(s => toOption(s.site.icon))
              .match({
                some: icon => (
                  <Helmet>
                    <link
                      id="favicon"
                      rel="shortcut icon"
                      type="image/x-icon"
                      href={icon || favIconUrl}
                    />
                    <link rel="apple-touch-icon" href={icon || favIconPngUrl} />
                  </Helmet>
                ),
                none: <></>,
              })}
            <Navbar siteRes={siteRes} />
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
            <Footer site={siteRes} />
          </div>
        </Provider>
      </>
    );
  }
}
