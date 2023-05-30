import autosize from "autosize";
import { Component, linkEvent } from "inferno";
import {
  BannedPersonsResponse,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  PersonView,
  SiteResponse,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { WebSocketService } from "../../services";
import {
  WithPromiseKeys,
  capitalizeFirstLetter,
  isBrowser,
  myAuth,
  randomStr,
  setIsoData,
  showLocal,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import Tabs from "../common/tabs";
import { PersonListing } from "../person/person-listing";
import { EmojiForm } from "./emojis-form";
import RateLimitForm from "./rate-limit-form";
import { SiteForm } from "./site-form";
import { TaglineForm } from "./tagline-form";

interface AdminSettingsData {
  bannedPersonsResponse: BannedPersonsResponse;
  federatedInstancesResponse: GetFederatedInstancesResponse;
}

interface AdminSettingsState {
  siteRes: GetSiteResponse;
  instancesRes?: GetFederatedInstancesResponse;
  banned: PersonView[];
  loading: boolean;
  leaveAdminTeamLoading: boolean;
}

export class AdminSettings extends Component<any, AdminSettingsState> {
  private siteConfigTextAreaId = `site-config-${randomStr()}`;
  private isoData = setIsoData<AdminSettingsData>(this.context);
  private subscription?: Subscription;
  state: AdminSettingsState = {
    siteRes: this.isoData.site_res,
    banned: [],
    loading: true,
    leaveAdminTeamLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      const { bannedPersonsResponse, federatedInstancesResponse } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        banned: bannedPersonsResponse.banned,
        instancesRes: federatedInstancesResponse,
        loading: false,
      };
    } else {
      let cAuth = myAuth();
      if (cAuth) {
        WebSocketService.Instance.send(
          wsClient.getBannedPersons({
            auth: cAuth,
          })
        );
        WebSocketService.Instance.send(
          wsClient.getFederatedInstances({ auth: cAuth })
        );
      }
    }
  }

  static fetchInitialData({
    auth,
    client,
  }: InitialFetchRequest): WithPromiseKeys<AdminSettingsData> {
    return {
      bannedPersonsResponse: client.getBannedPersons({ auth: auth as string }),
      federatedInstancesResponse: client.getFederatedInstances({
        auth: auth as string,
      }) as Promise<GetFederatedInstancesResponse>,
    };
  }

  componentDidMount() {
    if (isBrowser()) {
      var textarea: any = document.getElementById(this.siteConfigTextAreaId);
      autosize(textarea);
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
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
                  />
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
        {this.state.leaveAdminTeamLoading ? (
          <Spinner />
        ) : (
          i18n.t("leave_admin_team")
        )}
      </button>
    );
  }

  bannedUsers() {
    return (
      <>
        <h5>{i18n.t("banned_users")}</h5>
        <ul className="list-unstyled">
          {this.state.banned.map(banned => (
            <li key={banned.person.id} className="list-inline-item">
              <PersonListing person={banned.person} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  handleLeaveAdminTeam(i: AdminSettings) {
    let auth = myAuth();
    if (auth) {
      i.setState({ leaveAdminTeamLoading: true });
      WebSocketService.Instance.send(wsClient.leaveAdmin({ auth }));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.context.router.history.push("/");
      this.setState({ loading: false });
      return;
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg);
      this.setState(s => ((s.siteRes.site_view = data.site_view), s));
      toast(i18n.t("site_saved"));
    } else if (op == UserOperation.GetBannedPersons) {
      let data = wsJsonToRes<BannedPersonsResponse>(msg);
      this.setState({ banned: data.banned, loading: false });
    } else if (op == UserOperation.LeaveAdmin) {
      let data = wsJsonToRes<GetSiteResponse>(msg);
      this.setState(s => ((s.siteRes.site_view = data.site_view), s));
      this.setState({ leaveAdminTeamLoading: false });
      toast(i18n.t("left_admin_team"));
      this.context.router.history.push("/");
    } else if (op == UserOperation.GetFederatedInstances) {
      let data = wsJsonToRes<GetFederatedInstancesResponse>(msg);
      this.setState({ instancesRes: data });
    }
  }
}
