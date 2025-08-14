import { editRegistrationApplication, setIsoData } from "@utils/app";
import {
  cursorComponents,
  getQueryParams,
  getQueryString,
  randomStr,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  DirectionalCursor,
  QueryParams,
  RouteDataResponse,
} from "@utils/types";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import {
  ApproveRegistrationApplication,
  LemmyHttp,
  ListRegistrationApplicationsResponse,
  RegistrationApplicationView,
} from "lemmy-js-client";
import { fetchLimit } from "@utils/config";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { RegistrationApplication } from "../common/registration-application";
import { getHttpBaseInternal } from "../../utils/env";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { InfernoNode } from "inferno";

type RegistrationState = "Unread" | "All" | "Denied";

type RegistrationApplicationsData = RouteDataResponse<{
  listRegistrationApplicationsResponse: ListRegistrationApplicationsResponse;
}>;

interface RegistrationApplicationsState {
  appsRes: RequestState<ListRegistrationApplicationsResponse>;
  isIsomorphic: boolean;
}

interface RegistrationApplicationsProps {
  view: RegistrationState;
  cursor?: DirectionalCursor;
}

function registrationStateFromQuery(view?: string): RegistrationState {
  switch (view) {
    case "Unread":
    case "All":
    case "Denied":
      return view;
    default:
      return "Unread";
  }
}

export function getRegistrationApplicationQueryParams(
  source?: string,
): RegistrationApplicationsProps {
  return getQueryParams<RegistrationApplicationsProps>(
    {
      view: registrationStateFromQuery,
      cursor: (cursor?: string) => cursor,
    },
    source,
  );
}

export type RegistrationApplicationsFetchConfig = IRoutePropsWithFetch<
  RegistrationApplicationsData,
  Record<string, never>,
  RegistrationApplicationsProps
>;

type RegistrationApplicationsRouteProps = RouteComponentProps<
  Record<string, never>
> &
  RegistrationApplicationsProps;

@scrollMixin
export class RegistrationApplications extends Component<
  RegistrationApplicationsRouteProps,
  RegistrationApplicationsState
> {
  private isoData = setIsoData<RegistrationApplicationsData>(this.context);
  state: RegistrationApplicationsState = {
    appsRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.appsRes]);
  }

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

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.refetch(this.props);
    }
  }

  componentWillReceiveProps(
    nextProps: RegistrationApplicationsRouteProps & { children?: InfernoNode },
  ): void {
    if (
      nextProps.view !== this.props.view ||
      nextProps.cursor !== this.props.cursor
    ) {
      this.refetch(nextProps);
    }
  }

  get documentTitle(): string {
    const mui = this.isoData.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${I18NextService.i18n.t(
          "registration_applications",
        )} - ${this.isoData.siteRes.site_view.site.name}`
      : "";
  }

  renderApps() {
    const appsState = this.state.appsRes.state;
    const apps =
      appsState === "success" &&
      this.state.appsRes.data.registration_applications;

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
          {apps ? (
            <>
              {this.applicationList(apps)}
              <PaginatorCursor
                current={this.props.cursor}
                resource={this.state.appsRes}
                onPageChange={this.handlePageChange}
              />
            </>
          ) : (
            appsState === "loading" && (
              <div className="text-center">
                <Spinner large />
              </div>
            )
          )}
        </div>
      </div>
    );
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
          value={"Unread"}
          checked={this.props.view === "Unread"}
          onChange={linkEvent(this, this.handleRegistrationStateChange)}
        />
        <label
          htmlFor={`${radioId}-unread`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.props.view === "Unread",
          })}
        >
          {I18NextService.i18n.t("unread")}
        </label>

        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={"All"}
          checked={this.props.view === "All"}
          onChange={linkEvent(this, this.handleRegistrationStateChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.props.view === "All",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>

        <input
          id={`${radioId}-denied`}
          type="radio"
          className="btn-check"
          value={"Denied"}
          checked={this.props.view === "Denied"}
          onChange={linkEvent(this, this.handleRegistrationStateChange)}
        />
        <label
          htmlFor={`${radioId}-denied`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.props.view === "Denied",
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
    if (this.props.view === "Denied") {
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
              myUserInfo={this.isoData.myUserInfo}
            />
          </>
        ))}
      </div>
    );
  }

  handleRegistrationStateChange(i: RegistrationApplications, event: any) {
    i.updateUrl({ view: event.target.value, cursor: undefined });
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  static async fetchInitialData({
    headers,
    match: {
      params: { view, cursor },
    },
  }: InitialFetchRequest<
    Record<string, never>,
    RegistrationApplicationsProps
  >): Promise<RegistrationApplicationsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      listRegistrationApplicationsResponse: headers["Authorization"]
        ? await client.listRegistrationApplications({
            unread_only: view === "Unread",
            ...cursorComponents(cursor),
            limit: fetchLimit,
          })
        : EMPTY_REQUEST,
    };
  }

  refetchToken?: symbol;
  async refetch(props: RegistrationApplicationsProps) {
    const token = (this.refetchToken = Symbol());
    const { view: state, cursor } = props;
    this.setState({
      appsRes: LOADING_REQUEST,
    });
    const appsRes = await HttpService.client.listRegistrationApplications({
      unread_only: state === "Unread",
      ...cursorComponents(cursor),
      limit: fetchLimit,
    });
    if (token === this.refetchToken) {
      this.setState({ appsRes });
    }
  }

  async updateUrl(props: Partial<RegistrationApplicationsProps>) {
    const { cursor, view: state } = { ...this.props, ...props };

    const queryParams: QueryParams<RegistrationApplicationsProps> = {
      cursor,
      view: state,
    };

    this.props.history.push(
      `/registration_applications${getQueryString(queryParams)}`,
    );
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
      }
      return s;
    });
  }
}
