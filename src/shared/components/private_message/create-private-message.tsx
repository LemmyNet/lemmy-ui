import { Component } from "inferno";
import {
  CreatePrivateMessage as CreatePrivateMessageI,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { HttpService, RequestState } from "../../services/HttpService";
import {
  getRecipientIdFromProps,
  isBrowser,
  isInitialRoute,
  myAuth,
  setIsoData,
  toast,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PrivateMessageForm } from "./private-message-form";

interface CreatePrivateMessageState {
  siteRes: GetSiteResponse;
  recipientRes: RequestState<GetPersonDetailsResponse>;
  recipientId: number;
}

export class CreatePrivateMessage extends Component<
  any,
  CreatePrivateMessageState
> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: CreatePrivateMessageState = {
    siteRes: this.isoData.site_res,
    recipientRes: { state: "empty" },
    recipientId: getRecipientIdFromProps(this.props),
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePrivateMessageCreate =
      this.handlePrivateMessageCreate.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        recipientRes: this.isoData.routeData[0],
      };
    }
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.fetchPersonDetails();
    }
  }

  async fetchPersonDetails() {
    this.setState({
      recipientRes: { state: "loading" },
    });

    this.setState({
      recipientRes: await HttpService.client.getPersonDetails({
        person_id: this.state.recipientId,
        sort: "New",
        saved_only: false,
        auth: myAuth(),
      }),
    });
  }

  static fetchInitialData(
    req: InitialFetchRequest
  ): Promise<RequestState<any>>[] {
    const person_id = Number(req.path.split("/").pop());
    const form: GetPersonDetails = {
      person_id,
      sort: "New",
      saved_only: false,
      auth: req.auth,
    };
    return [req.client.getPersonDetails(form)];
  }

  get documentTitle(): string {
    if (this.state.recipientRes.state == "success") {
      const name_ = this.state.recipientRes.data.person_view.person.name;
      return `${i18n.t("create_private_message")} - ${name_}`;
    } else {
      return "";
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  renderRecipientRes() {
    switch (this.state.recipientRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const res = this.state.recipientRes.data;
        return (
          <div className="row">
            <div className="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t("create_private_message")}</h5>
              <PrivateMessageForm
                onCreate={this.handlePrivateMessageCreate}
                recipient={res.person_view.person}
              />
            </div>
          </div>
        );
      }
    }
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.renderRecipientRes()}
      </div>
    );
  }

  async handlePrivateMessageCreate(form: CreatePrivateMessageI) {
    const res = await HttpService.client.createPrivateMessage(form);

    if (res.state == "success") {
      toast(i18n.t("message_sent"));

      // Navigate to the front
      this.context.router.history.push("/");
    }
  }
}
