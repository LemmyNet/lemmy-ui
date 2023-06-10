import { Component, linkEvent } from "inferno";
import {
  BannedPersonsResponse,
  CreateCustomEmoji,
  DeleteCustomEmoji,
  EditCustomEmoji,
  EditSite,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  PersonView,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService } from "../../services/FirstLoadService";
import { HttpService, RequestState } from "../../services/HttpService";
import {
  capitalizeFirstLetter,
  fetchThemeList,
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
  banned: PersonView[];
  currentTab: string;
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  bannedRes: RequestState<BannedPersonsResponse>;
  leaveAdminTeamRes: RequestState<GetSiteResponse>;
  themeList: string[];
}

export class AdminSettings extends Component<any, AdminSettingsState> {
  private isoData = setIsoData(this.context);
  state: AdminSettingsState = {
    siteRes: this.isoData.site_res,
    banned: [],
    currentTab: "site",
    bannedRes: { state: "empty" },
    instancesRes: { state: "empty" },
    leaveAdminTeamRes: { state: "empty" },
    themeList: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleEditSite = this.handleEditSite.bind(this);
    this.handleEditEmoji = this.handleEditEmoji.bind(this);
    this.handleDeleteEmoji = this.handleDeleteEmoji.bind(this);
    this.handleCreateEmoji = this.handleCreateEmoji.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const [bannedRes, instancesRes] = this.isoData.routeData;
      this.state = {
        ...this.state,
        bannedRes,
        instancesRes,
      };
    }
  }

  async fetchData() {
    this.setState({
      bannedRes: { state: "loading" },
      instancesRes: { state: "loading" },
      themeList: [],
    });

    const auth = myAuthRequired();

    this.setState({
      bannedRes: await HttpService.client.getBannedPersons({
        auth,
      }),
      instancesRes: await HttpService.client.getFederatedInstances({
        auth,
      }),
      themeList: await fetchThemeList(),
    });
  }

  static fetchInitialData({
    auth,
    client,
  }: InitialFetchRequest): Promise<any>[] {
    const promises: Promise<RequestState<any>>[] = [];

    if (auth) {
      promises.push(client.getBannedPersons({ auth }));
      promises.push(client.getFederatedInstances({ auth }));
    } else {
      promises.push(
        Promise.resolve({ state: "empty" }),
        Promise.resolve({ state: "empty" })
      );
    }

    return promises;
  }

  async componentDidMount() {
    if (!FirstLoadService.isFirstLoad) {
      await this.fetchData();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("admin_settings")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    const federationData =
      this.state.instancesRes.state === "success"
        ? this.state.instancesRes.data.federated_instances
        : undefined;

    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <Tabs
          tabs={[
            {
              key: "site",
              label: i18n.t("site"),
              getNode: () => (
                <div className="row">
                  <div className="col-12 col-md-6">
                    <SiteForm
                      showLocal={showLocal(this.isoData)}
                      allowedInstances={federationData?.allowed}
                      blockedInstances={federationData?.blocked}
                      onSaveSite={this.handleEditSite}
                      siteRes={this.state.siteRes}
                      themeList={this.state.themeList}
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
                  rateLimits={
                    this.state.siteRes.site_view.local_site_rate_limit
                  }
                  onSaveSite={this.handleEditSite}
                />
              ),
            },
            {
              key: "taglines",
              label: i18n.t("taglines"),
              getNode: () => (
                <div className="row">
                  <TaglineForm
                    taglines={this.state.siteRes.taglines}
                    onSaveSite={this.handleEditSite}
                  />
                </div>
              ),
            },
            {
              key: "emojis",
              label: i18n.t("emojis"),
              getNode: () => (
                <div className="row">
                  <EmojiForm
                    onCreate={this.handleCreateEmoji}
                    onDelete={this.handleDeleteEmoji}
                    onEdit={this.handleEditEmoji}
                  />
                </div>
              ),
            },
          ]}
        />
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

  async handleEditSite(form: EditSite) {
    const editRes = await HttpService.client.editSite(form);

    if (editRes.state === "success") {
      this.setState(s => {
        s.siteRes.site_view = editRes.data.site_view;
        // TODO: Where to get taglines from?
        s.siteRes.taglines = editRes.data.taglines;
        return s;
      });
      toast(i18n.t("site_saved"));
    }

    return editRes;
  }

  handleSwitchTab(i: { ctx: AdminSettings; tab: string }) {
    i.ctx.setState({ currentTab: i.tab });
  }

  async handleLeaveAdminTeam(i: AdminSettings) {
    i.setState({ leaveAdminTeamRes: { state: "loading" } });
    this.setState({
      leaveAdminTeamRes: await HttpService.client.leaveAdmin({
        auth: myAuthRequired(),
      }),
    });

    if (this.state.leaveAdminTeamRes.state === "success") {
      toast(i18n.t("left_admin_team"));
      this.context.router.history.replace("/");
    }
  }

  async handleEditEmoji(form: EditCustomEmoji) {
    const res = await HttpService.client.editCustomEmoji(form);
    if (res.state === "success") {
      updateEmojiDataModel(res.data.custom_emoji);
    }
  }

  async handleDeleteEmoji(form: DeleteCustomEmoji) {
    const res = await HttpService.client.deleteCustomEmoji(form);
    if (res.state === "success") {
      removeFromEmojiDataModel(res.data.id);
    }
  }

  async handleCreateEmoji(form: CreateCustomEmoji) {
    const res = await HttpService.client.createCustomEmoji(form);
    if (res.state === "success") {
      updateEmojiDataModel(res.data.custom_emoji);
    }
  }
}
