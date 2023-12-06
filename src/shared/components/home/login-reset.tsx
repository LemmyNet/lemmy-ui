import { capitalizeFirstLetter, validEmail } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { IsoData } from "../../interfaces";

interface State {
  form: {
    email: string;
    loading: boolean;
  };
  siteRes: GetSiteResponse;
}

export class LoginReset extends Component<any, State> {
  get isoData(): IsoData {
    return this.context.store.getState().value;
  }

  state: State = {
    form: {
      email: "",
      loading: false,
    },
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  get documentTitle(): string {
    return `${capitalizeFirstLetter(
      I18NextService.i18n.t("forgot_password"),
    )} - ${this.state.siteRes.site_view.site.name}`;
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="col-12 col-lg-6 col-md-8 m-auto">
          {this.loginResetForm()}
        </div>
      </div>
    );
  }

  loginResetForm() {
    return (
      <form onSubmit={linkEvent(this, this.handlePasswordReset)}>
        <h1 className="h4 mb-4">
          {capitalizeFirstLetter(I18NextService.i18n.t("forgot_password"))}
        </h1>

        <div className="form-group row">
          <label className="col-form-label">
            {I18NextService.i18n.t("no_password_reset")}
          </label>
        </div>

        <div className="form-group row mt-2">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="login-reset-email"
          >
            {I18NextService.i18n.t("email")}
          </label>

          <div className="col-sm-10">
            <input
              type="text"
              className="form-control"
              id="login-reset-email"
              value={this.state.form.email}
              onInput={linkEvent(this, this.handleEmailInputChange)}
              autoComplete="email"
              required
              minLength={3}
            />
          </div>
        </div>

        <div className="form-group row mt-3">
          <div className="col-sm-10">
            <button
              type="button"
              onClick={linkEvent(this, this.handlePasswordReset)}
              className="btn btn-secondary"
              disabled={
                !validEmail(this.state.form.email) || this.state.form.loading
              }
            >
              {this.state.form.loading ? (
                <Spinner />
              ) : (
                I18NextService.i18n.t("reset_password")
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  handleEmailInputChange(i: LoginReset, event: any) {
    i.setState(s => ((s.form.email = event.target.value.trim()), s));
  }

  async handlePasswordReset(i: LoginReset, event: any) {
    event.preventDefault();

    const email = i.state.form.email;

    if (email && validEmail(email)) {
      i.setState(s => ((s.form.loading = true), s));

      const res = await HttpService.client.passwordReset({ email });

      if (res.state === "success") {
        toast(I18NextService.i18n.t("reset_password_mail_sent"));
        i.context.router.history.push("/login");
      }

      i.setState(s => ((s.form.loading = false), s));
    }
  }
}
