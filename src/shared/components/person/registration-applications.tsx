import {
  editRegistrationApplication,
  myAuthRequired,
  setIsoData,
} from "@utils/app";
import { randomStr } from "@utils/helpers";
import { RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import {
  ApproveRegistrationApplication,
  GetSiteResponse,
  ListRegistrationApplicationsResponse,
  RegistrationApplicationView,
} from "lemmy-js-client";
import { fetchLimit } from "../../config";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { setupTippy } from "../../tippy";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { RegistrationApplication } from "../common/registration-application";

enum UnreadOrAll {
  Unread,
  All,
}

enum SortOrder {
  Asc,
  Desc,
}

type RegistrationApplicationsData = RouteDataResponse<{
  listRegistrationApplicationsResponse: ListRegistrationApplicationsResponse;
}>;

interface RegistrationApplicationsState {
  appsRes: RequestState<ListRegistrationApplicationsResponse>;
  siteRes: GetSiteResponse;
  unreadOrAll: UnreadOrAll;
  sortOrder: SortOrder;
  page: number;
  isIsomorphic: boolean;
}

export class RegistrationApplications extends Component<
  any,
  RegistrationApplicationsState
> {
  private isoData = setIsoData<RegistrationApplicationsData>(this.context);
  state: RegistrationApplicationsState = {
    appsRes: { state: "empty" },
    siteRes: this.isoData.site_res,
    unreadOrAll: UnreadOrAll.Unread,
    sortOrder: SortOrder.Asc,
    page: 1,
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleApproveApplication = this.handleApproveApplication.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      this.state = {
        ...this.state,
        appsRes: this.isoData.routeData.listRegistrationApplicationsResponse,
        isIsomorphic: true,
      };
    }
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.refetch();
    }
    setupTippy();
  }

  get documentTitle(): string {
    const mui = UserService.Instance.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${I18NextService.i18n.t(
          "registration_applications",
        )} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  renderApps() {
    switch (this.state.appsRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const apps = this.state.appsRes.data.registration_applications;

        apps.sort((a, b) =>
          this.state.sortOrder === SortOrder.Asc
            ? a.registration_application.published.localeCompare(
                b.registration_application.published,
                undefined,
                { numeric: true },
              )
            : b.registration_application.published.localeCompare(
                a.registration_application.published,
                undefined,
                { numeric: true },
              ),
        );

        return (
          <div className="row">
            <div className="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
              />
              <h1 className="h4 mb-4">
                {I18NextService.i18n.t("registration_applications")}
              </h1>
              {this.selects()}
              {this.applicationList(apps)}
              <Paginator
                page={this.state.page}
                onChange={this.handlePageChange}
              />
            </div>
          </div>
        );
      }
    }
  }

  render() {
    return (
      <div className="registration-applications container-lg">
        {this.renderApps()}
      </div>
    );
  }

  unreadOrAllRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
        <input
          id={`${radioId}-unread`}
          type="radio"
          className="btn-check"
          value={UnreadOrAll.Unread}
          checked={this.state.unreadOrAll === UnreadOrAll.Unread}
          onChange={linkEvent(this, this.handleUnreadOrAllChange)}
        />
        <label
          htmlFor={`${radioId}-unread`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.unreadOrAll === UnreadOrAll.Unread,
          })}
        >
          {I18NextService.i18n.t("unread")}
        </label>

        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={UnreadOrAll.All}
          checked={this.state.unreadOrAll === UnreadOrAll.All}
          onChange={linkEvent(this, this.handleUnreadOrAllChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.unreadOrAll === UnreadOrAll.All,
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>
      </div>
    );
  }

  sortOrderRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
        <input
          id={`${radioId}-asc`}
          type="radio"
          className="btn-check"
          value={SortOrder.Asc}
          checked={this.state.sortOrder === SortOrder.Asc}
          onChange={linkEvent(this, this.handleSortChange)}
        />
        <label
          htmlFor={`${radioId}-asc`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.sortOrder === SortOrder.Asc,
          })}
        >
          {I18NextService.i18n.t("old")}
        </label>

        <input
          id={`${radioId}-desc`}
          type="radio"
          className="btn-check"
          value={SortOrder.Desc}
          checked={this.state.sortOrder === SortOrder.Desc}
          onChange={linkEvent(this, this.handleSortChange)}
        />
        <label
          htmlFor={`${radioId}-desc`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.sortOrder === SortOrder.Desc,
          })}
        >
          {I18NextService.i18n.t("new")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span className="me-3">{this.unreadOrAllRadios()}</span>
        <span className="me-3">{this.sortOrderRadios()}</span>
      </div>
    );
  }

  applicationList(apps: RegistrationApplicationView[]) {
    return (
      <div>
        {apps.map(ra => (
          <>
            <hr />
            <RegistrationApplication
              key={ra.registration_application.id}
              application={ra}
              onApproveApplication={this.handleApproveApplication}
            />
          </>
        ))}
      </div>
    );
  }

  handleUnreadOrAllChange(i: RegistrationApplications, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), page: 1 });
    i.refetch();
  }

  handleSortChange(i: RegistrationApplications, event: any) {
    i.setState({ sortOrder: Number(event.target.value), page: 1 });
    i.refetch();
  }

  handlePageChange(page: number) {
    this.setState({ page });
    this.refetch();
  }

  static async fetchInitialData({
    auth,
    client,
  }: InitialFetchRequest): Promise<RegistrationApplicationsData> {
    return {
      listRegistrationApplicationsResponse: auth
        ? await client.listRegistrationApplications({
            unread_only: true,
            page: 1,
            limit: fetchLimit,
            auth: auth as string,
          })
        : { state: "empty" },
    };
  }

  async refetch() {
    const unread_only = this.state.unreadOrAll === UnreadOrAll.Unread;
    this.setState({
      appsRes: { state: "loading" },
    });

    this.setState({
      appsRes: await HttpService.client.listRegistrationApplications({
        unread_only: unread_only,
        page: this.state.page,
        limit: fetchLimit,
        auth: myAuthRequired(),
      }),
    });
  }

  async handleApproveApplication(form: ApproveRegistrationApplication) {
    const approveRes = await HttpService.client.approveRegistrationApplication(
      form,
    );
    this.setState(s => {
      if (s.appsRes.state === "success" && approveRes.state === "success") {
        s.appsRes.data.registration_applications = editRegistrationApplication(
          approveRes.data.registration_application,
          s.appsRes.data.registration_applications,
        );
      }
      return s;
    });
  }
}
