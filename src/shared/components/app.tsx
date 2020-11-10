import { Component } from 'inferno';
import { Route, Switch } from 'inferno-router';
import { Provider } from 'inferno-i18next';
import { Helmet } from 'inferno-helmet';
import { i18n } from '../i18next';
import { routes } from '../routes';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { NoMatch } from './no-match';
import { Theme } from './theme';
import { Symbols } from './symbols';
import { GetSiteResponse } from 'lemmy-js-client';
import './styles.scss';

export interface AppProps {
  site: GetSiteResponse;
}

export class App extends Component<AppProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    return (
      <>
        <Provider i18next={i18n}>
          <div>
            <Theme user={this.props.site.my_user} />
            {this.props.site &&
              this.props.site.site &&
              this.props.site.site.icon && (
                <Helmet>
                  <link
                    id="favicon"
                    rel="icon"
                    type="image/x-icon"
                    href={this.props.site.site.icon}
                  />
                </Helmet>
              )}
            <Navbar site={this.props.site} />
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
              <Symbols />
            </div>
            <Footer site={this.props.site} />
          </div>
        </Provider>
      </>
    );
  }
}
