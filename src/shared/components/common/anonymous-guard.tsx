import { Component } from "inferno";
import { Spinner } from "./icon";

interface AnonymousGuardProps {
  isLoggedIn: boolean;
}
interface AnonymousGuardState {
  hasRedirected: boolean;
}

class AnonymousGuard extends Component<
  AnonymousGuardProps,
  AnonymousGuardState
> {
  state = {
    hasRedirected: false,
  } as AnonymousGuardState;

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    if (this.props.isLoggedIn) {
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
