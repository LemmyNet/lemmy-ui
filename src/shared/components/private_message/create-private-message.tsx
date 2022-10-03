import { None, Option, Some } from "@sniptt/monads";
import { Component } from "inferno";
import {
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
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
  toast,
  wsClient,
  wsSubscribe,
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
  private isoData = setIsoData(this.context, GetPersonDetailsResponse);
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
      this.state = {
        ...this.state,
        recipientDetailsRes: Some(
          this.isoData.routeData[0] as GetPersonDetailsResponse
        ),
        loading: false,
      };
    } else {
      this.fetchPersonDetails();
    }
  }

  fetchPersonDetails() {
    let form = new GetPersonDetails({
      person_id: Some(this.state.recipient_id),
      sort: Some(SortType.New),
      saved_only: Some(false),
      username: None,
      page: None,
      limit: None,
      community_id: None,
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let person_id = Some(Number(req.path.split("/").pop()));
    let form = new GetPersonDetails({
      person_id,
      sort: Some(SortType.New),
      saved_only: Some(false),
      username: None,
      page: None,
      limit: None,
      community_id: None,
      auth: req.auth,
    });
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
      <div className="container-lg">
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
              <div className="row">
                <div className="col-12 col-lg-6 offset-lg-3 mb-4">
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
    this.context.router.history.push("/");
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ loading: false });
      return;
    } else if (op == UserOperation.GetPersonDetails) {
      let data = wsJsonToRes<GetPersonDetailsResponse>(
        msg,
        GetPersonDetailsResponse
      );
      this.setState({ recipientDetailsRes: Some(data), loading: false });
    }
  }
}
