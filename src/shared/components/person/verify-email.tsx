import { Component } from "inferno";
import {
  SiteView,
  UserOperation,
  VerifyEmail as VerifyEmailForm,
  VerifyEmailResponse,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  isBrowser,
  setIsoData,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";

interface State {
  verifyEmailForm: VerifyEmailForm;
  site_view: SiteView;
}

export class VerifyEmail extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
    verifyEmailForm: {
      token: this.props.match.params.token,
    },
    site_view: this.isoData.site_res.site_view,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentDidMount() {
    WebSocketService.Instance.send(
      wsClient.verifyEmail(this.state.verifyEmailForm)
    );
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("verify_email")} - ${this.state.site_view.site.name}`;
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div class="row">
          <div class="col-12 col-lg-6 offset-lg-3 mb-4">
            <h5>{i18n.t("verify_email")}</h5>
          </div>
        </div>
      </div>
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState(this.state);
      this.props.history.push("/");
      return;
    } else if (op == UserOperation.VerifyEmail) {
      let data = wsJsonToRes<VerifyEmailResponse>(msg).data;
      if (data) {
        toast(i18n.t("email_verified"));
        this.state = this.emptyState;
        this.setState(this.state);
        this.props.history.push("/login");
      }
    }
  }
}
