import { myAuth, setIsoData } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { Component, linkEvent } from "inferno";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import PasswordInput from "../common/password-input";

interface State {
  loginRes: RequestState<LoginResponse>;
  form: {
    username_or_email?: string;
    password?: string;
    totp_2fa_token?: string;
  };
  showTotp: boolean;
  siteRes: GetSiteResponse;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);

  state: State = {
    loginRes: { state: "empty" },
    form: {},
    showTotp: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    // Navigate to home if already logged in
    if (UserService.Instance.myUserInfo) {
      this.context.router.history.push("/");
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("login")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname == "lemmy.ml";
  }

  render() {
    return (
      <div className="login container-lg">
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
          <h1 className="h4 mb-4">{I18NextService.i18n.t("login")}</h1>
          <div className="mb-3 row">
            <label
              className="col-sm-2 col-form-label"
              htmlFor="login-email-or-username"
            >
              {I18NextService.i18n.t("email_or_username")}
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
          <div className="mb-3">
            <PasswordInput
              id="login-password"
              value={this.state.form.password}
              onInput={linkEvent(this, this.handleLoginPasswordChange)}
              label={I18NextService.i18n.t("password")}
              showForgotLink
            />
          </div>
          {this.state.showTotp && (
            <div className="mb-3 row">
              <label
                className="col-sm-6 col-form-label"
                htmlFor="login-totp-token"
              >
                {I18NextService.i18n.t("two_factor_token")}
              </label>
              <div className="col-sm-6">
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-control"
                  id="login-totp-token"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={this.state.form.totp_2fa_token}
                  onInput={linkEvent(this, this.handleLoginTotpChange)}
                />
              </div>
            </div>
          )}
          <div className="mb-3 row">
            <div className="col-sm-10">
              <button type="submit" className="btn btn-secondary">
                {this.state.loginRes.state == "loading" ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t("login")
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  async handleLoginSubmit(i: Login, event: any) {
    event.preventDefault();
    const { password, totp_2fa_token, username_or_email } = i.state.form;

    if (username_or_email && password) {
      i.setState({ loginRes: { state: "loading" } });

      const loginRes = await HttpService.client.login({
        username_or_email,
        password,
        totp_2fa_token,
      });
      switch (loginRes.state) {
        case "failed": {
          if (loginRes.msg === "missing_totp_token") {
            i.setState({ showTotp: true });
            toast(I18NextService.i18n.t("enter_two_factor_code"), "info");
          }
          if (loginRes.msg === "incorrect_login") {
            toast(I18NextService.i18n.t("incorrect_login"), "danger");
          }

          i.setState({ loginRes: { state: "failed", msg: loginRes.msg } });
          break;
        }

        case "success": {
          UserService.Instance.login({
            res: loginRes.data,
          });
          const site = await HttpService.client.getSite({
            auth: myAuth(),
          });

          if (site.state === "success") {
            UserService.Instance.myUserInfo = site.data.my_user;
          }

          i.props.history.action === "PUSH"
            ? i.props.history.back()
            : i.props.history.replace("/");

          break;
        }
      }
    }
  }

  handleLoginUsernameChange(i: Login, event: any) {
    i.state.form.username_or_email = event.target.value.trim();
    i.setState(i.state);
  }

  handleLoginTotpChange(i: Login, event: any) {
    i.state.form.totp_2fa_token = event.target.value;
    i.setState(i.state);
  }

  handleLoginPasswordChange(i: Login, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }
}
