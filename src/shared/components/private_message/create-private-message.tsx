import { Component } from "inferno";
import {
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  getRecipientIdFromProps,
  isBrowser,
  myAuth,
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
  recipientDetailsRes?: GetPersonDetailsResponse;
  recipient_id: number;
  loading: boolean;
}

export class CreatePrivateMessage extends Component<
  any,
  CreatePrivateMessageState
> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: CreatePrivateMessageState = {
    siteRes: this.isoData.site_res,
    recipient_id: getRecipientIdFromProps(this.props),
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePrivateMessageCreate =
      this.handlePrivateMessageCreate.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        recipientDetailsRes: this.isoData
          .routeData[0] as GetPersonDetailsResponse,
        loading: false,
      };
    } else {
      this.fetchPersonDetails();
    }
  }

  fetchPersonDetails() {
    let form: GetPersonDetails = {
      person_id: this.state.recipient_id,
      sort: "New",
      saved_only: false,
      auth: myAuth(false),
    };
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let person_id = Number(req.path.split("/").pop());
    let form: GetPersonDetails = {
      person_id,
      sort: "New",
      saved_only: false,
      auth: req.auth,
    };
    return [req.client.getPersonDetails(form)];
  }

  get documentTitle(): string {
    let name_ = this.state.recipientDetailsRes?.person_view.person.name;
    return name_ ? `${i18n.t("create_private_message")} - ${name_}` : "";
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  render() {
    let res = this.state.recipientDetailsRes;
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          res && (
            <div className="row">
              <div className="col-12 col-lg-6 offset-lg-3 mb-4">
                <h5>{i18n.t("create_private_message")}</h5>
                <PrivateMessageForm
                  onCreate={this.handlePrivateMessageCreate}
                  recipient={res.person_view.person}
                />
              </div>
            </div>
          )
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
      let data = wsJsonToRes<GetPersonDetailsResponse>(msg);
      this.setState({ recipientDetailsRes: data, loading: false });
    }
  }
}
