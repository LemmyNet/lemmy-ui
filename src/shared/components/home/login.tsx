import { setIsoData } from "@utils/app";
import { isBrowser, refreshTheme } from "@utils/browser";
import { getQueryParams } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  GetSiteResponse,
  LoginResponse,
  OAuthProvider,
  PublicOAuthProvider,
} from "lemmy-js-client";
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
import TotpModal from "../common/modal/totp-modal";
import { UnreadCounterService } from "../../services";
import { RouteData } from "../../interfaces";
import { IRoutePropsWithFetch } from "../../routes";
import { simpleScrollMixin } from "../mixins/scroll-mixin";

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
    const isoData = setIsoData(i.context);
    isoData.site_res.oauth_providers = site.data.oauth_providers;
    isoData.site_res.admin_oauth_providers = site.data.admin_oauth_providers;
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
          // TODO: We shouldn't be passing error messages as args into i18next
          toast(
            I18NextService.i18n.t(
              loginRes.err.message === "registration_application_is_pending"
                ? "registration_application_pending"
                : loginRes.err.message,
            ),
            "danger",
          );
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

export async function handleUseOAuthProvider(params: {
  oauth_provider: OAuthProvider;
  username?: string;
  prev?: string;
  answer?: string;
  show_nsfw?: boolean;
}) {
  const redirectUri = `${window.location.origin}/oauth/callback`;

  const state = crypto.randomUUID();
  const requestUri =
    params.oauth_provider.authorization_endpoint +
    "?" +
    [
      `client_id=${encodeURIComponent(params.oauth_provider.client_id)}`,
      `response_type=code`,
      `scope=${encodeURIComponent(params.oauth_provider.scopes)}`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
      `state=${state}`,
    ].join("&");

  // store state in local storage
  localStorage.setItem(
    "oauth_state",
    JSON.stringify({
      state,
      oauth_provider_id: params.oauth_provider.id,
      redirect_uri: redirectUri,
      prev: params.prev ?? "/",
      username: params.username,
      answer: params.answer,
      show_nsfw: params.show_nsfw,
      expires_at: Date.now() + 5 * 60_000,
    }),
  );

  window.location.assign(requestUri);
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
    },
    siteRes: this.isoData.site_res,
    show2faModal: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSubmitTotp = this.handleSubmitTotp.bind(this);
    this.handleLoginWithProvider = this.handleLoginWithProvider.bind(this);
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
        {(this.state.siteRes.oauth_providers?.length || 0) > 0 && (
          <div className="row">
            <div className="col-12 col-lg-6 offset-lg-3">
              <span>{I18NextService.i18n.t("or")}</span>
              {(this.state.siteRes.oauth_providers ?? []).map(
                (oauth_provider: PublicOAuthProvider) => (
                  <button
                    className="btn btn-secondary m-2"
                    onClick={linkEvent(
                      { oauth_provider },
                      this.handleLoginWithProvider,
                    )}
                  >
                    {I18NextService.i18n.t("oauth_login_with_provider", {
                      provider_name: oauth_provider.display_name,
                    })}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
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

  async handleLoginWithProvider(params: { oauth_provider: OAuthProvider }) {
    handleUseOAuthProvider({
      oauth_provider: params.oauth_provider,
      prev: this.props.prev ?? "/",
    });
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
