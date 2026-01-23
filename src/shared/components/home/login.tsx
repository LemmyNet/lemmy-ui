import { setIsoData, updateMyUserInfo } from "@utils/app";
import { isBrowser, refreshTheme } from "@utils/browser";
import { getQueryParams, validEmail } from "@utils/helpers";
import { Component, FormEvent } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  GetSiteResponse,
  LoginResponse,
  PublicOAuthProvider,
} from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import PasswordInput from "../common/password-input";
import TotpModal from "../common/modal/totp-modal";
import { UnreadCounterService } from "../../services";
import { RouteData } from "@utils/types";
import { IRoutePropsWithFetch } from "@utils/routes";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { NoOptionI18nKeys } from "i18next";
import { v4 as uuidv4 } from "uuid";

interface LoginProps {
  prev?: string;
}

export function getLoginQueryParams(source?: string): LoginProps {
  return getQueryParams<LoginProps>(
    {
      prev: (param?: string) => param,
    },
    source,
  );
}

interface State {
  loginRes: RequestState<LoginResponse>;
  form: {
    username_or_email: string;
    password: string;
    stay_logged_in: boolean;
  };
  siteRes: GetSiteResponse;
  show2faModal: boolean;
  showOAuthModal: boolean;
  showResendVerificationEmailBtn: boolean;
}

type LoginRouteProps = RouteComponentProps<Record<string, never>> & LoginProps;
export type LoginFetchConfig = IRoutePropsWithFetch<
  RouteData,
  Record<string, never>,
  LoginProps
>;

@simpleScrollMixin
export class Login extends Component<LoginRouteProps, State> {
  private isoData = setIsoData(this.context);

