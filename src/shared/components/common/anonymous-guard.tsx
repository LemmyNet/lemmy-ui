import { Component } from "inferno";
import { Spinner } from "./icon";
import { isBrowser } from "@utils/browser";
import { MyUserInfo } from "lemmy-js-client";
import { RouterContext } from "inferno-router/dist/Router";

interface AnonymousGuardProps {
  myUserInfo: MyUserInfo | undefined;
}

class AnonymousGuard extends Component<AnonymousGuardProps, any> {
  hasAuth() {
    return this.props.myUserInfo;
  }

  componentWillMount() {
    if (this.hasAuth() && isBrowser()) {
      const context: RouterContext = this.context;
      context.router.history.replace(`/`);
    }
  }

  render() {
    return !this.hasAuth() ? this.props.children : <Spinner />;
  }
}

export default AnonymousGuard;
