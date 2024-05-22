import { Component } from "inferno";
import { UserService } from "../../services";
import { Spinner } from "./icon";

class AnonymousGuard extends Component<any, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  hasAuth() {
    return UserService.Instance.myUserInfo;
  }

  componentDidMount() {
    if (this.hasAuth()) {
      this.context.router.history.replace(`/`);
    }
  }

  render() {
    return !this.hasAuth() ? this.props.children : <Spinner />;
  }
}

export default AnonymousGuard;
