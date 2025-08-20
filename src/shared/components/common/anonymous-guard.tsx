import { Component } from "inferno";
import { Spinner } from "./icon";
import { isBrowser } from "@utils/browser";
import { MyUserInfo } from "lemmy-js-client";

interface AnonymousGuardProps {
  myUserInfo: MyUserInfo | undefined;
}

class AnonymousGuard extends Component<AnonymousGuardProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  hasAuth() {
    return this.props.myUserInfo;
  }

  componentWillMount() {
    if (this.hasAuth() && isBrowser()) {
      this.context.router.history.replace(`/`);
    }
  }

  render() {
    return !this.hasAuth() ? this.props.children : <Spinner />;
  }
}

export default AnonymousGuard;
