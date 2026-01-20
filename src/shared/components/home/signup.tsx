import { setIsoData, updateMyUserInfo } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { getQueryParams, resourcesSettled, validEmail } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { Component, FormEvent } from "inferno";
import {
  CaptchaResponse,
  GetCaptchaResponse,
  LoginResponse,
  SiteView,
} from "lemmy-js-client";
import { validActorRegexPattern } from "@utils/config";
import { mdToHtml } from "@utils/markdown";
import { I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import PasswordInput from "../common/password-input";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { RouteData } from "@utils/types";
import { IRoutePropsWithFetch } from "@utils/routes";
import { handleUseOAuthProvider } from "./login";
import { secondsDurationToAlertClass, secondsDurationToStr } from "@utils/date";

interface SignupProps {
  sso_provider_id?: string;
}

interface State {
  registerRes: RequestState<LoginResponse>;
  captchaRes: RequestState<GetCaptchaResponse>;
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
    stay_logged_in: boolean;
  };
  captchaPlaying: boolean;
}

export function getSignupQueryParams(source?: string): SignupProps {
  return getQueryParams<SignupProps>(
    {
      sso_provider_id: (param?: string) => param,
    },
    source,
  );
}

type SignupRouteProps = RouteComponentProps<Record<string, never>> &
  SignupProps;
export type SignupFetchConfig = IRoutePropsWithFetch<
  RouteData,
  Record<string, never>,
  SignupProps
>;

@scrollMixin
export class Signup extends Component<SignupRouteProps, State> {
  public isoData = setIsoData(this.context);
  public audio?: HTMLAudioElement;

  state: State = {
    registerRes: EMPTY_REQUEST,
    captchaRes: EMPTY_REQUEST,
    form: {
      show_nsfw: !!this.isoData.siteRes?.site_view.site.content_warning,
      stay_logged_in: false,
    },
    captchaPlaying: false,
  };

  loadingSettled() {
    return (
      !this.isoData.siteRes?.site_view.local_site.captcha_enabled ||
      resourcesSettled([this.state.captchaRes])
    );
  }

  constructor(props: any, context: any) {
    super(props, context);
  }

  async componentWillMount() {
    if (
      this.isoData.siteRes?.site_view.local_site.captcha_enabled &&
      isBrowser()
    ) {
      await this.fetchCaptcha();
    }
  }

  async fetchCaptcha() {
    this.setState({ captchaRes: LOADING_REQUEST });
    this.setState({
      captchaRes: await HttpService.client.getCaptcha(),
    });

    this.setState(s => {
      if (s.captchaRes.state === "success") {
        s.form.captcha_uuid = s.captchaRes.data.ok?.uuid;
      }
      return s;
    });
  }

  get documentTitle(): string {
    const siteView = this.isoData.siteRes?.site_view;
    return `${this.titleName(siteView)} - ${siteView?.site.name}`;
  }

  titleName(siteView?: SiteView): string {
    return I18NextService.i18n.t(
      siteView?.local_site.private_instance ? "apply_to_join" : "sign_up",
    );
  }

  render() {
    return (
      <div className="home-signup container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">
            {this.registerForm()}
          </div>
        </div>
      </div>
    );
  }

