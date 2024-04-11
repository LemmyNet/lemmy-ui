import { editRegistrationApplication, setIsoData } from "@utils/app";
import { randomStr } from "@utils/helpers";
import { RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import {
  ApproveRegistrationApplication,
  GetSiteResponse,
  LemmyHttp,
  ListRegistrationApplicationsResponse,
  RegistrationApplicationView,
} from "lemmy-js-client";
import { fetchLimit } from "../../config";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { RegistrationApplication } from "../common/registration-application";
import { UnreadCounterService } from "../../services";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "../../routes";

enum RegistrationState {
  Unread,
  All,
  Denied,
}

type RegistrationApplicationsData = RouteDataResponse<{
  listRegistrationApplicationsResponse: ListRegistrationApplicationsResponse;
}>;

interface RegistrationApplicationsState {
  appsRes: RequestState<ListRegistrationApplicationsResponse>;
  siteRes: GetSiteResponse;
  registrationState: RegistrationState;
  page: number;
  isIsomorphic: boolean;
}

type RegistrationApplicationsRouteProps = RouteComponentProps<
  Record<string, never>
> &
  Record<string, never>;
export type RegistrationApplicationsFetchConfig = IRoutePropsWithFetch<
  RegistrationApplicationsData,
  Record<string, never>,
  Record<string, never>
>;

export class RegistrationApplications extends Component<
  RegistrationApplicationsRouteProps,
  RegistrationApplicationsState
> {
  private isoData = setIsoData<RegistrationApplicationsData>(this.context);
  state: RegistrationApplicationsState = {
    appsRes: EMPTY_REQUEST,
    siteRes: this.isoData.site_res,
    registrationState: RegistrationState.Unread,
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
                nextDisabled={fetchLimit > apps.length}
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

  RegistrationStateRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
        <input
          id={`${radioId}-unread`}
          type="radio"
          className="btn-check"
          value={RegistrationState.Unread}
          checked={this.state.registrationState === RegistrationState.Unread}
          onChange={linkEvent(this, this.handleRegistrationStateChange)}
        />
        <label
          htmlFor={`${radioId}-unread`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.registrationState === RegistrationState.Unread,
          })}
        >
          {I18NextService.i18n.t("unread")}
        </label>

        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={RegistrationState.All}
          checked={this.state.registrationState === RegistrationState.All}
          onChange={linkEvent(this, this.handleRegistrationStateChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.registrationState === RegistrationState.All,
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>

        <input
          id={`${radioId}-denied`}
          type="radio"
          className="btn-check"
          value={RegistrationState.Denied}
          checked={this.state.registrationState === RegistrationState.Denied}
          onChange={linkEvent(this, this.handleRegistrationStateChange)}
        />
        <label
          htmlFor={`${radioId}-denied`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.registrationState === RegistrationState.Denied,
          })}
        >
          {I18NextService.i18n.t("denied")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span className="me-3">{this.RegistrationStateRadios()}</span>
      </div>
    );
  }

  applicationList(apps: RegistrationApplicationView[]) {
    if (this.state.registrationState === RegistrationState.Denied) {
      apps = apps.filter(ra => !ra.creator_local_user.accepted_application);
    }
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

  handleRegistrationStateChange(i: RegistrationApplications, event: any) {
    i.setState({ registrationState: Number(event.target.value), page: 1 });
    i.refetch();
  }

  handlePageChange(page: number) {
    this.setState({ page });
    this.refetch();
  }

  static async fetchInitialData({
    headers,
  }: InitialFetchRequest): Promise<RegistrationApplicationsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      listRegistrationApplicationsResponse: headers["Authorization"]
        ? await client.listRegistrationApplications({
            unread_only: true,
            page: 1,
            limit: fetchLimit,
          })
        : EMPTY_REQUEST,
    };
  }

  async refetch() {
    const unread_only =
      this.state.registrationState === RegistrationState.Unread;
    this.setState({
      appsRes: LOADING_REQUEST,
    });
    this.setState({
      appsRes: await HttpService.client.listRegistrationApplications({
        unread_only: unread_only,
        page: this.state.page,
        limit: fetchLimit,
      }),
    });
  }

  async handleApproveApplication(form: ApproveRegistrationApplication) {
    const approveRes =
      await HttpService.client.approveRegistrationApplication(form);
    this.setState(s => {
      if (s.appsRes.state === "success" && approveRes.state === "success") {
        s.appsRes.data.registration_applications = editRegistrationApplication(
          approveRes.data.registration_application,
          s.appsRes.data.registration_applications,
        );
        if (this.state.registrationState === RegistrationState.Unread) {
          this.refetch();
          UnreadCounterService.Instance.updateApplications();
        }
      }
      return s;
    });
  }
}
