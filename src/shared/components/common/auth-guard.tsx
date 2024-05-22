import { Component } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { UserService } from "../../services";
import { Spinner } from "./icon";
import { getQueryString } from "@utils/helpers";

class AuthGuard extends Component<
  RouteComponentProps<Record<string, string>>,
  any
> {
  constructor(
    props: RouteComponentProps<Record<string, string>>,
    context: any,
  ) {
    super(props, context);
  }

  hasAuth() {
    return UserService.Instance.myUserInfo;
  }

  componentDidMount() {
    if (!this.hasAuth()) {
      const { pathname, search } = this.props.location;
      this.context.router.history.replace(
        `/login${getQueryString({ prev: pathname + search })}`,
      );
    }
  }

  render() {
    return this.hasAuth() ? this.props.children : <Spinner />;
  }
}

export default AuthGuard;
