import { setIsoData } from "@utils/app";
import { Component } from "inferno";
import { refreshTheme } from "@utils/browser";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { Spinner } from "../common/icon";
import { getQueryParams } from "@utils/helpers";
import { IRoutePropsWithFetch } from "../../routes";
import { RouteData } from "../../interfaces";
import { I18NextService, UserService } from "../../services";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { UnreadCounterService } from "../../services";
import { HttpService } from "../../services/HttpService";
import { toast } from "../../toast";

interface OAuthCallbackProps {
  code: string | undefined;
  state: string | undefined;
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
  private isoData = setIsoData(this.context);

  state: State = {
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  async componentDidMount() {
    // store state in local storage
    const local_oauth_state = JSON.parse(
      localStorage.getItem("oauth_state") || "{}",
    );
    if (
      !this.props.state ||
      !this.props.code ||
      !local_oauth_state?.state ||
      !local_oauth_state?.oauth_provider_id ||
      !local_oauth_state?.expires_at ||
      this.props.state !== local_oauth_state.state ||
      local_oauth_state.expires_at < Date.now()
    ) {
      // oauth failed or expired
      toast(I18NextService.i18n.t("oauth_authorization_invalid"), "danger");
      this.props.history.push("/login");
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
            handleOAuthLoginSuccess(
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
              toast(
                I18NextService.i18n.t("registration_username_required"),
                "danger",
              );
              err_redirect = `/signup?sso_provider_id=${local_oauth_state.oauth_provider_id}`;
              break;
            case "registration_application_answer_required":
              toast(
                I18NextService.i18n.t(
                  "registration_application_answer_required",
                ),
                "danger",
              );
              err_redirect = `/signup?sso_provider_id=${local_oauth_state.oauth_provider_id}`;
              break;
            case "registration_application_is_pending":
              toast(
                I18NextService.i18n.t("registration_application_pending"),
                "danger",
              );
              break;
            case "registration_denied":
              toast(I18NextService.i18n.t("registration_denied"), "danger");
              break;
            case "oauth_authorization_invalid":
              toast(
                I18NextService.i18n.t("oauth_authorization_invalid"),
                "danger",
              );
              break;
            case "oauth_login_failed":
              toast(I18NextService.i18n.t("oauth_login_failed"), "danger");
              break;
            case "oauth_registration_closed":
              toast(I18NextService.i18n.t("registration_closed"), "danger");
              break;
            case "email_already_exists":
              toast(I18NextService.i18n.t("email_already_exists"), "danger");
              break;
            case "username_already_exists":
              toast(I18NextService.i18n.t("username_already_exists"), "danger");
              break;
            case "no_email_setup":
              toast(I18NextService.i18n.t("no_email_setup"), "danger");
              break;
            default:
              toast(I18NextService.i18n.t("incorrect_login"), "danger");
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
  UserService.Instance.login({
    res: loginRes,
  });
  const site = await HttpService.client.getSite();

  if (site.state === "success") {
    UserService.Instance.myUserInfo = site.data.my_user;
    refreshTheme();
  }

  if (prev) {
    i.props.history.replace(prev);
  } else if (i.props.history.action === "PUSH") {
    i.props.history.back();
  } else {
    i.props.history.replace("/");
  }

  UnreadCounterService.Instance.updateAll();
}
