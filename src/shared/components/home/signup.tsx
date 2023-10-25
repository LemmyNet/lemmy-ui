import { setIsoData } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { validEmail } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CaptchaResponse,
  GetCaptchaResponse,
  GetSiteResponse,
  LoginResponse,
  SiteView,
} from "lemmy-js-client";
import { joinLemmyUrl } from "../../config";
import { mdToHtml } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import PasswordInput from "../common/password-input";

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
  };
  captchaPlaying: boolean;
  siteRes: GetSiteResponse;
}

export class Signup extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private audio?: HTMLAudioElement;

  state: State = {
    registerRes: EMPTY_REQUEST,
    captchaRes: EMPTY_REQUEST,
    form: {
      show_nsfw: false,
    },
    captchaPlaying: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleAnswerChange = this.handleAnswerChange.bind(this);
  }

  async componentDidMount() {
    if (this.state.siteRes.site_view.local_site.captcha_enabled) {
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
    const siteView = this.state.siteRes.site_view;
    return `${this.titleName(siteView)} - ${siteView.site.name}`;
  }

  titleName(siteView: SiteView): string {
    return I18NextService.i18n.t(
      siteView.local_site.private_instance ? "apply_to_join" : "sign_up",
    );
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname === "lemmy.ml";
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
    const siteView = this.state.siteRes.site_view;
    return (
      <form
        className="was-validated"
        onSubmit={linkEvent(this, this.handleRegisterSubmit)}
      >
        <h1 className="h4 mb-4">{this.titleName(siteView)}</h1>
        <div className="alert alert-warning mt-3" role="alert">
          <h6 className="alert-heading">
            <Icon icon="alert-triangle" classes="icon-inline me-2" />
            <strong>
              {I18NextService.i18n.t("federation_disclaimer_title")}
            </strong>
          </h6>
          {I18NextService.i18n.t("federation_disclaimer_body")}
        </div>

        {this.isLemmyMl && (
          <div className="mb-3 row">
            <div className="mt-2 mb-0 alert alert-warning" role="alert">
              <T i18nKey="lemmy_ml_registration_message">
                #<a href={joinLemmyUrl}>#</a>
              </T>
            </div>
          </div>
        )}

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
              onInput={linkEvent(this, this.handleRegisterUsernameChange)}
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
              title={I18NextService.i18n.t("community_reqs")}
            />
          </div>
        </div>

        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="register-email">
            {I18NextService.i18n.t("email")}
          </label>
          <div className="col-sm-10">
            <input
              type="email"
              id="register-email"
              className="form-control"
              placeholder={
                siteView.local_site.require_email_verification
                  ? I18NextService.i18n.t("required")
                  : I18NextService.i18n.t("optional")
              }
              value={this.state.form.email}
              autoComplete="email"
              onInput={linkEvent(this, this.handleRegisterEmailChange)}
              required={siteView.local_site.require_email_verification}
              minLength={3}
            />
            {!siteView.local_site.require_email_verification &&
              this.state.form.email &&
              !validEmail(this.state.form.email) && (
                <div className="mt-2 mb-0 alert alert-warning" role="alert">
                  <Icon icon="alert-triangle" classes="icon-inline me-2" />
                  {I18NextService.i18n.t("no_password_reset")}
                </div>
              )}
          </div>
        </div>

        <div className="mb-3">
          <PasswordInput
            id="register-password"
            value={this.state.form.password}
            onInput={linkEvent(this, this.handleRegisterPasswordChange)}
            showStrength
            label={I18NextService.i18n.t("password")}
            isNew
          />
        </div>

        <div className="mb-3">
          <PasswordInput
            id="register-verify-password"
            value={this.state.form.password_verify}
            onInput={linkEvent(this, this.handleRegisterPasswordVerifyChange)}
            label={I18NextService.i18n.t("verify_password")}
            isNew
          />
        </div>

        {siteView.local_site.registration_mode === "RequireApplication" && (
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
                  onContentChange={this.handleAnswerChange}
                  hideNavigationWarnings
                  allLanguages={[]}
                  siteLanguages={[]}
                />
              </div>
            </div>
          </>
        )}
        {this.renderCaptcha()}
        <div className="mb-3 row">
          <div className="col-sm-10">
            <div className="form-check">
              <input
                className="form-check-input"
                id="register-show-nsfw"
                type="checkbox"
                checked={this.state.form.show_nsfw}
                onChange={linkEvent(this, this.handleRegisterShowNsfwChange)}
              />
              <label className="form-check-label" htmlFor="register-show-nsfw">
                {I18NextService.i18n.t("show_nsfw")}
              </label>
            </div>
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
          onInput={linkEvent(this, this.handleHoneyPotChange)}
        />
        <div className="mb-3 row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.registerRes.state === "loading" ? (
                <Spinner />
              ) : (
                this.titleName(siteView)
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
                onClick={linkEvent(this, this.handleRegenCaptcha)}
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
                onInput={linkEvent(
                  this,
                  this.handleRegisterCaptchaAnswerChange,
                )}
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
            src={this.captchaPngSrc(captchaRes)}
            style="border-bottom-right-radius: 0; border-bottom-left-radius: 0;"
            alt={I18NextService.i18n.t("captcha")}
          />
          {captchaRes.wav && (
            <button
              className="rounded-bottom btn btn-sm btn-secondary d-block"
              style="border-top-right-radius: 0; border-top-left-radius: 0;"
              title={I18NextService.i18n.t("play_captcha_audio")}
              onClick={linkEvent(this, this.handleCaptchaPlay)}
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

  async handleRegisterSubmit(i: Signup, event: any) {
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
    } = i.state.form;
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
      });
      switch (registerRes.state) {
        case "failed": {
          toast(registerRes.msg, "danger");
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

            const site = await HttpService.client.getSite();

            if (site.state === "success") {
              UserService.Instance.myUserInfo = site.data.my_user;
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

  handleRegisterUsernameChange(i: Signup, event: any) {
    i.state.form.username = event.target.value.trim();
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Signup, event: any) {
    i.state.form.email = event.target.value;
    if (i.state.form.email === "") {
      i.state.form.email = undefined;
    }
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Signup, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Signup, event: any) {
    i.state.form.password_verify = event.target.value;
    i.setState(i.state);
  }

  handleRegisterShowNsfwChange(i: Signup, event: any) {
    i.state.form.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleRegisterCaptchaAnswerChange(i: Signup, event: any) {
    i.state.form.captcha_answer = event.target.value;
    i.setState(i.state);
  }

  handleAnswerChange(val: string) {
    this.setState(s => ((s.form.answer = val), s));
  }

  handleHoneyPotChange(i: Signup, event: any) {
    i.state.form.honeypot = event.target.value;
    i.setState(i.state);
  }

  async handleRegenCaptcha(i: Signup) {
    i.audio = undefined;
    i.setState({ captchaPlaying: false });
    await i.fetchCaptcha();
  }

  handleCaptchaPlay(i: Signup) {
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

  captchaPngSrc(captcha: CaptchaResponse) {
    return `data:image/png;base64,${captcha.png}`;
  }
}
