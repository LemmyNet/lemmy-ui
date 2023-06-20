import { Component, linkEvent } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { HttpService } from "../../services/HttpService";
import {
  capitalizeFirstLetter,
  isBrowser,
  setIsoData,
  toast,
  validEmail,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  form: {
    email: string;
  };
  loading: boolean;
  siteRes: GetSiteResponse;
}

export class LoginReset extends Component<any, State> {
  private isoData = setIsoData(this.context);

  state: State = {
    form: {
      email: "",
    },
    loading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    if (UserService.Instance.myUserInfo) {
      this.context.router.history.push("/");
    }
  }

  get documentTitle(): string {
    return `${capitalizeFirstLetter(i18n.t("forgot_password"))} - ${
      this.state.siteRes.site_view.site.name
    }`;
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
        <div className="col-12 col-lg-6 m-auto">{this.loginResetForm()}</div>
      </div>
    );
  }

  loginResetForm() {
    return (
      <form onSubmit={linkEvent(this, this.handlePasswordReset)}>
        <h5>{capitalizeFirstLetter(i18n.t("forgot_password"))}</h5>

        <div className="form-group row">
          <label className="col-form-label col-sm-10">
            {i18n.t("no_password_reset")}
          </label>
        </div>

        <div className="form-group row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="login-email-or-username"
          >
            {i18n.t("email")}
          </label>

          <div className="col-sm-10">
            <input
              type="text"
              className="form-control"
              id="login-email-or-username"
              value={this.state.form.email}
              onInput={linkEvent(this, this.handleEmailInputChange)}
              autoComplete="email"
              required
              minLength={3}
            />
          </div>
        </div>

        <div className="form-group row">
          <div className="col-sm-10">
            <button
              type="button"
              onClick={linkEvent(this, this.handlePasswordReset)}
              className="btn btn-secondary"
              disabled={
                !validEmail(this.state.form.email) || this.state.loading
              }
            >
              {this.state.loading ? <Spinner /> : i18n.t("reset_password")}
            </button>
          </div>
        </div>
      </form>
    );
  }

  handleEmailInputChange(i: LoginReset, event: any) {
    i.state.form.email = event.target.value.trim();
    i.setState(i.state);
  }

  async handlePasswordReset(i: LoginReset, event: any) {
    event.preventDefault();

    const email = i.state.form.email;

    if (email && validEmail(email)) {
      i.setState({ loading: true });

      const res = await HttpService.client.passwordReset({ email });

      if (res.state == "success") {
        toast(i18n.t("reset_password_mail_sent"));
        this.context.router.history.push("/login");
      }

      i.setState({ loading: false });
    }
  }
}
