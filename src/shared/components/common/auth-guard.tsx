import { Component } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { Spinner } from "./icon";

interface AuthGuardProps {
  componentProps: RouteComponentProps<Record<string, string>>;
  isLoggedIn: boolean;
}

interface AuthGuardState {
  hasRedirected: boolean;
}

class AuthGuard extends Component<AuthGuardProps, AuthGuardState> {
  state = {
    hasRedirected: false,
  } as AuthGuardState;

  constructor(props: AuthGuardProps, context: any) {
    super(props, context);
  }

  componentDidMount() {
    if (!this.props.isLoggedIn) {
      const { pathname, search } = this.props.componentProps.location;
      this.context.router.history.replace(
        `/login?prev=${encodeURIComponent(pathname + search)}`,
      );
    } else {
      this.setState({ hasRedirected: true });
    }
  }

  render() {
    return this.state.hasRedirected ? this.props.children : <Spinner />;
  }
}

export default AuthGuard;
