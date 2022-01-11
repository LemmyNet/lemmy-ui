import autosize from "autosize";
import { Component, linkEvent } from "inferno";
import {
  BannedPersonsResponse,
  GetBannedPersons,
  GetSiteConfig,
  GetSiteConfigResponse,
  GetSiteResponse,
  PersonViewSafe,
  SaveSiteConfig,
  SiteResponse,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { WebSocketService } from "../../services";
import {
  authField,
  capitalizeFirstLetter,
  isBrowser,
  randomStr,
  setIsoData,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { SiteForm } from "./site-form";

interface AdminSettingsState {
  siteRes: GetSiteResponse;
  siteConfigRes: GetSiteConfigResponse;
  siteConfigForm: SaveSiteConfig;
  loading: boolean;
  banned: PersonViewSafe[];
  siteConfigLoading: boolean;
}

export class AdminSettings extends Component<any, AdminSettingsState> {
  private siteConfigTextAreaId = `site-config-${randomStr()}`;
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: AdminSettingsState = {
    siteRes: this.isoData.site_res,
    siteConfigForm: {
      config_hjson: null,
      auth: null,
    },
    siteConfigRes: {
      config_hjson: null,
    },
    banned: [],
    loading: true,
    siteConfigLoading: null,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.siteConfigRes = this.isoData.routeData[0];
      this.state.siteConfigForm.config_hjson =
        this.state.siteConfigRes.config_hjson;
      this.state.banned = this.isoData.routeData[1].banned;
      this.state.siteConfigLoading = false;
      this.state.loading = false;
    } else {
      this.state.siteConfigForm.auth = authField();
      WebSocketService.Instance.send(
        wsClient.getSiteConfig({
          auth: authField(),
        })
      );
      WebSocketService.Instance.send(
        wsClient.getBannedPersons({
          auth: authField(),
        })
      );
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let siteConfigForm: GetSiteConfig = { auth: req.auth };
    promises.push(req.client.getSiteConfig(siteConfigForm));

    let bannedPersonsForm: GetBannedPersons = { auth: req.auth };
    promises.push(req.client.getBannedPersons(bannedPersonsForm));

    return promises;
  }

  componentDidMount() {
    if (isBrowser()) {
      var textarea: any = document.getElementById(this.siteConfigTextAreaId);
      autosize(textarea);
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("admin_settings")} - ${
      this.state.siteRes.site_view.site.name
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
            <div class="col-12 col-md-6">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
              />
              {this.state.siteRes.site_view.site.id && (
                <SiteForm site={this.state.siteRes.site_view.site} />
              )}
              {this.admins()}
              {this.bannedUsers()}
            </div>
            <div class="col-12 col-md-6">{this.adminSettings()}</div>
          </div>
        )}
      </div>
    );
  }

  admins() {
    return (
      <>
        <h5>{capitalizeFirstLetter(i18n.t("admins"))}</h5>
        <ul class="list-unstyled">
          {this.state.siteRes.admins.map(admin => (
            <li class="list-inline-item">
              <PersonListing person={admin.person} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  bannedUsers() {
    return (
      <>
        <h5>{i18n.t("banned_users")}</h5>
        <ul class="list-unstyled">
          {this.state.banned.map(banned => (
            <li class="list-inline-item">
              <PersonListing person={banned.person} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  adminSettings() {
    return (
      <div>
        <h5>{i18n.t("admin_settings")}</h5>
        <form onSubmit={linkEvent(this, this.handleSiteConfigSubmit)}>
          <div class="form-group row">
            <label
              class="col-12 col-form-label"
              htmlFor={this.siteConfigTextAreaId}
            >
              {i18n.t("site_config")}
            </label>
            <div class="col-12">
              <textarea
                id={this.siteConfigTextAreaId}
                value={this.state.siteConfigForm.config_hjson}
                onInput={linkEvent(this, this.handleSiteConfigHjsonChange)}
                class="form-control text-monospace"
                rows={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <button type="submit" class="btn btn-secondary mr-2">
                {this.state.siteConfigLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("save"))
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  handleSiteConfigSubmit(i: AdminSettings, event: any) {
    event.preventDefault();
    i.state.siteConfigLoading = true;
    WebSocketService.Instance.send(
      wsClient.saveSiteConfig(i.state.siteConfigForm)
    );
    i.setState(i.state);
  }

  handleSiteConfigHjsonChange(i: AdminSettings, event: any) {
    i.state.siteConfigForm.config_hjson = event.target.value;
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.context.router.history.push("/");
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg).data;
      this.state.siteRes.site_view = data.site_view;
      this.setState(this.state);
      toast(i18n.t("site_saved"));
    } else if (op == UserOperation.GetBannedPersons) {
      let data = wsJsonToRes<BannedPersonsResponse>(msg).data;
      this.state.banned = data.banned;
      this.setState(this.state);
    } else if (op == UserOperation.GetSiteConfig) {
      let data = wsJsonToRes<GetSiteConfigResponse>(msg).data;
      this.state.siteConfigRes = data;
      this.state.loading = false;
      this.state.siteConfigForm.config_hjson =
        this.state.siteConfigRes.config_hjson;
      this.setState(this.state);
      var textarea: any = document.getElementById(this.siteConfigTextAreaId);
      autosize(textarea);
    } else if (op == UserOperation.SaveSiteConfig) {
      let data = wsJsonToRes<GetSiteConfigResponse>(msg).data;
      this.state.siteConfigRes = data;
      this.state.siteConfigForm.config_hjson =
        this.state.siteConfigRes.config_hjson;
      this.state.siteConfigLoading = false;
      toast(i18n.t("site_saved"));
      this.setState(this.state);
    }
  }
}
