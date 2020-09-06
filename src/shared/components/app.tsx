import { Component } from 'inferno';
import { Route, Switch } from 'inferno-router';
/* import { Provider } from 'inferno-i18next'; */
/* import { i18n } from './i18next'; */
import { routes } from '../../shared/routes';
import { Navbar } from '../../shared/components/navbar';
import { Footer } from '../../shared/components/footer';
import { Symbols } from '../../shared/components/symbols';

export class App extends Component<any, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <>
        <h1>Hi there!</h1>
        {/* <Provider i18next={i18n}> */}
        <div>
          <Navbar />
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
              {/* <Route render={(props) => <NoMatch {...props} />} /> */}
            </Switch>
            <Symbols />
          </div>
          <Footer />
        </div>
        {/* </Provider> */}
      </>
    );
  }
}