  registerForm() {
    const siteView = this.isoData.siteRes?.site_view;
    const oauth_provider = getOAuthProvider(this);
    const lastApplicationDurationSeconds =
      this.isoData.siteRes.last_application_duration_seconds;

    return (
      <form
        className="was-validated"
        onSubmit={e => handleRegisterSubmit(this, e)}
      >
        <h1 className="h4 mb-4">{this.titleName(siteView)}</h1>

        <div className="mb-3 row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="register-username"
          >
            {I18NextService.i18n.t("username")}
          </label>

          <div className="col-sm-10">
            <input
              type="text"
              id="register-username"
              className="form-control"
              value={this.state.form.username}
              onInput={e => handleRegisterUsernameChange(this, e)}
              required
              minLength={3}
              pattern={validActorRegexPattern}
              title={I18NextService.i18n.t("community_reqs")}
            />
          </div>
        </div>

        {!oauth_provider && (
          <>
            {
              <div className="mb-3 row">
                <label
                  className="col-sm-2 col-form-label"
                  htmlFor="register-email"
                >
                  {I18NextService.i18n.t("email")}
                </label>
                <div className="col-sm-10">
                  <input
                    type="email"
                    id="register-email"
                    className="form-control"
                    placeholder={
                      siteView?.local_site.require_email_verification
                        ? I18NextService.i18n.t("required")
                        : I18NextService.i18n.t("optional")
                    }
                    value={this.state.form.email}
                    autoComplete="email"
                    onInput={e => handleRegisterEmailChange(this, e)}
                    required={siteView?.local_site.require_email_verification}
                    minLength={3}
                  />
                  {!siteView?.local_site.require_email_verification &&
                    this.state.form.email &&
                    !validEmail(this.state.form.email) && (
                      <div
                        className="mt-2 mb-0 alert alert-warning"
                        role="alert"
                      >
                        <Icon
                          icon="alert-triangle"
                          classes="icon-inline me-2"
                        />
                        {I18NextService.i18n.t("no_password_reset")}
                      </div>
                    )}
                </div>
              </div>
            }

            {
              <div className="mb-3">
                <PasswordInput
                  id="register-password"
                  value={this.state.form.password}
                  onInput={e => handleRegisterPasswordChange(this, e)}
                  showStrength
                  label={I18NextService.i18n.t("password")}
                  isNew
                />
              </div>
            }

            {
              <div className="mb-3">
                <PasswordInput
                  id="register-verify-password"
                  value={this.state.form.password_verify}
                  onInput={e => handleRegisterPasswordVerifyChange(this, e)}
                  label={I18NextService.i18n.t("verify_password")}
                  isNew
                />
              </div>
            }
          </>
        )}

        {siteView?.local_site.registration_mode === "require_application" && (
          <>
            <div className="mb-3 row">
              <div className="offset-sm-2 col-sm-10">
                <div className="mt-2 alert alert-warning" role="alert">
                  <Icon icon="alert-triangle" classes="icon-inline me-2" />
                  {I18NextService.i18n.t("fill_out_application")}
                </div>
                {siteView.local_site.application_question && (
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(
                      siteView.local_site.application_question,
                      () => this.forceUpdate(),
                    )}
                  />
                )}
              </div>
            </div>

            <div className="mb-3 row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="application_answer"
              >
                {I18NextService.i18n.t("answer")}
              </label>
              <div className="col-sm-10">
                <MarkdownTextArea
                  initialContent=""
                  onContentChange={val => handleAnswerChange(this, val)}
                  hideNavigationWarnings
                  allLanguages={[]}
                  siteLanguages={[]}
                  renderAsDiv
                  myUserInfo={this.isoData.myUserInfo}
                />
              </div>
            </div>
            {lastApplicationDurationSeconds && (
              <div className="mb-3 row">
                <div className="offset-sm-2 col-sm-10">
                  <div
                    className={secondsDurationToAlertClass(
                      lastApplicationDurationSeconds,
                    )}
                    role="alert"
                  >
                    {I18NextService.i18n.t("estimated_approval_time", {
                      time: secondsDurationToStr(
                        lastApplicationDurationSeconds,
                      ),
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {this.renderCaptcha()}
        <div className="mb-3">
          <div className="form-check">
            <input
              className="form-check-input"
              id="register-show-nsfw"
              type="checkbox"
              checked={this.state.form.show_nsfw}
              onChange={e => handleRegisterShowNsfwChange(this, e)}
            />
            <label className="form-check-label" htmlFor="register-show-nsfw">
              {I18NextService.i18n.t("show_nsfw")}
            </label>
          </div>
        </div>
        <input
          tabIndex={-1}
          autoComplete="false"
          name="a_password"
          type="text"
          className="form-control honeypot"
          id="register-honey"
          value={this.state.form.honeypot}
          onInput={e => handleHoneyPotChange(this, e)}
        />
        <div className="input-group mb-3">
          <div className="form-check">
            <input
              className="form-check-input"
              id="register-stay-logged-in"
              type="checkbox"
              checked={this.state.form.stay_logged_in}
              onChange={e => handleStayLoggedInChange(this, e)}
            />
            <label
              className="form-check-label"
              htmlFor="register-stay-logged-in"
            >
              {I18NextService.i18n.t("stay_logged_in")}
            </label>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.registerRes.state === "loading" ? (
                <Spinner />
              ) : (
                [
                  this.titleName(siteView),
                  ...(oauth_provider
                    ? [`(${oauth_provider.display_name})`]
                    : []),
                ].join(" ")
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  renderCaptcha() {
    switch (this.state.captchaRes.state) {
      case "loading":
        return <Spinner />;
      case "success": {
        const res = this.state.captchaRes.data;
        return (
          <div className="mb-3 row">
            <label className="col-sm-2" htmlFor="register-captcha">
              <span className="me-2">
                {I18NextService.i18n.t("enter_code")}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleRegenCaptcha(this)}
                aria-label={I18NextService.i18n.t("captcha")}
              >
                <Icon icon="refresh-cw" classes="icon-refresh-cw" />
              </button>
            </label>
            {this.showCaptcha(res)}
            <div className="col-sm-6">
              <input
                type="text"
                className="form-control"
                id="register-captcha"
                value={this.state.form.captcha_answer}
                onInput={e => handleRegisterCaptchaAnswerChange(this, e)}
                required
              />
            </div>
          </div>
        );
      }
    }
  }

  showCaptcha(res: GetCaptchaResponse) {
    const captchaRes = res?.ok;
    return captchaRes ? (
      <div className="col-sm-4">
        <>
          <img
            className="rounded-top img-fluid"
            src={captchaPngSrc(captchaRes)}
            style="border-bottom-right-radius: 0; border-bottom-left-radius: 0;"
            alt={I18NextService.i18n.t("captcha")}
          />
          {captchaRes.wav && (
            <button
              className="rounded-bottom btn btn-sm btn-secondary d-block"
              style="border-top-right-radius: 0; border-top-left-radius: 0;"
              title={I18NextService.i18n.t("play_captcha_audio")}
              onClick={() => handleCaptchaPlay(this)}
              type="button"
              disabled={this.state.captchaPlaying}
            >
              <Icon icon="play" classes="icon-play" />
            </button>
          )}
        </>
      </div>
    ) : (
      <></>
    );
  }
}

async function handleRegisterSubmit(
  i: Signup,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  const {
    show_nsfw,
    answer,
    captcha_answer,
    captcha_uuid,
    email,
    honeypot,
    password,
    password_verify,
    username,
    stay_logged_in,
  } = i.state.form;

  const oauthProvider = getOAuthProvider(i);

  // oauth registration
  if (username && oauthProvider)
    return handleUseOAuthProvider(
      oauthProvider,
      undefined,
      username,
      answer,
      show_nsfw,
    );

  // normal registration
  if (username && password && password_verify) {
    i.setState({ registerRes: LOADING_REQUEST });

    const registerRes = await HttpService.client.register({
      username,
      password,
      password_verify,
      email,
      show_nsfw,
      captcha_uuid,
      captcha_answer,
      honeypot,
      answer,
      stay_logged_in,
    });
    switch (registerRes.state) {
      case "failed": {
        toast(registerRes.err.name, "danger");
        i.setState({ registerRes: EMPTY_REQUEST });
        break;
      }

      case "success": {
        const data = registerRes.data;

        // Only log them in if a jwt was set
        if (data.jwt) {
          UserService.Instance.login({
            res: data,
          });

          const myUserRes = await HttpService.client.getMyUser();

          if (myUserRes.state === "success") {
            updateMyUserInfo(myUserRes.data);
          }

          i.props.history.replace("/communities");
        } else {
          if (data.verify_email_sent) {
            toast(I18NextService.i18n.t("verify_email_sent"));
          }
          if (data.registration_created) {
            toast(I18NextService.i18n.t("registration_application_sent"));
          }
          i.props.history.push("/");
        }
        break;
      }
    }
  }
}

function handleRegisterUsernameChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.username = event.target.value.trim();
  i.setState(i.state);
}

function handleRegisterEmailChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.email = event.target.value;
  if (i.state.form.email === "") {
    i.state.form.email = undefined;
  }
  i.setState(i.state);
}

function handleRegisterPasswordChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.password = event.target.value;
  i.setState(i.state);
}

function handleRegisterPasswordVerifyChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.password_verify = event.target.value;
  i.setState(i.state);
}

function handleRegisterShowNsfwChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.show_nsfw = event.target.checked;
  i.setState(i.state);
}

function handleStayLoggedInChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.stay_logged_in = event.target.checked;
  i.setState(i.state);
}

function handleRegisterCaptchaAnswerChange(
  i: Signup,
  event: FormEvent<HTMLInputElement>,
) {
  i.state.form.captcha_answer = event.target.value;
  i.setState(i.state);
}

function handleAnswerChange(i: Signup, val: string) {
  i.setState(s => ((s.form.answer = val), s));
}

function handleHoneyPotChange(i: Signup, event: FormEvent<HTMLInputElement>) {
  i.state.form.honeypot = event.target.value;
  i.setState(i.state);
}

async function handleRegenCaptcha(i: Signup) {
  i.audio = undefined;
  i.setState({ captchaPlaying: false });
  await i.fetchCaptcha();
}

function handleCaptchaPlay(i: Signup) {
  // This was a bad bug, it should only build the new audio on a new file.
  // Replays would stop prematurely if this was rebuilt every time.

  if (i.state.captchaRes.state === "success" && i.state.captchaRes.data.ok) {
    const captchaRes = i.state.captchaRes.data.ok;
    if (!i.audio) {
      const base64 = `data:audio/wav;base64,${captchaRes.wav}`;
      i.audio = new Audio(base64);
      i.audio.play();

      i.setState({ captchaPlaying: true });

      i.audio.addEventListener("ended", () => {
        if (i.audio) {
          i.audio.currentTime = 0;
          i.setState({ captchaPlaying: false });
        }
      });
    }
  }
}

function getOAuthProvider(i: Signup) {
  return (i.isoData.siteRes?.oauth_providers ?? []).find(
    provider => provider.id === Number(i.props?.sso_provider_id ?? -1),
  );
}

function captchaPngSrc(captcha: CaptchaResponse) {
  return `data:image/png;base64,${captcha.png}`;
}
