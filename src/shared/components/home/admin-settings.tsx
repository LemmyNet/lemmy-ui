import { Component, linkEvent } from "inferno";
import {
  BannedPersonsResponse,
  CreateCustomEmoji,
  DeleteCustomEmoji,
  EditCustomEmoji,
  EditSite,
  GetBannedPersons,
  GetFederatedInstancesResponse,
  GetSiteResponse,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import {
  HttpService,
  RequestState,
  apiWrapper,
  apiWrapperIso,
} from "../../services/HttpService";
import {
  capitalizeFirstLetter,
  isInitialRoute,
  myAuthRequired,
  removeFromEmojiDataModel,
  setIsoData,
  showLocal,
  toast,
  updateEmojiDataModel,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import Tabs from "../common/tabs";
import { PersonListing } from "../person/person-listing";
import { EmojiForm } from "./emojis-form";
import RateLimitForm from "./rate-limit-form";
import { SiteForm } from "./site-form";
import { TaglineForm } from "./tagline-form";

interface AdminSettingsState {
  siteRes: GetSiteResponse;
<<<<<<< HEAD
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  bannedRes: RequestState<BannedPersonsResponse>;
  leaveAdminTeamRes: RequestState<GetSiteResponse>;
  currentTab: string;
||||||| 0bd9a17
  instancesRes?: GetFederatedInstancesResponse;
  banned: PersonView[];
  loading: boolean;
  leaveAdminTeamLoading: boolean;
  currentTab: string;
=======
  instancesRes?: GetFederatedInstancesResponse;
  banned: PersonView[];
  loading: boolean;
  leaveAdminTeamLoading: boolean;
>>>>>>> main
}

export class AdminSettings extends Component<any, AdminSettingsState> {
  private isoData = setIsoData(this.context);
  state: AdminSettingsState = {
    siteRes: this.isoData.site_res,
<<<<<<< HEAD
    bannedRes: { state: "empty" },
    instancesRes: { state: "empty" },
    leaveAdminTeamRes: { state: "empty" },
    currentTab: "site",
||||||| 0bd9a17
    banned: [],
    loading: true,
    leaveAdminTeamLoading: false,
    currentTab: "site",
=======
    banned: [],
    loading: true,
    leaveAdminTeamLoading: false,
>>>>>>> main
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleEditSite = this.handleEditSite.bind(this);
    this.handleEditEmoji = this.handleEditEmoji.bind(this);
    this.handleDeleteEmoji = this.handleDeleteEmoji.bind(this);
    this.handleCreateEmoji = this.handleCreateEmoji.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        bannedRes: apiWrapperIso(
          this.isoData.routeData[0] as BannedPersonsResponse
        ),
        instancesRes: apiWrapperIso(
          this.isoData.routeData[1] as GetFederatedInstancesResponse
        ),
      };
    }
  }

  async fetchData() {
    this.setState({
      bannedRes: { state: "loading" },
      instancesRes: { state: "loading" },
    });

    const auth = myAuthRequired();

    this.setState({
      bannedRes: await apiWrapper(
        HttpService.client.getBannedPersons({
          auth,
        })
      ),
      instancesRes: await apiWrapper(
        HttpService.client.getFederatedInstances({
          auth,
        })
      ),
    });
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let auth = req.auth;
    if (auth) {
      let bannedPersonsForm: GetBannedPersons = { auth };
      promises.push(req.client.getBannedPersons(bannedPersonsForm));
      promises.push(req.client.getFederatedInstances({ auth }));
    }

    return promises;
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.fetchData();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("admin_settings")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="container-lg">
<<<<<<< HEAD
        <div>
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
          />
          <ul className="nav nav-tabs mb-2">
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "site" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "site" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("site")}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "taglines" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "taglines" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("taglines")}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "emojis" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "emojis" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("emojis")}
              </button>
            </li>
          </ul>
          {this.state.currentTab == "site" &&
            this.state.instancesRes.state == "success" && (
              <div className="row">
                <div className="col-12 col-md-6">
                  <SiteForm
                    siteRes={this.state.siteRes}
                    allowedInstances={
                      this.state.instancesRes.data.federated_instances?.allowed
                    }
                    blockedInstances={
                      this.state.instancesRes.data.federated_instances?.blocked
                    }
                    showLocal={showLocal(this.isoData)}
                    onEditSite={this.handleEditSite}
||||||| 0bd9a17
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div>
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <ul className="nav nav-tabs mb-2">
              <li className="nav-item">
                <button
                  className={`nav-link btn ${
                    this.state.currentTab == "site" && "active"
                  }`}
                  onClick={linkEvent(
                    { ctx: this, tab: "site" },
                    this.handleSwitchTab
                  )}
                >
                  {i18n.t("site")}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn ${
                    this.state.currentTab == "taglines" && "active"
                  }`}
                  onClick={linkEvent(
                    { ctx: this, tab: "taglines" },
                    this.handleSwitchTab
                  )}
                >
                  {i18n.t("taglines")}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn ${
                    this.state.currentTab == "emojis" && "active"
                  }`}
                  onClick={linkEvent(
                    { ctx: this, tab: "emojis" },
                    this.handleSwitchTab
                  )}
                >
                  {i18n.t("emojis")}
                </button>
              </li>
            </ul>
            {this.state.currentTab == "site" && (
              <div className="row">
                <div className="col-12 col-md-6">
                  <SiteForm
                    siteRes={this.state.siteRes}
                    instancesRes={this.state.instancesRes}
                    showLocal={showLocal(this.isoData)}
=======
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <Tabs
            tabs={[
              {
                key: "site",
                label: i18n.t("site"),
                getNode: () => (
                  <div className="row">
                    <div className="col-12 col-md-6">
                      <SiteForm
                        siteRes={this.state.siteRes}
                        instancesRes={this.state.instancesRes}
                        showLocal={showLocal(this.isoData)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      {this.admins()}
                      {this.bannedUsers()}
                    </div>
                  </div>
                ),
              },
              {
                key: "rate_limiting",
                label: "Rate Limiting",
                getNode: () => (
                  <RateLimitForm
                    localSiteRateLimit={
                      this.state.siteRes.site_view.local_site_rate_limit
                    }
                    applicationQuestion={
                      this.state.siteRes.site_view.local_site
                        .application_question
                    }
>>>>>>> main
                  />
<<<<<<< HEAD
                </div>
                <div className="col-12 col-md-6">
                  {this.admins()}
                  {this.bannedUsers()}
                </div>
              </div>
            )}
          {this.state.currentTab == "taglines" && (
            <div className="row">
              <TaglineForm
                siteRes={this.state.siteRes}
                onEditSite={this.handleEditSite}
              />
            </div>
          )}
          {this.state.currentTab == "emojis" && (
            <div className="row">
              <EmojiForm
                onEdit={this.handleEditEmoji}
                onDelete={this.handleDeleteEmoji}
                onCreate={this.handleCreateEmoji}
              />
            </div>
          )}
        </div>
||||||| 0bd9a17
                </div>
                <div className="col-12 col-md-6">
                  {this.admins()}
                  {this.bannedUsers()}
                </div>
              </div>
            )}
            {this.state.currentTab == "taglines" && (
              <div className="row">
                <TaglineForm siteRes={this.state.siteRes}></TaglineForm>
              </div>
            )}
            {this.state.currentTab == "emojis" && (
              <div className="row">
                <EmojiForm></EmojiForm>
              </div>
            )}
          </div>
        )}
=======
                ),
              },
              {
                key: "taglines",
                label: i18n.t("taglines"),
                getNode: () => (
                  <div className="row">
                    <TaglineForm siteRes={this.state.siteRes} />
                  </div>
                ),
              },
              {
                key: "emojis",
                label: i18n.t("emojis"),
                getNode: () => (
                  <div className="row">
                    <EmojiForm />
                  </div>
                ),
              },
            ]}
          />
        )}
