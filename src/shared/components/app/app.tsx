import { Component } from "inferno";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { i18n } from "../../i18next";
import { routes } from "../../routes";
import { setIsoData } from "../../utils";
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
    let siteView = siteRes.site_view;

    return (
      <>
        <Provider i18next={i18n}>
          <div id="app">
            <Theme defaultTheme={siteView.local_site.default_theme} />
            <Navbar siteRes={siteRes} />
            <div className="mt-4 p-0 fl-1">
              <Switch>
                {routes.map(({ path, component }) => (
                  <Route key={path} path={path} exact component={component} />
                ))}
                <Route component={NoMatch} />
              </Switch>
            </div>
            <Footer site={siteRes} />
          </div>
        </Provider>
      </>
    );
  }
}
