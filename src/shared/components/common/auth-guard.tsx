import { Component } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { Spinner } from "./icon";
import { getQueryString } from "@utils/helpers";
import { isBrowser } from "@utils/browser";
import { MyUserInfo } from "lemmy-js-client";
import { RouterContext } from "inferno-router/dist/Router";

interface AuthGuardProps extends RouteComponentProps<Record<string, string>> {
  myUserInfo: MyUserInfo | undefined;
}

export default class AuthGuard extends Component<AuthGuardProps, any> {
  hasAuth() {
    return this.props.myUserInfo;
  }

  componentWillMount() {
    if (!this.hasAuth() && isBrowser()) {
      const { pathname, search } = this.props.location;
      const context: RouterContext = this.context;
      context.router.history.replace(
        `/login${getQueryString({ prev: pathname + search })}`,
      );
    }
  }

  render() {
    return this.hasAuth() ? this.props.children : <Spinner />;
  }
}