>>>>>>> main
      </div>
    );
  }

  admins() {
    return (
      <>
        <h5>{capitalizeFirstLetter(i18n.t("admins"))}</h5>
        <ul className="list-unstyled">
          {this.state.siteRes.admins.map(admin => (
            <li key={admin.person.id} className="list-inline-item">
              <PersonListing person={admin.person} />
            </li>
          ))}
        </ul>
        {this.leaveAdmin()}
      </>
    );
  }

  leaveAdmin() {
    return (
      <button
        onClick={linkEvent(this, this.handleLeaveAdminTeam)}
        className="btn btn-danger mb-2"
      >
        {this.state.leaveAdminTeamRes.state == "loading" ? (
          <Spinner />
        ) : (
          i18n.t("leave_admin_team")
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
            <h5>{i18n.t("banned_users")}</h5>
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

<<<<<<< HEAD
  handleSwitchTab(i: { ctx: AdminSettings; tab: string }) {
    i.ctx.setState({ currentTab: i.tab });
  }

  async handleLeaveAdminTeam(i: AdminSettings) {
    i.setState({ leaveAdminTeamRes: { state: "loading" } });
    this.setState({
      leaveAdminTeamRes: await apiWrapper(
        HttpService.client.leaveAdmin({ auth: myAuthRequired() })
      ),
    });

    if (this.state.leaveAdminTeamRes.state == "success") {
      toast(i18n.t("left_admin_team"));
      this.context.router.history.push("/");
||||||| 0bd9a17
  handleSwitchTab(i: { ctx: AdminSettings; tab: string }) {
    i.ctx.setState({ currentTab: i.tab });
  }

  handleLeaveAdminTeam(i: AdminSettings) {
    let auth = myAuth();
    if (auth) {
      i.setState({ leaveAdminTeamLoading: true });
      WebSocketService.Instance.send(wsClient.leaveAdmin({ auth }));
=======
  handleLeaveAdminTeam(i: AdminSettings) {
    let auth = myAuth();
    if (auth) {
      i.setState({ leaveAdminTeamLoading: true });
      WebSocketService.Instance.send(wsClient.leaveAdmin({ auth }));
>>>>>>> main
    }
  }

  async handleEditSite(form: EditSite) {
    const editRes = await apiWrapper(HttpService.client.editSite(form));

    if (editRes.state == "success") {
      this.setState(s => ((s.siteRes.site_view = editRes.data.site_view), s));
      toast(i18n.t("site_saved"));
    }
  }

  async handleEditEmoji(form: EditCustomEmoji) {
    const res = await apiWrapper(HttpService.client.editCustomEmoji(form));
    if (res.state == "success") {
      updateEmojiDataModel(res.data.custom_emoji);
    }
  }

  async handleDeleteEmoji(form: DeleteCustomEmoji) {
    const res = await apiWrapper(HttpService.client.deleteCustomEmoji(form));
    if (res.state == "success") {
      removeFromEmojiDataModel(res.data.id);
    }
  }

  async handleCreateEmoji(form: CreateCustomEmoji) {
    const res = await apiWrapper(HttpService.client.createCustomEmoji(form));
    if (res.state == "success") {
      updateEmojiDataModel(res.data.custom_emoji);
    }
  }
}
