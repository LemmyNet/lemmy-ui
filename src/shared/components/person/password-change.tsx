import { Component, linkEvent } from "inferno";
import { GetSiteResponse, LoginResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { HttpService, UserService } from "../../services";
import { RequestState } from "../../services/HttpService";
import { capitalizeFirstLetter, myAuth, setIsoData } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  passwordChangeRes: RequestState<LoginResponse>;
  form: {
    token: string;
    password?: string;
    password_verify?: string;
  };
  siteRes: GetSiteResponse;
}

export class PasswordChange extends Component<any, State> {
  private isoData = setIsoData(this.context);

  state: State = {
    passwordChangeRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    form: {
      token: this.props.match.params.token,
    },
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  get documentTitle(): string {
    return `${i18n.t("password_change")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="password-change container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="password-form__wrap row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h5>{i18n.t("password_change")}</h5>
            {this.passwordChangeForm()}
          </div>
        </div>
      </div>
    );
  }

  passwordChangeForm() {
    return (
      <form onSubmit={linkEvent(this, this.handlePasswordChangeSubmit)}>
        <div className="password-form__row password-form__row--password mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="new-password">
            {i18n.t("new_password")}
          </label>
          <div className="col-sm-10">
            <input
              id="new-password"
              type="password"
              value={this.state.form.password}
              onInput={linkEvent(this, this.handlePasswordChange)}
              className="form-control"
              required
              maxLength={60}
            />
          </div>
        </div>
        <div className="password-form__row password-form__row--verifypass mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="verify-password">
            {i18n.t("verify_password")}
          </label>
          <div className="col-sm-10">
            <input
              id="verify-password"
              type="password"
              value={this.state.form.password_verify}
              onInput={linkEvent(this, this.handleVerifyPasswordChange)}
              className="form-control"
              required
              maxLength={60}
            />
          </div>
        </div>
        <div className="password-form__row password-form__row--btns mb-3 row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.passwordChangeRes.state == "loading" ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  handlePasswordChange(i: PasswordChange, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }

  handleVerifyPasswordChange(i: PasswordChange, event: any) {
    i.state.form.password_verify = event.target.value;
    i.setState(i.state);
  }

  async handlePasswordChangeSubmit(i: PasswordChange, event: any) {
    event.preventDefault();
    i.setState({ passwordChangeRes: { state: "loading" } });

    const password = i.state.form.password;
    const password_verify = i.state.form.password_verify;

    if (password && password_verify) {
      i.setState({
        passwordChangeRes: await HttpService.client.passwordChangeAfterReset({
          token: i.state.form.token,
          password,
          password_verify,
        }),
      });

      if (i.state.passwordChangeRes.state === "success") {
        const data = i.state.passwordChangeRes.data;
        UserService.Instance.login(data);

        const site = await HttpService.client.getSite({ auth: myAuth() });
        if (site.state === "success") {
          UserService.Instance.myUserInfo = site.data.my_user;
        }

        i.props.history.replace("/");
      }
    }
  }
}
