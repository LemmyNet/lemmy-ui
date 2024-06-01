import { getRecipientIdFromProps, setIsoData } from "@utils/app";
import { RouteDataResponse } from "@utils/types";
import { Component } from "inferno";
import {
  CreatePrivateMessage as CreatePrivateMessageI,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  LemmyHttp,
} from "lemmy-js-client";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PrivateMessageForm } from "./private-message-form";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "../../routes";
import { resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { isBrowser } from "@utils/browser";

type CreatePrivateMessageData = RouteDataResponse<{
  recipientDetailsResponse: GetPersonDetailsResponse;
}>;

interface CreatePrivateMessageState {
  siteRes: GetSiteResponse;
  recipientRes: RequestState<GetPersonDetailsResponse>;
  recipientId: number;
  isIsomorphic: boolean;
}

type CreatePrivateMessagePathProps = { recipient_id: string };
type CreatePrivateMessageRouteProps =
  RouteComponentProps<CreatePrivateMessagePathProps> & Record<string, never>;
export type CreatePrivateMessageFetchConfig = IRoutePropsWithFetch<
  CreatePrivateMessageData,
  CreatePrivateMessagePathProps,
  Record<string, never>
>;

@scrollMixin
export class CreatePrivateMessage extends Component<
  CreatePrivateMessageRouteProps,
  CreatePrivateMessageState
> {
  private isoData = setIsoData<CreatePrivateMessageData>(this.context);
  state: CreatePrivateMessageState = {
    siteRes: this.isoData.site_res,
    recipientRes: EMPTY_REQUEST,
    recipientId: getRecipientIdFromProps(this.props),
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.recipientRes]);
  }

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

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.fetchPersonDetails();
    }
  }

  static async fetchInitialData({
    headers,
    match,
  }: InitialFetchRequest<CreatePrivateMessagePathProps>): Promise<CreatePrivateMessageData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const person_id = getRecipientIdFromProps({ match });

    const form: GetPersonDetails = {
      person_id,
      sort: "New",
      saved_only: false,
    };

    return {
      recipientDetailsResponse: await client.getPersonDetails(form),
    };
  }

  async fetchPersonDetails() {
    this.setState({
      recipientRes: LOADING_REQUEST,
    });

    this.setState({
      recipientRes: await HttpService.client.getPersonDetails({
        person_id: this.state.recipientId,
        sort: "New",
        saved_only: false,
      }),
    });
  }

  get documentTitle(): string {
    if (this.state.recipientRes.state === "success") {
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
              <h1 className="h4 mb-4">
                {I18NextService.i18n.t("create_private_message")}
              </h1>
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

  async handlePrivateMessageCreate(
    form: CreatePrivateMessageI,
  ): Promise<boolean> {
    const res = await HttpService.client.createPrivateMessage(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("message_sent"));

      // Navigate to the front
      this.context.router.history.push("/");
    } else if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.message), "danger");
    }

    return res.state !== "failed";
  }
}
