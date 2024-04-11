import { setIsoData } from "@utils/app";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { GetSiteResponse, SuccessResponse } from "lemmy-js-client";
import { HttpService, I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import PasswordInput from "../common/password-input";
import { toast } from "../../toast";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { RouteComponentProps } from "inferno-router/dist/Route";

interface State {
  passwordChangeRes: RequestState<SuccessResponse>;
  form: {
    token: string;
    password?: string;
    password_verify?: string;
  };
  siteRes: GetSiteResponse;
}

@simpleScrollMixin
export class PasswordChange extends Component<
  RouteComponentProps<Record<string, never>>,
  State
> {
  private isoData = setIsoData(this.context);

  state: State = {
    passwordChangeRes: EMPTY_REQUEST,
    siteRes: this.isoData.site_res,
    form: {
      token: this.props.match.params.token,
    },
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("password_change")} - ${
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
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("password_change")}
            </h1>
            {this.passwordChangeForm()}
          </div>
        </div>
      </div>
    );
  }

  passwordChangeForm() {
    return (
      <form onSubmit={linkEvent(this, this.handlePasswordChangeSubmit)}>
        <div className="mb-3">
          <PasswordInput
            id="new-password"
            value={this.state.form.password}
            onInput={linkEvent(this, this.handlePasswordChange)}
            showStrength
            label={I18NextService.i18n.t("new_password")}
            isNew
          />
        </div>
        <div className="mb-3">
          <PasswordInput
            id="password"
            value={this.state.form.password_verify}
            onInput={linkEvent(this, this.handleVerifyPasswordChange)}
            label={I18NextService.i18n.t("verify_password")}
          />
        </div>
        <div className="mb-3 row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.passwordChangeRes.state === "loading" ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
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
    i.setState({ passwordChangeRes: LOADING_REQUEST });

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
        toast(I18NextService.i18n.t("password_changed"));

        const site = await HttpService.client.getSite();
        if (site.state === "success") {
          UserService.Instance.myUserInfo = site.data.my_user;
        }

        i.props.history.replace("/");
      }
    }
  }
}
