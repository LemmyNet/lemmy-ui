import { Component, linkEvent } from "inferno";
import { wsJsonToRes, wsUserOp } from "lemmy-js-client";
import { GetSiteResponse } from "lemmy-js-client/dist/types/GetSiteResponse";
import { ListRegistrationApplications } from "lemmy-js-client/dist/types/ListRegistrationApplications";
import { ListRegistrationApplicationsResponse } from "lemmy-js-client/dist/types/ListRegistrationApplicationsResponse";
import { UserOperation } from "lemmy-js-client/dist/types/others";
import { RegistrationApplicationResponse } from "lemmy-js-client/dist/types/RegistrationApplicationResponse";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  fetchLimit,
  isBrowser,
  myAuth,
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
  listRegistrationApplicationsResponse?: ListRegistrationApplicationsResponse;
  siteRes: GetSiteResponse;
  unreadOrAll: UnreadOrAll;
  page: bigint;
  loading: boolean;
}

export class RegistrationApplications extends Component<
  any,
  RegistrationApplicationsState
> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: RegistrationApplicationsState = {
    siteRes: this.isoData.site_res,
    unreadOrAll: UnreadOrAll.Unread,
    page: 1n,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        listRegistrationApplicationsResponse: this.isoData
          .routeData[0] as ListRegistrationApplicationsResponse,
        loading: false,
      };
    } else {
      this.refetch();
    }
  }

  componentDidMount() {
    setupTippy();
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    let mui = UserService.Instance.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${i18n.t(
          "registration_applications"
        )} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  render() {
    return (
      <div className="container-lg">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div className="row">
            <div className="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
              />
              <h5 className="mb-2">{i18n.t("registration_applications")}</h5>
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
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
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
        <span className="mr-3">{this.unreadOrAllRadios()}</span>
      </div>
    );
  }

  applicationList() {
    let res = this.state.listRegistrationApplicationsResponse;
    return (
      res && (
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
      )
    );
  }

  handleUnreadOrAllChange(i: RegistrationApplications, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), page: 1n });
    i.refetch();
  }

  handlePageChange(page: bigint) {
    this.setState({ page });
    this.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let auth = req.auth;
    if (auth) {
      let form: ListRegistrationApplications = {
        unread_only: true,
        page: 1n,
        limit: fetchLimit,
        auth,
      };
      promises.push(req.client.listRegistrationApplications(form));
    }

    return promises;
  }

  refetch() {
    let unread_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    let auth = myAuth();
    if (auth) {
      let form: ListRegistrationApplications = {
        unread_only: unread_only,
        page: this.state.page,
        limit: fetchLimit,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.listRegistrationApplications(form)
      );
    }
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
      let data = wsJsonToRes<ListRegistrationApplicationsResponse>(msg);
      this.setState({
        listRegistrationApplicationsResponse: data,
        loading: false,
      });
      window.scrollTo(0, 0);
    } else if (op == UserOperation.ApproveRegistrationApplication) {
      let data = wsJsonToRes<RegistrationApplicationResponse>(msg);
      updateRegistrationApplicationRes(
        data.registration_application,
        this.state.listRegistrationApplicationsResponse
          ?.registration_applications
      );
      let uacs = UserService.Instance.unreadApplicationCountSub;
      // Minor bug, where if the application switches from deny to approve, the count will still go down
      uacs.next(uacs.getValue() - 1n);
      this.setState(this.state);
    }
  }
}
