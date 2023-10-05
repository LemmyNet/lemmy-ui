import { Component } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { UserService } from "../../services";
import { Spinner } from "./icon";

interface AnonymousGuardState {
  hasRedirected: boolean;
}

class AnonymousGuard extends Component<any, AnonymousGuardState> {
  state = {
    hasRedirected: false,
  } as AnonymousGuardState;

  constructor(
    props: RouteComponentProps<Record<string, string>>,
    context: any,
  ) {
    super(props, context);
  }

  componentDidMount() {
    if (UserService.Instance.myUserInfo) {
      this.context.router.history.replace(`/`);
    } else {
      this.setState({ hasRedirected: true });
    }
  }

  render() {
    return this.state.hasRedirected ? this.props.children : <Spinner />;
  }
}

export default AnonymousGuard;
