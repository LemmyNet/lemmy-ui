import { fetchThemeList, setIsoData, showLocal } from "@utils/app";
import {
  capitalizeFirstLetter,
  cursorComponents,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { DirectionalCursor, RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component } from "inferno";
import {
  AdminListUsersResponse,
  CreateOAuthProvider,
  DeleteOAuthProvider,
  EditOAuthProvider,
  EditSite,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  LemmyHttp,
  ListMediaResponse,
} from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import Tabs from "../common/tabs";
import { PersonListing } from "../person/person-listing";
import { EmojiForm } from "./emojis-form";
import RateLimitForm from "./rate-limit-form";
import { SiteForm } from "./site-form";
import { TaglineForm } from "./tagline-form";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { MediaUploads } from "../common/media-uploads";
import { snapToTop } from "@utils/browser";
import { isBrowser } from "@utils/browser";
import ConfirmationModal from "../common/modal/confirmation-modal";
import OAuthProvidersTab from "./oauth/oauth-providers-tab";
import { InstanceBlocks } from "./instance-blocks";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { fetchLimit } from "@utils/config";
import { linkEvent } from "inferno";
import { UserBadges } from "@components/common/user-badges";
import { MomentTime } from "@components/common/moment-time";

type AdminSettingsData = RouteDataResponse<{
  usersRes: AdminListUsersResponse;
  instancesRes: GetFederatedInstancesResponse;
  uploadsRes: ListMediaResponse;
}>;

interface AdminSettingsState {
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  usersRes: RequestState<AdminListUsersResponse>;
  usersCursor?: DirectionalCursor;
  usersBannedOnly: boolean;
  leaveAdminTeamRes: RequestState<GetSiteResponse>;
  showConfirmLeaveAdmin: boolean;
  uploadsRes: RequestState<ListMediaResponse>;
  uploadsCursor?: DirectionalCursor;
  loading: boolean;
  themeList: string[];
  isIsomorphic: boolean;
}

type AdminSettingsRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type AdminSettingsFetchConfig = IRoutePropsWithFetch<
  AdminSettingsData,
  Record<string, never>,
  Record<string, never>
>;

@scrollMixin
export class AdminSettings extends Component<
  AdminSettingsRouteProps,
  AdminSettingsState
> {
  private isoData = setIsoData<AdminSettingsData>(this.context);
  state: AdminSettingsState = {
    usersRes: EMPTY_REQUEST,
    usersBannedOnly: false,
    instancesRes: EMPTY_REQUEST,
    leaveAdminTeamRes: EMPTY_REQUEST,
    showConfirmLeaveAdmin: false,
    uploadsRes: EMPTY_REQUEST,
    loading: false,
    themeList: [],
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([
      this.state.usersRes,
      this.state.instancesRes,
      this.state.uploadsRes,
    ]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handleEditSite = this.handleEditSite.bind(this);
    this.handleUsersPageChange = this.handleUsersPageChange.bind(this);
    this.handleUploadsPageChange = this.handleUploadsPageChange.bind(this);
    this.handleToggleShowLeaveAdminConfirmation =
      this.handleToggleShowLeaveAdminConfirmation.bind(this);
    this.handleLeaveAdminTeam = this.handleLeaveAdminTeam.bind(this);
    this.handleEditOAuthProvider = this.handleEditOAuthProvider.bind(this);
    this.handleDeleteOAuthProvider = this.handleDeleteOAuthProvider.bind(this);
    this.handleCreateOAuthProvider = this.handleCreateOAuthProvider.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { usersRes, instancesRes, uploadsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        usersRes,
        instancesRes,
        uploadsRes,
        isIsomorphic: true,
      };
    }
  }

  static async fetchInitialData({
    headers,
  }: InitialFetchRequest): Promise<AdminSettingsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      usersRes: await client.listUsers({ banned_only: false }),
      instancesRes: await client.getFederatedInstances(),
      uploadsRes: await client.listMediaAdmin({ limit: fetchLimit }),
    };
  }

  async componentWillMount() {
    if (isBrowser()) {
      if (!this.state.isIsomorphic) {
        await this.fetchData();
      } else {
        const themeList = await fetchThemeList();
        this.setState({ themeList });
      }
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("admin_settings")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  render() {
    const federationData =
      this.state.instancesRes.state === "success"
        ? this.state.instancesRes.data.federated_instances
        : undefined;

    return (
      <div className="admin-settings container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <Tabs
          tabs={[
            {
              key: "site",
              label: I18NextService.i18n.t("site"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane show", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="site-tab-pane"
                >
                  <h1 className="h4 mb-4">
                    {I18NextService.i18n.t("site_config")}
                  </h1>
                  <div className="row">
                    <div className="col-12 col-md-6">
                      <SiteForm
                        showLocal={showLocal(this.isoData)}
                        onSaveSite={this.handleEditSite}
                        siteRes={this.isoData.siteRes}
                        themeList={this.state.themeList}
                        loading={this.state.loading}
                        myUserInfo={this.isoData.myUserInfo}
                      />
                    </div>
                    <div className="col-12 col-md-6">{this.admins()}</div>
                  </div>
                </div>
              ),
            },
            {
              key: "instance_blocks",
              label: I18NextService.i18n.t("instances"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="instance_blocks-tab-pane"
                >
                  {federationData ? (
                    <InstanceBlocks
                      blockedInstances={federationData.blocked}
                      allowedInstances={federationData.allowed}
                    />
                  ) : (
                    <Spinner />
                  )}
                </div>
              ),
            },
            {
              key: "users",
              label: I18NextService.i18n.t("users"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="users-tab-pane"
                >
                  {this.userListTitleAndSelects()}
                  {this.userList()}
                </div>
              ),
            },
            {
              key: "rate_limiting",
              label: "Rate Limiting",
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="rate_limiting-tab-pane"
                >
                  <RateLimitForm
                    rateLimits={
                      this.isoData.siteRes?.site_view.local_site_rate_limit
                    }
                    onSaveSite={this.handleEditSite}
                    loading={this.state.loading}
                  />
                </div>
              ),
            },
            {
              key: "taglines",
              label: I18NextService.i18n.t("taglines"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="taglines-tab-pane"
                >
                  <div className="row">
                    <TaglineForm myUserInfo={this.isoData.myUserInfo} />
                  </div>
                </div>
              ),
            },
            {
              key: "emojis",
              label: I18NextService.i18n.t("emojis"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="emojis-tab-pane"
                >
                  <div className="row">
                    <EmojiForm />
                  </div>
                </div>
              ),
            },
            {
              key: "uploads",
              label: I18NextService.i18n.t("uploads"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="uploads-tab-pane"
                >
                  {this.uploads()}
                </div>
              ),
            },
            {
              key: "auth",
              label: I18NextService.i18n.t("authentication"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="auth-tab-pane"
                >
                  <OAuthProvidersTab
                    oauthProviders={
                      this.isoData.siteRes?.admin_oauth_providers ?? []
                    }
                    onCreate={this.handleCreateOAuthProvider}
                    onDelete={this.handleDeleteOAuthProvider}
                    onEdit={this.handleEditOAuthProvider}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  async fetchData() {
    this.setState({
      usersRes: LOADING_REQUEST,
      instancesRes: LOADING_REQUEST,
      uploadsRes: LOADING_REQUEST,
      themeList: [],
    });

    const [usersRes, instancesRes, uploadsRes, themeList] = await Promise.all([
      HttpService.client.listUsers({
        banned_only: this.state.usersBannedOnly,
        ...cursorComponents(this.state.usersCursor),
        limit: fetchLimit,
      }),
      HttpService.client.getFederatedInstances(),
      HttpService.client.listMediaAdmin({
        ...cursorComponents(this.state.uploadsCursor),
        limit: fetchLimit,
      }),
      fetchThemeList(),
    ]);

    this.setState({
      usersRes,
      instancesRes,
      uploadsRes,
      themeList,
    });
  }

  async fetchUsersOnly() {
    const usersRes = await HttpService.client.listUsers({
      ...cursorComponents(this.state.uploadsCursor),
      banned_only: this.state.usersBannedOnly,
      limit: fetchLimit,
    });

    this.setState({ usersRes });
  }

  async fetchUploadsOnly() {
    const uploadsRes = await HttpService.client.listMediaAdmin({
      ...cursorComponents(this.state.uploadsCursor),
      limit: fetchLimit,
    });

    this.setState({ uploadsRes });
  }

  admins() {
    return (
      <>
        <h2 className="h5">
          {capitalizeFirstLetter(I18NextService.i18n.t("admins"))}
        </h2>
        <ul className="list-unstyled">
          {this.isoData.siteRes?.admins.map(admin => (
            <li key={admin.person.id} className="list-inline-item">
              <PersonListing
                person={admin.person}
                myUserInfo={this.isoData.myUserInfo}
              />
            </li>
          ))}
        </ul>
        {this.leaveAdmin()}
        <ConfirmationModal
          message={I18NextService.i18n.t("leave_admin_team_confirmation")}
          loadingMessage={I18NextService.i18n.t("leaving_admin_team")}
          onNo={this.handleToggleShowLeaveAdminConfirmation}
          onYes={this.handleLeaveAdminTeam}
          show={this.state.showConfirmLeaveAdmin}
        />
      </>
    );
  }

  leaveAdmin() {
    return (
      <button
        onClick={this.handleToggleShowLeaveAdminConfirmation}
        className="btn btn-danger mb-2"
      >
        {this.state.leaveAdminTeamRes.state === "loading" ? (
          <Spinner />
        ) : (
          I18NextService.i18n.t("leave_admin_team")
        )}
      </button>
    );
  }

  userListTitleAndSelects() {
    return (
      <>
        <h1 className="h4 mb-4">{I18NextService.i18n.t("users")}</h1>
        <div className="row align-items-center mb-3 g-3">
          <div className="col-auto">
            <div
              className="data-type-select btn-group btn-group-toggle flex-wrap"
              role="group"
            >
              <input
                id={`users-all`}
                type="radio"
                className="btn-check"
                value="true"
                checked={!this.state.usersBannedOnly}
                onChange={linkEvent(this, handleUsersBannedOnlyChange)}
              />
              <label
                htmlFor={`users-all`}
                className={classNames("pointer btn btn-outline-secondary", {
                  active: !this.state.usersBannedOnly,
                })}
              >
                {I18NextService.i18n.t("all")}
              </label>
              <input
                id={`users-banned-only`}
                type="radio"
                className="btn-check"
                value="false"
                checked={this.state.usersBannedOnly}
                onChange={linkEvent(this, handleUsersBannedOnlyChange)}
              />
              <label
                htmlFor={`users-banned-only`}
                className={classNames("pointer btn btn-outline-secondary", {
                  active: this.state.usersBannedOnly,
                })}
              >
                {I18NextService.i18n.t("banned")}
              </label>
            </div>
          </div>
        </div>
      </>
    );
  }

  userList() {
    switch (this.state.usersRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const local_users = this.state.usersRes.data.users;
        return (
          <>
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th scope="col">{I18NextService.i18n.t("username")}</th>
                  <th scope="col">{I18NextService.i18n.t("email")}</th>
                  <th scope="col">
                    {I18NextService.i18n.t("registered_date_title")}
                  </th>
                  <th scope="col">{I18NextService.i18n.t("posts")}</th>
                  <th scope="col">{I18NextService.i18n.t("comments")}</th>
                </tr>
              </thead>
              <tbody>
                {local_users.map(local_user => (
                  <tr key={local_user.person.id}>
                    <td>
                      <PersonListing
                        person={local_user.person}
                        myUserInfo={this.isoData.myUserInfo}
                      />
                      <UserBadges
                        classNames="ms-1"
                        isAdmin={local_user.local_user.admin}
                        isBanned={local_user.banned}
                        myUserInfo={this.isoData.myUserInfo}
                        creator={local_user.person}
                      />
                    </td>
                    <td>{local_user.local_user.email}</td>
                    <td>
                      <MomentTime published={local_user.person.published_at} />
                    </td>
                    <td>{local_user.person.post_count}</td>
                    <td>{local_user.person.comment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginatorCursor
              current={this.state.usersCursor}
              resource={this.state.usersRes}
              onPageChange={this.handleUsersPageChange}
            />
          </>
        );
      }
    }
  }

  uploads() {
    switch (this.state.uploadsRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const uploadsRes = this.state.uploadsRes.data;
        return (
          <div>
            <MediaUploads
              showUploader
              uploads={uploadsRes}
              myUserInfo={this.isoData.myUserInfo}
            />
            <PaginatorCursor
              current={this.state.uploadsCursor}
              resource={this.state.uploadsRes}
              onPageChange={this.handleUploadsPageChange}
            />
          </div>
        );
      }
    }
  }

  async handleEditSite(form: EditSite) {
    this.setState({ loading: true });

    const editRes = await HttpService.client.editSite(form);

    if (editRes.state === "success") {
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));

      // You need to reload the page, to properly update the siteRes everywhere
      setTimeout(() => location.reload(), 500);
    }

    this.setState({ loading: false });

    return editRes;
  }

  handleToggleShowLeaveAdminConfirmation() {
    this.setState(prev => ({
      showConfirmLeaveAdmin: !prev.showConfirmLeaveAdmin,
    }));
  }

  async handleLeaveAdminTeam() {
    this.setState({ leaveAdminTeamRes: LOADING_REQUEST });
    this.setState({
      leaveAdminTeamRes: await HttpService.client.leaveAdmin(),
    });

    if (this.state.leaveAdminTeamRes.state === "success") {
      toast(I18NextService.i18n.t("left_admin_team"));
      this.setState({ showConfirmLeaveAdmin: false });
      this.context.router.history.replace("/");
    }
  }

  async handleUsersPageChange(cursor: DirectionalCursor) {
    this.setState({ usersCursor: cursor });
    await this.fetchData();
  }

  async handleUploadsPageChange(cursor: DirectionalCursor) {
    this.setState({ uploadsCursor: cursor });
    snapToTop();
    await this.fetchUploadsOnly();
  }

  async handleEditOAuthProvider(form: EditOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.editOAuthProvider(form);

    if (res.state === "success") {
      const newOAuthProvider = res.data;
      this.isoData.siteRes.oauth_providers =
        this.isoData.siteRes.oauth_providers?.map(p => {
          return p?.id === newOAuthProvider.id ? newOAuthProvider : p;
        }) ?? [newOAuthProvider];
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_edit_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleDeleteOAuthProvider(form: DeleteOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.deleteOAuthProvider(form);

    if (res.state === "success") {
      this.isoData.siteRes.oauth_providers =
        this.isoData.siteRes.oauth_providers?.filter(p => p.id !== form.id);
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_delete_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleCreateOAuthProvider(form: CreateOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.createOAuthProvider(form);
    if (res.state === "success") {
      this.isoData.siteRes.oauth_providers = [
        ...(this.isoData.siteRes.oauth_providers ?? []),
        res.data,
      ];
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_create_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }
}

async function handleUsersBannedOnlyChange(i: AdminSettings, event: any) {
  const checked = event.target.value === "false";
  i.setState({ usersBannedOnly: checked });
  await i.fetchData();
}
