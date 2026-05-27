import { setIsoData, updateMyUserInfo } from "@utils/app";
import { Component, FormEvent } from "inferno";
import { refreshTheme } from "@utils/browser";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { Spinner } from "../../common/icon";
import { getQueryParams } from "@utils/helpers";
import { IRoutePropsWithFetch } from "@utils/routes";
import { RouteData } from "@utils/types";
import { I18NextService, UserService } from "../../../services";
import { RouteComponentProps } from "inferno-router";
import { UnreadCounterService } from "../../../services";
import { HttpService } from "../../../services/HttpService";
import { toast } from "@utils/app";
import { Action } from "history";
import { handleLoginWithProvider, LocalOauthState } from "./oauth-login";
import { NoOptionI18nKeys } from "i18next";
import { RegistrationApplicationInput } from "../authenticate/registration-application-input";
import { validActorRegexPattern } from "@utils/config";
import { signupTitleName } from "../authenticate/signup";
import { RegistrationLegalInfo } from "../authenticate/registration-legal-info";
import { RegistrationCheckboxes } from "../authenticate/registration-checkboxes";

interface OAuthCallbackProps {
  code?: string;
  state?: string;
}

export function getOAuthCallbackQueryParams(
  source?: string,
): OAuthCallbackProps {
  return getQueryParams<OAuthCallbackProps>(
    {
      code: (code?: string) => code,
      state: (state?: string) => state,
    },
    source,
  );
}

type OAuthCallbackRouteProps = RouteComponentProps<Record<string, never>> &
  OAuthCallbackProps;
export type OAuthCallbackConfig = IRoutePropsWithFetch<
  RouteData,
  Record<string, never>,
  OAuthCallbackProps
>;

interface State {
  siteRes: GetSiteResponse;
  username_required: boolean;
  username?: string;
  answer?: string;
  show_nsfw: boolean;
  stay_logged_in: boolean;
}

export class OAuthCallback extends Component<OAuthCallbackRouteProps, State> {
  public isoData = setIsoData(this.context);

  state: State = {
    siteRes: this.isoData.siteRes,
    username_required: false,
    show_nsfw: false,
    stay_logged_in: false,
  };

  async componentDidMount() {
    await this.doLogin();
  }

  async doLogin() {
    // restore state from local storage
    const local_oauth_state = JSON.parse(
      localStorage.getItem("oauth_state") || "{}",
    ) as LocalOauthState;
    if (
      !(
        this.props.state &&
        this.props.code &&
        local_oauth_state?.state &&
        local_oauth_state?.oauth_provider_id &&
        local_oauth_state?.expires_at &&
        this.props.state === local_oauth_state.state
      ) ||
      local_oauth_state.expires_at < Date.now()
    ) {
      // oauth failed or expired
      toast(I18NextService.i18n.t("oauth_authorization_invalid"), "danger");
      this.props.history.replace("/login");
    } else {
      const loginRes = await HttpService.client.authenticateWithOAuth({
        code: this.props.code,
        oauth_provider_id: local_oauth_state.oauth_provider_id,
        redirect_uri: local_oauth_state.redirect_uri,
        show_nsfw: local_oauth_state.show_nsfw,
        stay_logged_in: local_oauth_state.stay_logged_in,
        username: local_oauth_state.username,
        answer: local_oauth_state.answer,
      });

      switch (loginRes.state) {
        case "success": {
          if (loginRes.data.jwt) {
            await handleOAuthLoginSuccess(
              this,
              local_oauth_state.prev,
              loginRes.data,
            );
          } else {
            if (loginRes.data.verify_email_sent) {
              toast(I18NextService.i18n.t("verify_email_sent"));
            }
            if (loginRes.data.registration_created) {
              toast(I18NextService.i18n.t("registration_application_sent"));
            }
            this.props.history.push("/login");
          }
          break;
        }
        case "failed": {
          const err_redirect = "/login";
          switch (loginRes.err.name) {
            case "registration_application_answer_required":
            case "registration_username_required":
              this.setState({ username_required: true });
              return;
            default:
              toast(
                I18NextService.i18n.t(loginRes.err.name as NoOptionI18nKeys),
                "danger",
              );
              break;
          }
          this.props.history.push(err_redirect);
        }
      }
    }
  }
  get documentTitle(): string {
    return `${I18NextService.i18n.t("login")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    const siteView = this.state.siteRes.site_view;
    return (
      <div className="container-lg">
        {this.state.username_required ? (
          <form onSubmit={_e => handleSubmit(this)}>
            <h1 className="h4 mb-4">{signupTitleName(siteView)}</h1>
            <div className="mb-3 row">
              <label className="col-sm-2 col-form-label" htmlFor="username">
                {I18NextService.i18n.t("username")}
              </label>
              <div className="col-sm-10">
                <input
                  id="username"
                  type="text"
                  className="form-control"
                  onInput={e => handleUsernameChange(this, e)}
                  required
                  minLength={3}
                  pattern={validActorRegexPattern}
                  title={I18NextService.i18n.t("community_reqs")}
                ></input>
              </div>
              <RegistrationApplicationInput
                getSiteRes={this.isoData.siteRes}
                onAnswerChange={answer => handleAnswerChange(this, answer)}
              />
              <RegistrationLegalInfo siteView={siteView} />
              <RegistrationCheckboxes
                form={this.state}
                onRegisterShowNsfwChange={e =>
                  handleRegisterShowNsfwChange(this, e)
                }
                onStayLoggedInChange={e => handleStayLoggedInChange(this, e)}
              />
              <div className="mb-3 row">
                <div className="col-sm-10">
                  <button
                    type="submit"
                    className="btn btn-light border-light-subtle"
                  >
                    {I18NextService.i18n.t("submit")}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <Spinner />
        )}
      </div>
    );
  }
}

async function handleOAuthLoginSuccess(
  i: OAuthCallback,
  prev: string,
  loginRes: LoginResponse,
) {
  UserService.Instance.login({
    res: loginRes,
  });
  const [site, myUser] = await Promise.all([
    HttpService.client.getSite(),
    HttpService.client.getMyUser(),
  ]);

  if (site.state === "success" && myUser.state === "success") {
    updateMyUserInfo(myUser.data);
    refreshTheme();
  }

  if (prev) {
    i.props.history.replace(prev);
  } else if (i.props.history.action === Action.Push) {
    i.props.history.back();
  } else {
    i.props.history.replace("/");
  }

  await UnreadCounterService.Instance.updateUnreadCounts();
}

function handleUsernameChange(
  i: OAuthCallback,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    username: event.target.value,
  });
}

function handleAnswerChange(i: OAuthCallback, answer: string) {
  i.setState({
    answer,
  });
}

function handleRegisterShowNsfwChange(i: OAuthCallback, show_nsfw: boolean) {
  i.setState({
    show_nsfw,
  });
}

function handleStayLoggedInChange(i: OAuthCallback, stay_logged_in: boolean) {
  i.setState({
    stay_logged_in,
  });
}

function handleSubmit(i: OAuthCallback) {
  i.setState({
    username_required: false,
  });
  const local_oauth_state = JSON.parse(
    localStorage.getItem("oauth_state") || "{ }",
  ) as LocalOauthState;

  const provider = i.isoData.siteRes.oauth_providers.find(
    p => p.id === local_oauth_state.oauth_provider_id,
  );
  if (provider) {
    handleLoginWithProvider(
      provider,
      i.state.username,
      decodeURIComponent(local_oauth_state.redirect_uri),
      i.state.answer,
      i.state.show_nsfw,
      i.state.stay_logged_in,
    );
  } else {
    i.props.history.push("/login");
  }
}
