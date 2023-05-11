import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  LoginResponse,
  PasswordChangeAfterReset,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  capitalizeFirstLetter,
  isBrowser,
  setIsoData,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  form: {
    token: string;
    password?: string;
    password_verify?: string;
  };
  loading: boolean;
  siteRes: GetSiteResponse;
}

export class PasswordChange extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;

  state: State = {
    form: {
      token: this.props.match.params.token,
    },
    loading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("password_change")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
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
        <div className="form-group row">
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
        <div className="form-group row">
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
        <div className="form-group row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.loading ? (
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

  handlePasswordChangeSubmit(i: PasswordChange, event: any) {
    event.preventDefault();
    i.setState({ loading: true });

    let password = i.state.form.password;
    let password_verify = i.state.form.password_verify;

    if (password && password_verify) {
      let form: PasswordChangeAfterReset = {
        token: i.state.form.token,
        password,
        password_verify,
      };

      WebSocketService.Instance.send(wsClient.passwordChange(form));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ loading: false });
      return;
    } else if (op == UserOperation.PasswordChangeAfterReset) {
      let data = wsJsonToRes<LoginResponse>(msg);
      UserService.Instance.login(data);
      this.props.history.push("/");
      location.reload();
    }
  }
}
