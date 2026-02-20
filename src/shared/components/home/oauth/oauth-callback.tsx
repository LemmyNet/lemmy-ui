import { setIsoData, updateMyUserInfo } from "@utils/app";
import { Component } from "inferno";
import { refreshTheme } from "@utils/browser";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { Spinner } from "../../common/icon";
import { getQueryParams } from "@utils/helpers";
import { IRoutePropsWithFetch } from "@utils/routes";
import { RouteData } from "@utils/types";
import { I18NextService, UserService } from "../../../services";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { UnreadCounterService } from "../../../services";
import { HttpService } from "../../../services/HttpService";
import { toast } from "@utils/app";
import { NoOptionI18nKeys } from "i18next";
import { Action } from "history";

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
}

export class OAuthCallback extends Component<OAuthCallbackRouteProps, State> {
  isoData = setIsoData(this.context);

  state: State = {
    siteRes: this.isoData.siteRes,
  };

  async componentDidMount() {
    // store state in local storage
    const local_oauth_state = JSON.parse(
      localStorage.getItem("oauth_state") || "{}",
    );
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
          let err_redirect = "/login";
          switch (loginRes.err.message) {
            case "registration_username_required":
            case "registration_application_answer_required":
              err_redirect = `/signup?sso_provider_id=${local_oauth_state.oauth_provider_id}`;
              toast(
                I18NextService.i18n.t(loginRes.err.message as NoOptionI18nKeys),
                "danger",
              );
              break;
            case "registration_application_is_pending":
              toast(
                I18NextService.i18n.t("registration_application_pending"),
                "danger",
              );
              break;
            case "registration_denied":
            case "oauth_authorization_invalid":
            case "oauth_login_failed":
            case "oauth_registration_closed":
            case "email_already_exists":
            case "username_already_exists":
            case "no_email_setup":
              toast(I18NextService.i18n.t(loginRes.err.message), "danger");
              break;
            default:
              toast(I18NextService.i18n.t("incorrect_login"), "danger");
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
    return (
      <div className="container-lg">
        <Spinner />
      </div>
    );
  }
}

async function handleOAuthLoginSuccess(
  i: OAuthCallback,
  prev: string,
  loginRes: LoginResponse,
) {
  await UserService.Instance.login({
    res: loginRes,
  });
  const [site, myUser] = await Promise.all([
    HttpService.client.getSite(),
    HttpService.client.getMyUser(),
  ]);

  if (site.state === "success" && myUser.state === "success") {
    await updateMyUserInfo(myUser.data);
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
