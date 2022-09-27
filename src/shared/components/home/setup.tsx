import { None, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { Helmet } from "inferno-helmet";
import {
  LoginResponse,
  Register,
  toUndefined,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { delay, retryWhen, take } from "rxjs/operators";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import { toast, wsClient } from "../../utils";
import { Spinner } from "../common/icon";
import { SiteForm } from "./site-form";

interface State {
  userForm: Register;
  doneRegisteringUser: boolean;
  userLoading: boolean;
}

export class Setup extends Component<any, State> {
  private subscription: Subscription;

  private emptyState: State = {
    userForm: new Register({
      username: undefined,
      password: undefined,
      password_verify: undefined,
      show_nsfw: true,
      // The first admin signup doesn't need a captcha
      captcha_uuid: None,
      captcha_answer: None,
      email: None,
      honeypot: None,
      answer: None,
    }),
    doneRegisteringUser: UserService.Instance.myUserInfo.isSome(),
    userLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.subscription = WebSocketService.Instance.subject
      .pipe(retryWhen(errors => errors.pipe(delay(3000), take(10))))
      .subscribe(
        msg => this.parseMessage(msg),
        err => console.error(err),
        () => console.log("complete")
      );
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  get documentTitle(): string {
    return `${i18n.t("setup")} - Lemmy`;
  }

  render() {
    return (
      <div className="container">
        <Helmet title={this.documentTitle} />
        <div className="row">
          <div className="col-12 offset-lg-3 col-lg-6">
            <h3>{i18n.t("lemmy_instance_setup")}</h3>
            {!this.state.doneRegisteringUser ? (
              this.registerUser()
            ) : (
              <SiteForm site={None} showLocal />
            )}
          </div>
        </div>
      </div>
    );
  }

  registerUser() {
    return (
      <form onSubmit={linkEvent(this, this.handleRegisterSubmit)}>
        <h5>{i18n.t("setup_admin")}</h5>
        <div className="form-group row">
          <label className="col-sm-2 col-form-label" htmlFor="username">
            {i18n.t("username")}
          </label>
          <div className="col-sm-10">
            <input
              type="text"
              className="form-control"
              id="username"
              value={this.state.userForm.username}
              onInput={linkEvent(this, this.handleRegisterUsernameChange)}
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
            />
          </div>
        </div>
        <div className="form-group row">
          <label className="col-sm-2 col-form-label" htmlFor="email">
            {i18n.t("email")}
          </label>

          <div className="col-sm-10">
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder={i18n.t("optional")}
              value={toUndefined(this.state.userForm.email)}
              onInput={linkEvent(this, this.handleRegisterEmailChange)}
              minLength={3}
            />
          </div>
        </div>
        <div className="form-group row">
          <label className="col-sm-2 col-form-label" htmlFor="password">
            {i18n.t("password")}
          </label>
          <div className="col-sm-10">
            <input
              type="password"
              id="password"
              value={this.state.userForm.password}
              onInput={linkEvent(this, this.handleRegisterPasswordChange)}
              className="form-control"
              required
              autoComplete="new-password"
              minLength={10}
              maxLength={60}
            />
          </div>
        </div>
        <div className="form-group row">
          <label className="col-sm-2 col-form-label" htmlFor="verify-password">
            {i18n.t("verify_password")}
          </label>
          <div className="col-sm-10">
            <input
              type="password"
              id="verify-password"
              value={this.state.userForm.password_verify}
              onInput={linkEvent(this, this.handleRegisterPasswordVerifyChange)}
              className="form-control"
              required
              autoComplete="new-password"
              minLength={10}
              maxLength={60}
            />
          </div>
        </div>
        <div className="form-group row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.userLoading ? <Spinner /> : i18n.t("sign_up")}
            </button>
          </div>
        </div>
      </form>
    );
  }

  handleRegisterSubmit(i: Setup, event: any) {
    event.preventDefault();
    i.setState({ userLoading: true });
    event.preventDefault();
    WebSocketService.Instance.send(wsClient.register(i.state.userForm));
  }

  handleRegisterUsernameChange(i: Setup, event: any) {
    i.state.userForm.username = event.target.value;
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Setup, event: any) {
    i.state.userForm.email = Some(event.target.value);
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Setup, event: any) {
    i.state.userForm.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Setup, event: any) {
    i.state.userForm.password_verify = event.target.value;
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ userLoading: false });
      return;
    } else if (op == UserOperation.Register) {
      let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
      this.setState({ userLoading: false });
      UserService.Instance.login(data);
    } else if (op == UserOperation.CreateSite) {
      window.location.href = "/";
    }
  }
}
