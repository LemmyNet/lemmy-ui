import { Component, linkEvent } from "inferno";
import { Helmet } from "inferno-helmet";
import { wsJsonToRes, wsUserOp } from "lemmy-js-client";
import { GetSiteResponse } from "lemmy-js-client/dist/types/GetSiteResponse";
import { LoginResponse } from "lemmy-js-client/dist/types/LoginResponse";
import { UserOperation } from "lemmy-js-client/dist/types/others";
import { Register } from "lemmy-js-client/dist/types/Register";
import { Subscription } from "rxjs";
import { delay, retryWhen, take } from "rxjs/operators";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import { setIsoData, toast, wsClient } from "../../utils";
import { Spinner } from "../common/icon";
import { SiteForm } from "./site-form";

interface State {
  form: {
    username?: string;
    email?: string;
    password?: string;
    password_verify?: string;
    show_nsfw: boolean;
    captcha_uuid?: string;
    captcha_answer?: string;
    honeypot?: string;
    answer?: string;
  };
  doneRegisteringUser: boolean;
  userLoading: boolean;
  siteRes: GetSiteResponse;
}

export class Setup extends Component<any, State> {
  private subscription: Subscription;
  private isoData = setIsoData(this.context);

  state: State = {
    form: {
      show_nsfw: true,
    },
    doneRegisteringUser: !!UserService.Instance.myUserInfo,
    userLoading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

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
      <div className="container-lg">
        <Helmet title={this.documentTitle} />
        <div className="row">
          <div className="col-12 offset-lg-3 col-lg-6">
            <h3>{i18n.t("lemmy_instance_setup")}</h3>
            {!this.state.doneRegisteringUser ? (
              this.registerUser()
            ) : (
              <SiteForm siteRes={this.state.siteRes} showLocal />
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
              value={this.state.form.username}
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
              value={this.state.form.email}
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
              value={this.state.form.password}
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
              value={this.state.form.password_verify}
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
    let cForm = i.state.form;
    if (cForm.username && cForm.password && cForm.password_verify) {
      let form: Register = {
        username: cForm.username,
        password: cForm.password,
        password_verify: cForm.password_verify,
        email: cForm.email,
        show_nsfw: cForm.show_nsfw,
        captcha_uuid: cForm.captcha_uuid,
        captcha_answer: cForm.captcha_answer,
        honeypot: cForm.honeypot,
        answer: cForm.answer,
      };
      WebSocketService.Instance.send(wsClient.register(form));
    }
  }

  handleRegisterUsernameChange(i: Setup, event: any) {
    i.state.form.username = event.target.value;
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Setup, event: any) {
    i.state.form.email = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Setup, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Setup, event: any) {
    i.state.form.password_verify = event.target.value;
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ userLoading: false });
      return;
    } else if (op == UserOperation.Register) {
      let data = wsJsonToRes<LoginResponse>(msg);
      this.setState({ userLoading: false });
      UserService.Instance.login(data);
      if (UserService.Instance.jwtInfo) {
        this.setState({ doneRegisteringUser: true });
      }
    } else if (op == UserOperation.CreateSite) {
      window.location.href = "/";
    }
  }
}
