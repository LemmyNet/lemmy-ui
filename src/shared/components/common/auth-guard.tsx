import { Component, InfernoNode } from "inferno";
import { UserService } from "../../services";
import { Spinner } from "./icon";

interface AuthGuardState {
  hasRedirected: boolean;
}

class AuthGuard extends Component<{ children?: InfernoNode }, AuthGuardState> {
  state = {
    hasRedirected: false,
  } as AuthGuardState;

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    if (!UserService.Instance.myUserInfo) {
      this.context.router.history.replace(
        "/login",
        this.context.router.history.location
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
