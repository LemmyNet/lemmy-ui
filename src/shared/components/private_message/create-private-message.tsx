import { getRecipientIdFromProps, myAuth, setIsoData } from "@utils/app";
import { RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import {
  CreatePrivateMessage as CreatePrivateMessageI,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
} from "lemmy-js-client";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PrivateMessageForm } from "./private-message-form";

type CreatePrivateMessageData = RouteDataResponse<{
  recipientDetailsResponse: GetPersonDetailsResponse;
}>;

interface CreatePrivateMessageState {
  siteRes: GetSiteResponse;
  recipientRes: RequestState<GetPersonDetailsResponse>;
  recipientId: number;
  isIsomorphic: boolean;
}

export class CreatePrivateMessage extends Component<
  any,
  CreatePrivateMessageState
> {
  private isoData = setIsoData<CreatePrivateMessageData>(this.context);
  state: CreatePrivateMessageState = {
    siteRes: this.isoData.site_res,
    recipientRes: { state: "empty" },
    recipientId: getRecipientIdFromProps(this.props),
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePrivateMessageCreate =
      this.handlePrivateMessageCreate.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      this.state = {
        ...this.state,
        recipientRes: this.isoData.routeData.recipientDetailsResponse,
        isIsomorphic: true,
      };
    }
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.fetchPersonDetails();
    }
  }

  static async fetchInitialData({
    client,
    path,
    auth,
  }: InitialFetchRequest): Promise<CreatePrivateMessageData> {
    const person_id = Number(path.split("/").pop());

    const form: GetPersonDetails = {
      person_id,
      sort: "New",
      saved_only: false,
      auth,
    };

    return {
      recipientDetailsResponse: await client.getPersonDetails(form),
    };
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

  get documentTitle(): string {
    if (this.state.recipientRes.state == "success") {
      const name_ = this.state.recipientRes.data.person_view.person.name;
      return `${I18NextService.i18n.t("create_private_message")} - ${name_}`;
    } else {
      return "";
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
              <h5>{I18NextService.i18n.t("create_private_message")}</h5>
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
      <div className="create-private-message container-lg">
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
      toast(I18NextService.i18n.t("message_sent"));

      // Navigate to the front
      this.context.router.history.push("/");
    }
  }
}
