import { setIsoData } from "@utils/app";
import { isBrowser, updateDataBsTheme } from "@utils/browser";
import { getExternalHost } from "@utils/env";
import { getQueryParams } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import PasswordInput from "../common/password-input";
import TotpModal from "../common/totp-modal";
import { UnreadCounterService } from "../../services";

interface LoginProps {
  prev?: string;
  err?: string;
}

const getLoginQueryParams = () =>
  getQueryParams<LoginProps>({
    prev(param) {
      return param ? decodeURIComponent(param) : undefined;
    },
    err(param) {
      return param ? decodeURIComponent(param) : undefined;
    },
  });

interface State {
  loginRes: RequestState<LoginResponse>;
  form: {
    username_or_email: string;
    password: string;
  };
  siteRes: GetSiteResponse;
  show2faModal: boolean;
}

async function handleLoginSuccess(i: Login, loginRes: LoginResponse) {
  UserService.Instance.login({
    res: loginRes,
  });
  const site = await HttpService.client.getSite();

  if (site.state === "success") {
    UserService.Instance.myUserInfo = site.data.my_user;
    updateDataBsTheme(site.data);
  }

  const { prev } = getLoginQueryParams();

  prev
    ? i.props.history.replace(prev)
    : i.props.history.action === "PUSH"
      ? i.props.history.back()
      : i.props.history.replace("/");

  UnreadCounterService.Instance.updateAll();
}

async function handleLoginSubmit(i: Login, event: any) {
  event.preventDefault();
  const { password, username_or_email } = i.state.form;

  if (username_or_email && password) {
    i.setState({ loginRes: LOADING_REQUEST });

    const loginRes = await HttpService.client.login({
      username_or_email,
      password,
    });
    switch (loginRes.state) {
      case "failed": {
        if (loginRes.err.message === "missing_totp_token") {
          i.setState({ show2faModal: true });
        } else {
          toast(I18NextService.i18n.t(loginRes.err.message), "danger");
        }

        i.setState({ loginRes });
        break;
      }

      case "success": {
        handleLoginSuccess(i, loginRes.data);
        break;
      }
    }
  }
}

async function handleUseExternalAuth(d: {
  i: Login;
  index: number;
  external_auth: PublicExternalAuth;
}) {
  let authEndpoint;
  if (d.external_auth.auth_type === "oidc") {
    let discoveryEndpoint = d.external_auth.issuer;
    if (!discoveryEndpoint.endsWith(".well-known/openid-configuration")) {
      if (!discoveryEndpoint.endsWith("/")) {
        discoveryEndpoint += "/";
      }
      discoveryEndpoint += ".well-known/openid-configuration";
    }
    const res = await fetch(discoveryEndpoint);
    authEndpoint = (await res.json()).authorization_endpoint;
  } else {
    authEndpoint = d.external_auth.auth_endpoint;
  }

  let requestUri = authEndpoint + "?";
  requestUri += `client_id=${d.external_auth.client_id}`;
  requestUri += `&response_type=code`;
  requestUri += `&scope=${d.external_auth.scopes}`;

  let externalHost = getExternalHost();
  // Fix for development mode:
  if (!externalHost.startsWith("http")) {
    externalHost = "http://" + externalHost;
  }
  requestUri += `&redirect_uri=${encodeURIComponent(`${externalHost}/api/v3/oauth/callback`)}`;

  const clientRedirectUri =
    `${window.location.origin}/oauth/callback?redirect_uri=/`;
  const state = encodeURIComponent(JSON.stringify({
    external_auth: d.external_auth.id,
    client_redirect_uri: clientRedirectUri
  }));
  requestUri += `&state=${state}`;

  window.location = requestUri;
}

function handleLoginUsernameChange(i: Login, event: any) {
  i.setState(
    prevState => (prevState.form.username_or_email = event.target.value.trim()),
  );
}

function handleLoginPasswordChange(i: Login, event: any) {
  i.setState(prevState => (prevState.form.password = event.target.value));
}

function handleClose2faModal(i: Login) {
  i.setState({ show2faModal: false });
}

export class Login extends Component<
  RouteComponentProps<Record<string, never>>,
  State
> {
  private isoData = setIsoData(this.context);

  state: State = {
    loginRes: EMPTY_REQUEST,
    form: {
      username_or_email: "",
      password: "",
    },
    siteRes: this.isoData.site_res,
    show2faModal: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    const { err } = getLoginQueryParams();
    switch (err) {
      case "internal":
        toast(I18NextService.i18n.t("internal_error"), "danger");
        break;
      case "oauth_response":
        toast(I18NextService.i18n.t("invalid_oauth_response"), "danger");
        break;
      case "external_auth":
        toast(I18NextService.i18n.t("incorrect_oauth"), "danger");
        break;
      case "token":
        toast(I18NextService.i18n.t("identity_provider_error"), "danger");
        break;
      case "userinfo":
        toast(I18NextService.i18n.t("identity_provider_error"), "danger");
        break;
      case "user":
        toast(I18NextService.i18n.t("error_logging_in"), "danger");
        break;
      case "application":
        toast(I18NextService.i18n.t("fill_out_application"), "danger");
        break;
      case "email":
        toast(I18NextService.i18n.t("verify_email"), "danger");
        break;
      case "jwt":
        toast(I18NextService.i18n.t("internal_error"), "danger");
        break;
    }

    this.handleSubmitTotp = this.handleSubmitTotp.bind(this);
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("login")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname === "lemmy.ml";
  }

  render() {
    return (
      <div className="login container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <TotpModal
          type="login"
          onSubmit={this.handleSubmitTotp}
          show={this.state.show2faModal}
          onClose={linkEvent(this, handleClose2faModal)}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">{this.loginForm()}</div>
        </div>
        {this.state.siteRes.external_auths.length > 0 && <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">
            <span>Or</span>
            {this.state.siteRes.external_auths.map(({ external_auth }, index) =>
              <button
                className="btn btn-secondary"
                style="margin: 0.5rem"
                onClick={linkEvent({ i: this, index, external_auth }, handleUseExternalAuth)}
              >
                Login with { external_auth.display_name }
              </button>
            )}
          </div>
        </div>}
      </div>
    );
  }

  async handleSubmitTotp(totp: string) {
    const loginRes = await HttpService.client.login({
      password: this.state.form.password,
      username_or_email: this.state.form.username_or_email,
      totp_2fa_token: totp,
    });

    const successful = loginRes.state === "success";
    if (successful) {
      this.setState({ show2faModal: false });
      handleLoginSuccess(this, loginRes.data);
    } else {
      toast(I18NextService.i18n.t("incorrect_totp_code"), "danger");
    }

    return successful;
  }

  loginForm() {
    return (
      <div>
        <form onSubmit={linkEvent(this, handleLoginSubmit)}>
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
                onInput={linkEvent(this, handleLoginUsernameChange)}
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
              onInput={linkEvent(this, handleLoginPasswordChange)}
              label={I18NextService.i18n.t("password")}
              showForgotLink
            />
          </div>
          <div className="mb-3 row">
            <div className="col-sm-10">
              <button type="submit" className="btn btn-secondary">
                {this.state.loginRes.state === "loading" ? (
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
}