  state: State = {
    loginRes: EMPTY_REQUEST,
    form: {
      username_or_email: "",
      password: "",
      stay_logged_in: false,
    },
    siteRes: this.isoData.siteRes,
    show2faModal: false,
    showOAuthModal: false,
    showResendVerificationEmailBtn: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
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
          onSubmit={totp => handleSubmitTotp(this, totp)}
          show={this.state.show2faModal}
          onClose={() => handleClose2faModal(this)}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">{this.loginForm()}</div>
        </div>
        {(this.state.siteRes.oauth_providers?.length || 0) > 0 && (
          <>
            <div className="row mt-3 mb-2">
              <div className="col-12 col-lg-6 offset-lg-3">
                {I18NextService.i18n.t("or")}
              </div>
            </div>
            <div className="row">
              <div className="col col-12 col-lg-6 offset-lg-3">
                <h2 className="h4 mb-3">
                  {I18NextService.i18n.t("oauth_login_with_provider")}
                </h2>
                {(this.state.siteRes.oauth_providers ?? []).map(
                  (provider: PublicOAuthProvider) => (
                    <button
                      className="btn btn-primary my-2 d-block"
                      onClick={() => handleLoginWithProvider(this, provider)}
                    >
                      {provider.display_name}
                    </button>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  loginForm() {
    return (
      <div>
        <form onSubmit={e => handleLoginSubmit(this, e)}>
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
                onInput={e => handleLoginUsernameChange(this, e)}
                autoComplete="email"
                required
                minLength={3}
              />
              {this.state.showResendVerificationEmailBtn &&
                validEmail(this.state.form.username_or_email) && (
                  <button
                    className="btn p-0 btn-link d-inline-block float-right text-muted small font-weight-bold pointer-events not-allowed"
                    onClick={() => handleResendVerificationEmail(this)}
                  >
                    {I18NextService.i18n.t("resend_verification_email")}
                  </button>
                )}
            </div>
          </div>
          <div className="mb-3">
            <PasswordInput
              id="login-password"
              value={this.state.form.password}
              onInput={e => handleLoginPasswordChange(this, e)}
              label={I18NextService.i18n.t("password")}
              showForgotLink
            />
          </div>
          <div className="input-group mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                id="stay-logged-in"
                type="checkbox"
                checked={this.state.form.stay_logged_in}
                onChange={e => handleStayLoggedInChange(this, e)}
              />
              <label className="form-check-label" htmlFor="stay-logged-in">
                {I18NextService.i18n.t("stay_logged_in")}
              </label>
            </div>
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

async function handleSubmitTotp(i: Login, totp: string) {
  const loginRes = await HttpService.client.login({
    password: i.state.form.password,
    username_or_email: i.state.form.username_or_email,
    totp_2fa_token: totp,
  });

  const successful = loginRes.state === "success";
  if (successful) {
    i.setState({ show2faModal: false });
    handleLoginSuccess(i, loginRes.data);
  } else {
    toast(I18NextService.i18n.t("incorrect_totp_code"), "danger");
  }

  return successful;
}

async function handleLoginWithProvider(
  i: Login,
  oauth_provider: PublicOAuthProvider,
) {
  handleUseOAuthProvider(oauth_provider, i.props.prev ?? "/");
}

async function handleLoginSuccess(i: Login, loginRes: LoginResponse) {
  UserService.Instance.login({
    res: loginRes,
  });
  const [site, myUser] = await Promise.all([
    HttpService.client.getSite(),
    HttpService.client.getMyUser(),
  ]);

  if (site.state === "success" && myUser.state === "success") {
    const isoData = setIsoData(i.context);
    updateMyUserInfo(myUser.data);
    isoData.siteRes.oauth_providers = site.data.oauth_providers;
    isoData.siteRes.admin_oauth_providers = site.data.admin_oauth_providers;
    refreshTheme();
  }

  const { prev } = i.props;

  if (prev) {
    i.props.history.replace(prev);
  } else if (i.props.history.action === "PUSH") {
    i.props.history.back();
  } else {
    i.props.history.replace("/");
  }

  UnreadCounterService.Instance.updateUnreadCounts();
}

async function handleLoginSubmit(i: Login, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const { password, username_or_email, stay_logged_in } = i.state.form;

  if (username_or_email && password) {
    i.setState({ loginRes: LOADING_REQUEST });

    const loginRes = await HttpService.client.login({
      username_or_email,
      password,
      stay_logged_in,
    });
    switch (loginRes.state) {
      case "failed": {
        if (loginRes.err.name === "missing_totp_token") {
          i.setState({ show2faModal: true });
        } else if (loginRes.err.name === "not_found") {
          toast(I18NextService.i18n.t("incorrect_login"), "danger");
        } else if (loginRes.err.name === "email_not_verified") {
          toast(I18NextService.i18n.t(loginRes.err.name), "danger");

          // Show the resend verification email button
          i.setState({ showResendVerificationEmailBtn: true });
        } else {
          let errStr: string = I18NextService.i18n.t(
            loginRes.err.name === "registration_application_is_pending"
              ? "registration_application_pending"
              : (loginRes.err.name as NoOptionI18nKeys),
          );
          // If there's an error message, append it
          if (loginRes.err.message) {
            errStr = `${errStr}: ${loginRes.err.message}`;
          }
          toast(errStr, "danger");
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

export async function handleUseOAuthProvider(
  oauth_provider: PublicOAuthProvider,
  prev?: string,
  username?: string,
  answer?: string,
  show_nsfw?: boolean,
) {
  const redirectUri = `${window.location.origin}/oauth/callback`;
  const state = uuidv4();
  const requestUri =
    oauth_provider.authorization_endpoint +
    "?" +
    [
      `client_id=${encodeURIComponent(oauth_provider.client_id)}`,
      `response_type=code`,
      `scope=${encodeURIComponent(oauth_provider.scopes)}`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      `state=${state}`,
    ].join("&");

  // store state in local storage
  localStorage.setItem(
    "oauth_state",
    JSON.stringify({
      state,
      oauth_provider_id: oauth_provider.id,
      redirect_uri: redirectUri,
      prev: prev ?? "/",
      username: username,
      answer: answer,
      show_nsfw: show_nsfw,
      expires_at: Date.now() + 5 * 60_000,
    }),
  );

  window.location.assign(requestUri);
}

function handleLoginUsernameChange(
  i: Login,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.username_or_email = event.target.value.trim()), s));
}

function handleLoginPasswordChange(
  i: Login,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.password = event.target.value), s));
}

function handleStayLoggedInChange(
  i: Login,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.stay_logged_in = event.target.checked), s));
}

function handleClose2faModal(i: Login) {
  i.setState({ show2faModal: false });
}

async function handleResendVerificationEmail(i: Login) {
  const res = await HttpService.client.resendVerificationEmail({
    email: i.state.form.username_or_email,
  });

  const successful = res.state === "success";
  if (successful) {
    toast(I18NextService.i18n.t("verify_email_sent"));
  } else {
    toast(I18NextService.i18n.t("incorrect_login"), "danger");
  }

  i.setState({ showResendVerificationEmailBtn: false });

  return successful;
}
