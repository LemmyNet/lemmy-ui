import { None } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  Login as LoginForm,
  LoginResponse,
  PasswordReset,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  isBrowser,
  setIsoData,
  toast,
  validEmail,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  loginForm: LoginForm;
  loginLoading: boolean;
  siteRes: GetSiteResponse;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
    loginForm: new LoginForm({
      username_or_email: undefined,
      password: undefined,
    }),
    loginLoading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (isBrowser()) {
      WebSocketService.Instance.send(wsClient.getCaptcha());
    }
  }

  componentDidMount() {
    // Navigate to home if already logged in
    if (UserService.Instance.myUserInfo.isSome()) {
      this.context.router.history.push("/");
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView => `${i18n.t("login")} - ${siteView.site.name}`,
      none: "",
    });
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname == "lemmy.ml";
  }

  render() {
    return (
      <div className="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">{this.loginForm()}</div>
        </div>
      </div>
    );
  }

  loginForm() {
    return (
      <div>
        <form onSubmit={linkEvent(this, this.handleLoginSubmit)}>
          <h5>{i18n.t("login")}</h5>
          <div className="form-group row">
            <label
              className="col-sm-2 col-form-label"
              htmlFor="login-email-or-username"
            >
              {i18n.t("email_or_username")}
            </label>
            <div className="col-sm-10">
              <input
                type="text"
                className="form-control"
                id="login-email-or-username"
                value={this.state.loginForm.username_or_email}
                onInput={linkEvent(this, this.handleLoginUsernameChange)}
                autoComplete="email"
                required
                minLength={3}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-2 col-form-label" htmlFor="login-password">
              {i18n.t("password")}
            </label>
            <div className="col-sm-10">
              <input
                type="password"
                id="login-password"
                value={this.state.loginForm.password}
                onInput={linkEvent(this, this.handleLoginPasswordChange)}
                className="form-control"
                autoComplete="current-password"
                required
                maxLength={60}
              />
              <button
                type="button"
                onClick={linkEvent(this, this.handlePasswordReset)}
                className="btn p-0 btn-link d-inline-block float-right text-muted small font-weight-bold pointer-events not-allowed"
                disabled={!validEmail(this.state.loginForm.username_or_email)}
                title={i18n.t("no_password_reset")}
              >
                {i18n.t("forgot_password")}
              </button>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-sm-10">
              <button type="submit" className="btn btn-secondary">
                {this.state.loginLoading ? <Spinner /> : i18n.t("login")}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  handleLoginSubmit(i: Login, event: any) {
    event.preventDefault();
    i.setState({ loginLoading: true });
    WebSocketService.Instance.send(wsClient.login(i.state.loginForm));
  }

  handleLoginUsernameChange(i: Login, event: any) {
    i.state.loginForm.username_or_email = event.target.value;
    i.setState(i.state);
  }

  handleLoginPasswordChange(i: Login, event: any) {
    i.state.loginForm.password = event.target.value;
    i.setState(i.state);
  }

  handlePasswordReset(i: Login, event: any) {
    event.preventDefault();
    let resetForm = new PasswordReset({
      email: i.state.loginForm.username_or_email,
    });
    WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState(this.emptyState);
      return;
    } else {
      if (op == UserOperation.Login) {
        let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
        this.setState(this.emptyState);
        UserService.Instance.login(data);
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg, GetSiteResponse);
        this.setState({ siteRes: data });
      }
    }
  }
}
