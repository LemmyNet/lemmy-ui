import { Component, linkEvent } from "inferno";
import {
  ListRegistrationApplications,
  ListRegistrationApplicationsResponse,
  RegistrationApplicationResponse,
  RegistrationApplicationView,
  SiteView,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  fetchLimit,
  isBrowser,
  setIsoData,
  setupTippy,
  toast,
  updateRegistrationApplicationRes,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
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
  applications: RegistrationApplicationView[];
  page: number;
  site_view: SiteView;
  unreadOrAll: UnreadOrAll;
  loading: boolean;
}

export class RegistrationApplications extends Component<
  any,
  RegistrationApplicationsState
> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: RegistrationApplicationsState = {
    unreadOrAll: UnreadOrAll.Unread,
    applications: [],
    page: 1,
    site_view: this.isoData.site_res.site_view,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.applications =
        this.isoData.routeData[0].registration_applications || []; // TODO test
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
    return `@${
      UserService.Instance.myUserInfo.local_user_view.person.name
    } ${i18n.t("registration_applications")} - ${
      this.state.site_view.site.name
    }`;
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
    return (
      <div>
        {this.state.applications.map(ra => (
          <>
            <hr />
            <RegistrationApplication
              key={ra.registration_application.id}
              application={ra}
            />
          </>
        ))}
      </div>
    );
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

    let form: ListRegistrationApplications = {
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.listRegistrationApplications(form));

    return promises;
  }

  refetch() {
    let unread_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    let form: ListRegistrationApplications = {
      unread_only: unread_only,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(),
    };
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
      let data = wsJsonToRes<ListRegistrationApplicationsResponse>(msg).data;
      this.state.applications = data.registration_applications;
      this.state.loading = false;
      window.scrollTo(0, 0);
      this.setState(this.state);
    } else if (op == UserOperation.ApproveRegistrationApplication) {
      let data = wsJsonToRes<RegistrationApplicationResponse>(msg).data;
      updateRegistrationApplicationRes(
        data.registration_application,
        this.state.applications
      );
      let uacs = UserService.Instance.unreadApplicationCountSub;
      // Minor bug, where if the application switches from deny to approve, the count will still go down
      uacs.next(uacs.getValue() - 1);
      this.setState(this.state);
    }
  }
}
