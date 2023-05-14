import { InfernoNode } from "inferno";
import { Redirect } from "inferno-router";
import { UserService } from "../../services";

function AuthGuard(props: { children?: InfernoNode }) {
  if (!UserService.Instance.myUserInfo) {
    return <Redirect to="/login" />;
  } else {
    return <>{props.children}</>;
  }
}

export default AuthGuard;
