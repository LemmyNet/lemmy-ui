import { Component } from "@/inferno";
import { UserService } from "../../services";
import { Spinner } from "./icon";

interface AnonymousGuardState {
  hasRedirected: boolean;
}

class AnonymousGuard extends Component<any, AnonymousGuardState> {
  state = {
    hasRedirected: false,
  } as AnonymousGuardState;
  declare context: any;

  constructor(props: any, context: any) {
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
