import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  ListRegistrationApplications,
  ListRegistrationApplicationsResponse,
  RegistrationApplicationResponse,
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
  fetchLimit,
  isBrowser,
  setIsoData,
  setupTippy,
  toast,
  updateRegistrationApplicationRes,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { RegistrationApplication } from "../common/registration-application";

enum UnreadOrAll {
  Unread,
  All,
}

interface RegistrationApplicationsState {
  listRegistrationApplicationsResponse: Option<ListRegistrationApplicationsResponse>;
  siteRes: GetSiteResponse;
  unreadOrAll: UnreadOrAll;
  page: number;
  loading: boolean;
}

export class RegistrationApplications extends Component<
  any,
  RegistrationApplicationsState
> {
  private isoData = setIsoData(
    this.context,
    ListRegistrationApplicationsResponse
  );
  private subscription: Subscription;
  private emptyState: RegistrationApplicationsState = {
    listRegistrationApplicationsResponse: None,
    siteRes: this.isoData.site_res,
    unreadOrAll: UnreadOrAll.Unread,
    page: 1,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    if (UserService.Instance.myUserInfo.isNone() && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.listRegistrationApplicationsResponse = Some(
        this.isoData.routeData[0] as ListRegistrationApplicationsResponse
      );
      this.state.loading = false;
    } else {
      this.refetch();
    }
  }

  componentDidMount() {
    setupTippy();
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView =>
        UserService.Instance.myUserInfo.match({
          some: mui =>
            `@${mui.local_user_view.person.name} ${i18n.t(
              "registration_applications"
            )} - ${siteView.site.name}`,
          none: "",
        }),
      none: "",
    });
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                description={None}
                image={None}
              />
              <h5 class="mb-2">{i18n.t("registration_applications")}</h5>
              {this.selects()}
              {this.applicationList()}
              <Paginator
                page={this.state.page}
                onChange={this.handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  unreadOrAllRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.Unread && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.Unread}
            checked={this.state.unreadOrAll == UnreadOrAll.Unread}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("unread")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.All && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.All}
            checked={this.state.unreadOrAll == UnreadOrAll.All}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("all")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span class="mr-3">{this.unreadOrAllRadios()}</span>
      </div>
    );
  }

  applicationList() {
    return this.state.listRegistrationApplicationsResponse.match({
      some: res => (
        <div>
          {res.registration_applications.map(ra => (
            <>
              <hr />
              <RegistrationApplication
                key={ra.registration_application.id}
                application={ra}
              />
            </>
          ))}
        </div>
      ),
      none: <></>,
    });
  }

  handleUnreadOrAllChange(i: RegistrationApplications, event: any) {
    i.state.unreadOrAll = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  handlePageChange(page: number) {
    this.setState({ page });
    this.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let form = new ListRegistrationApplications({
      unread_only: Some(true),
      page: Some(1),
      limit: Some(fetchLimit),
      auth: req.auth.unwrap(),
    });
    promises.push(req.client.listRegistrationApplications(form));

    return promises;
  }

  refetch() {
    let unread_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    let form = new ListRegistrationApplications({
      unread_only: Some(unread_only),
      page: Some(this.state.page),
      limit: Some(fetchLimit),
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.listRegistrationApplications(form));
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      this.refetch();
    } else if (op == UserOperation.ListRegistrationApplications) {
      let data = wsJsonToRes<ListRegistrationApplicationsResponse>(
        msg,
        ListRegistrationApplicationsResponse
      );
      this.state.listRegistrationApplicationsResponse = Some(data);
      this.state.loading = false;
      window.scrollTo(0, 0);
      this.setState(this.state);
    } else if (op == UserOperation.ApproveRegistrationApplication) {
      let data = wsJsonToRes<RegistrationApplicationResponse>(
        msg,
        RegistrationApplicationResponse
      );
      updateRegistrationApplicationRes(
        data.registration_application,
        this.state.listRegistrationApplicationsResponse
          .map(r => r.registration_applications)
          .unwrapOr([])
      );
      let uacs = UserService.Instance.unreadApplicationCountSub;
      // Minor bug, where if the application switches from deny to approve, the count will still go down
      uacs.next(uacs.getValue() - 1);
      this.setState(this.state);
    }
  }
}
