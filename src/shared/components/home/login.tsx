import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  Login as LoginI,
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
  form: {
    username_or_email?: string;
    password?: string;
    totp_token?: string;
  };
  loginLoading: boolean;
  showTotp: boolean;
  siteRes: GetSiteResponse;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;

  state: State = {
    form: {},
    loginLoading: false,
    showTotp: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (isBrowser()) {
      WebSocketService.Instance.send(wsClient.getCaptcha());
    }
  }

  componentDidMount() {
    // Navigate to home if already logged in
    if (UserService.Instance.myUserInfo) {
      this.context.router.history.push("/");
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("login")} - ${this.state.siteRes.site_view.site.name}`;
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname == "lemmy.ml";
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
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
                value={this.state.form.username_or_email}
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
                value={this.state.form.password}
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
                disabled={
                  !!this.state.form.username_or_email &&
                  !validEmail(this.state.form.username_or_email)
                }
                title={i18n.t("no_password_reset")}
              >
                {i18n.t("forgot_password")}
              </button>
            </div>
          </div>
          {this.state.showTotp && (
            <div className="form-group row">
              <label
                className="col-sm-6 col-form-label"
                htmlFor="login-totp-token"
              >
                {i18n.t("two_factor_token")}
              </label>
              <div className="col-sm-6">
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-control"
                  id="login-totp-token"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={this.state.form.totp_token}
                  onInput={linkEvent(this, this.handleLoginTotpChange)}
                />
              </div>
            </div>
          )}
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
    let lForm = i.state.form;
    let username_or_email = lForm.username_or_email;
    let password = lForm.password;
    let totp_token = lForm.totp_token;
    if (username_or_email && password) {
      let form: LoginI = {
        username_or_email,
        password,
        totp_token,
      };
      WebSocketService.Instance.send(wsClient.login(form));
    }
  }

  handleLoginUsernameChange(i: Login, event: any) {
    i.state.form.username_or_email = event.target.value;
    i.setState(i.state);
  }

  handleLoginTotpChange(i: Login, event: any) {
    i.state.form.totp_token = event.target.value;
    i.setState(i.state);
  }

  handleLoginPasswordChange(i: Login, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }

  handlePasswordReset(i: Login, event: any) {
    event.preventDefault();
    let email = i.state.form.username_or_email;
    if (email) {
      let resetForm: PasswordReset = { email };
      WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      // If the error comes back that the token is missing, show the TOTP field
      if (msg.error == "missing_totp_token") {
        this.setState({ showTotp: true, loginLoading: false });
        toast(i18n.t("enter_two_factor_code"));
        return;
      } else {
        toast(i18n.t(msg.error), "danger");
        this.setState({ form: {}, loginLoading: false });
        return;
      }
    } else {
      if (op == UserOperation.Login) {
        let data = wsJsonToRes<LoginResponse>(msg);
        UserService.Instance.login(data);
        this.props.history.push("/");
        location.reload();
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg);
        this.setState({ siteRes: data });
      }
    }
  }
}
