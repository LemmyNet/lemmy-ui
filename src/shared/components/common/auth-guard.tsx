import { Component } from "@/inferno";
import { RouteComponentProps } from "react-router/Route";
import { UserService } from "../../services";
import { Spinner } from "./icon";

interface AuthGuardState {
  hasRedirected: boolean;
}

class AuthGuard extends Component<
  RouteComponentProps<Record<string, string>>,
  AuthGuardState
> {
  state = {
    hasRedirected: false,
  } as AuthGuardState;

  constructor(
    props: RouteComponentProps<Record<string, string>>,
    context: any,
  ) {
    super(props, context);
  }
  declare context: any;

  componentDidMount() {
    if (!UserService.Instance.myUserInfo) {
      const { pathname, search } = this.props.location;
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
