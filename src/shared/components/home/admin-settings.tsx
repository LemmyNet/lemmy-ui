import { fetchThemeList, setIsoData, showLocal } from "@utils/app";
import { capitalizeFirstLetter, resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component } from "inferno";
import {
  BannedPersonsResponse,
  CreateOAuthProvider,
  DeleteOAuthProvider,
  EditOAuthProvider,
  EditSite,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  LemmyHttp,
  ListMediaResponse,
  OAuthProvider,
  PersonView,
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
import Tabs from "../common/tabs";
import { PersonListing } from "../person/person-listing";
import { EmojiForm } from "./emojis-form";
import RateLimitForm from "./rate-limit-form";
import { SiteForm } from "./site-form";
import { TaglineForm } from "./tagline-form";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "../../routes";
import { MediaUploads } from "../common/media-uploads";
import { Paginator } from "../common/paginator";
import { snapToTop } from "@utils/browser";
import { isBrowser } from "@utils/browser";
import ConfirmationModal from "../common/modal/confirmation-modal";
import OAuthProvidersTab from "./oauth/oauth-providers-tab";

type AdminSettingsData = RouteDataResponse<{
  bannedRes: BannedPersonsResponse;
  instancesRes: GetFederatedInstancesResponse;
  uploadsRes: ListMediaResponse;
}>;

interface AdminSettingsState {
  siteRes: GetSiteResponse;
  banned: PersonView[];
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  bannedRes: RequestState<BannedPersonsResponse>;
  leaveAdminTeamRes: RequestState<GetSiteResponse>;
  showConfirmLeaveAdmin: boolean;
  uploadsRes: RequestState<ListMediaResponse>;
  uploadsPage: number;
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
    siteRes: this.isoData.site_res,
    banned: [],
    bannedRes: EMPTY_REQUEST,
    instancesRes: EMPTY_REQUEST,
    leaveAdminTeamRes: EMPTY_REQUEST,
    showConfirmLeaveAdmin: false,
    uploadsRes: EMPTY_REQUEST,
    uploadsPage: 1,
    loading: false,
    themeList: [],
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([
      this.state.bannedRes,
      this.state.instancesRes,
      this.state.uploadsRes,
    ]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handleEditSite = this.handleEditSite.bind(this);
    this.handleUploadsPageChange = this.handleUploadsPageChange.bind(this);
    this.handleToggleShowLeaveAdminConfirmation =
      this.handleToggleShowLeaveAdminConfirmation.bind(this);
    this.handleLeaveAdminTeam = this.handleLeaveAdminTeam.bind(this);
    this.handleEditOAuthProvider = this.handleEditOAuthProvider.bind(this);
    this.handleDeleteOAuthProvider = this.handleDeleteOAuthProvider.bind(this);
    this.handleCreateOAuthProvider = this.handleCreateOAuthProvider.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { bannedRes, instancesRes, uploadsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        bannedRes,
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
      bannedRes: await client.getBannedPersons(),
      instancesRes: await client.getFederatedInstances(),
      uploadsRes: await client.listAllMedia(),
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
      this.state.siteRes.site_view.site.name
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
                        allowedInstances={federationData?.allowed}
                        blockedInstances={federationData?.blocked}
                        onSaveSite={this.handleEditSite}
                        siteRes={this.state.siteRes}
                        themeList={this.state.themeList}
                        loading={this.state.loading}
                      />
                    </div>
                    <div className="col-12 col-md-6">{this.admins()}</div>
                  </div>
                </div>
              ),
            },
            {
              key: "banned_users",
              label: I18NextService.i18n.t("banned_users"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="banned_users-tab-pane"
                >
                  {this.bannedUsers()}
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
                      this.state.siteRes.site_view.local_site_rate_limit
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
                    <TaglineForm />
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
                      this.state.siteRes.admin_oauth_providers ?? []
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
      bannedRes: LOADING_REQUEST,
      instancesRes: LOADING_REQUEST,
      uploadsRes: LOADING_REQUEST,
      themeList: [],
    });

    const [bannedRes, instancesRes, uploadsRes, themeList] = await Promise.all([
      HttpService.client.getBannedPersons(),
      HttpService.client.getFederatedInstances(),
      HttpService.client.listAllMedia({
        page: this.state.uploadsPage,
      }),
      fetchThemeList(),
    ]);

    this.setState({
      bannedRes,
      instancesRes,
      uploadsRes,
      themeList,
    });
  }

  async fetchUploadsOnly() {
    const uploadsRes = await HttpService.client.listAllMedia({
      page: this.state.uploadsPage,
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
          {this.state.siteRes.admins.map(admin => (
            <li key={admin.person.id} className="list-inline-item">
              <PersonListing person={admin.person} />
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

  bannedUsers() {
    switch (this.state.bannedRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const bans = this.state.bannedRes.data.banned;
        return (
          <>
            <h1 className="h4 mb-4">{I18NextService.i18n.t("banned_users")}</h1>
            <ul className="list-unstyled">
              {bans.map(banned => (
                <li key={banned.person.id} className="list-inline-item">
                  <PersonListing person={banned.person} />
                </li>
              ))}
            </ul>
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
            <MediaUploads showUploader uploads={uploadsRes} />
            <Paginator
              page={this.state.uploadsPage}
              onChange={this.handleUploadsPageChange}
              nextDisabled={false}
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
      this.setState(s => {
        s.siteRes.site_view = editRes.data.site_view;
        // TODO: Where to get taglines from?
        return s;
      });
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

  async handleUploadsPageChange(val: number) {
    this.setState({ uploadsPage: val });
    snapToTop();
    await this.fetchUploadsOnly();
  }

  async handleEditOAuthProvider(form: EditOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.editOAuthProvider(form);

    if (res.state === "success") {
      const newOAuthProvider = res.data;
      this.setState(s => {
        s.siteRes.admin_oauth_providers = (
          s.siteRes.admin_oauth_providers ?? []
        ).map(p => {
          return p?.client_id === newOAuthProvider.client_id
            ? newOAuthProvider
            : p;
        });
        return s;
      });
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_edit_oauth_provider"), "danger");
    }

    this.setState({ loading: false });

    return res;
  }

  async handleDeleteOAuthProvider(form: DeleteOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.deleteOAuthProvider(form);

    if (res.state === "success") {
      this.setState(s => {
        s.siteRes.admin_oauth_providers = (
          s.siteRes.admin_oauth_providers ?? []
        ).filter(p => p.id !== form.id);
        return s;
      });
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_delete_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleCreateOAuthProvider(
    form: CreateOAuthProvider,
  ): Promise<OAuthProvider | null> {
    this.setState({ loading: true });

    const res = await HttpService.client.createOAuthProvider(form);
    let newOAuthProvider: OAuthProvider;

    if (res.state === "success") {
      newOAuthProvider = res.data;

      this.setState(s => {
        s.siteRes.admin_oauth_providers = (
          s.siteRes.admin_oauth_providers ?? []
        ).slice();
        const index = s.siteRes.admin_oauth_providers.findIndex(
          x => x?.id === newOAuthProvider?.id,
        );
        if (index >= 0) {
          Object.assign(
            s.siteRes.admin_oauth_providers[index] || {},
            newOAuthProvider,
          );
        } else {
          s.siteRes.admin_oauth_providers.push(newOAuthProvider);
        }
      });
      toast(I18NextService.i18n.t("site_saved"));
      this.setState({ loading: false });
      return newOAuthProvider;
    }

    // handle failure
    toast(I18NextService.i18n.t("couldnt_create_oauth_provider"), "danger");
    this.setState({ loading: false });
    return null;
  }
}
