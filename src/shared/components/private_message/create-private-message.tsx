import { None, Option, Some } from "@sniptt/monads";
import { Component } from "inferno";
import {
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  getRecipientIdFromProps,
  isBrowser,
  setIsoData,
  setOptionalAuth,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PrivateMessageForm } from "./private-message-form";

interface CreatePrivateMessageState {
  siteRes: GetSiteResponse;
  recipientDetailsRes: Option<GetPersonDetailsResponse>;
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
    siteRes: this.isoData.site_res,
    recipientDetailsRes: None,
    recipient_id: getRecipientIdFromProps(this.props),
    loading: true,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handlePrivateMessageCreate =
      this.handlePrivateMessageCreate.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (UserService.Instance.myUserInfo.isNone() && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.recipientDetailsRes = Some(this.isoData.routeData[0]);
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
      auth: auth(false),
    };
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let person_id = Number(req.path.split("/").pop());
    let form: GetPersonDetails = {
      person_id,
      sort: SortType.New,
      saved_only: false,
    };
    setOptionalAuth(form, req.auth);
    return [req.client.getPersonDetails(form)];
  }

  get documentTitle(): string {
    return this.state.recipientDetailsRes.match({
      some: res =>
        `${i18n.t("create_private_message")} - ${res.person_view.person.name}`,
      none: "",
    });
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
          description={None}
          image={None}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          this.state.recipientDetailsRes.match({
            some: res => (
              <div class="row">
                <div class="col-12 col-lg-6 offset-lg-3 mb-4">
                  <h5>{i18n.t("create_private_message")}</h5>
                  <PrivateMessageForm
                    privateMessageView={None}
                    onCreate={this.handlePrivateMessageCreate}
                    recipient={res.person_view.person}
                  />
                </div>
              </div>
            ),
            none: <></>,
          })
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
      this.state.recipientDetailsRes = Some(data);
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
