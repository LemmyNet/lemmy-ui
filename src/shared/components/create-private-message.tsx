import { Component } from "inferno";
import { Subscription } from "rxjs";
import { PrivateMessageForm } from "./private-message-form";
import { HtmlTags } from "./html-tags";
import { Spinner } from "./icon";
import { UserService, WebSocketService } from "../services";
import {
  SiteView,
  UserOperation,
  GetPersonDetailsResponse,
  PersonViewSafe,
  SortType,
  GetPersonDetails,
} from "lemmy-js-client";
import {
  authField,
  getRecipientIdFromProps,
  isBrowser,
  setIsoData,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../utils";
import { i18n } from "../i18next";
import { InitialFetchRequest } from "shared/interfaces";

interface CreatePrivateMessageState {
  site_view: SiteView;
  recipient: PersonViewSafe;
  recipient_id: number;
  loading: boolean;
}

export class CreatePrivateMessage extends Component<
  any,
  CreatePrivateMessageState
> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreatePrivateMessageState = {
    site_view: this.isoData.site_res.site_view,
    recipient: undefined,
    recipient_id: getRecipientIdFromProps(this.props),
    loading: true,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handlePrivateMessageCreate = this.handlePrivateMessageCreate.bind(
      this
    );

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (!UserService.Instance.localUserView) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.recipient = this.isoData.routeData[0].user;
      this.state.loading = false;
    } else {
      this.fetchPersonDetails();
    }
  }

  fetchPersonDetails() {
    let form: GetPersonDetails = {
      person_id: this.state.recipient_id,
      sort: SortType.New,
      saved_only: false,
      auth: authField(false),
    };
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let person_id = Number(req.path.split("/").pop());
    let form: GetPersonDetails = {
      person_id,
      sort: SortType.New,
      saved_only: false,
      auth: req.auth,
    };
    return [req.client.getPersonDetails(form)];
  }

  get documentTitle(): string {
    return `${i18n.t("create_private_message")} - ${
      this.state.site_view.site.name
    }`;
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t("create_private_message")}</h5>
              <PrivateMessageForm
                onCreate={this.handlePrivateMessageCreate}
                recipient={this.state.recipient.person}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  handlePrivateMessageCreate() {
    toast(i18n.t("message_sent"));

    // Navigate to the front
    this.context.router.history.push(`/`);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.GetPersonDetails) {
      let data = wsJsonToRes<GetPersonDetailsResponse>(msg).data;
      this.state.recipient = data.person_view;
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
