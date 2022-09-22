import { None } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  LoginResponse,
  PasswordChange as PasswordChangeForm,
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
  passwordChangeForm: PasswordChangeForm;
  loading: boolean;
  siteRes: GetSiteResponse;
}

export class PasswordChange extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
    passwordChangeForm: new PasswordChangeForm({
      token: this.props.match.params.token,
      password: undefined,
      password_verify: undefined,
    }),
    loading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView => `${i18n.t("password_change")} - ${siteView.site.name}`,
      none: "",
    });
  }

  render() {
    return (
      <div className="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
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
              value={this.state.passwordChangeForm.password}
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
              value={this.state.passwordChangeForm.password_verify}
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
    i.state.passwordChangeForm.password = event.target.value;
    i.setState(i.state);
  }

  handleVerifyPasswordChange(i: PasswordChange, event: any) {
    i.state.passwordChangeForm.password_verify = event.target.value;
    i.setState(i.state);
  }

  handlePasswordChangeSubmit(i: PasswordChange, event: any) {
    event.preventDefault();
    i.setState({ loading: true });

    WebSocketService.Instance.send(
      wsClient.passwordChange(i.state.passwordChangeForm)
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ loading: false });
      return;
    } else if (op == UserOperation.PasswordChange) {
      let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
      this.setState(this.emptyState);
      UserService.Instance.login(data);
      this.props.history.push("/");
    }
  }
}
