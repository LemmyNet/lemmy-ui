import { Component, linkEvent } from 'inferno';
import { Subscription } from 'rxjs';
import {
  UserOperation,
  SiteResponse,
  GetSiteResponse,
  SaveSiteConfig,
  GetSiteConfigResponse,
  GetSiteConfig,
} from 'lemmy-js-client';
import { UserService, WebSocketService } from '../services';
import {
  wsJsonToRes,
  capitalizeFirstLetter,
  toast,
  randomStr,
  setIsoData,
  wsSubscribe,
  isBrowser,
  wsUserOp,
} from '../utils';
import autosize from 'autosize';
import { SiteForm } from './site-form';
import { UserListing } from './user-listing';
import { HtmlTags } from './html-tags';
import { i18n } from '../i18next';
import { InitialFetchRequest } from 'shared/interfaces';

interface AdminSettingsState {
  siteRes: GetSiteResponse;
  siteConfigRes: GetSiteConfigResponse;
  siteConfigForm: SaveSiteConfig;
  loading: boolean;
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
      auth: UserService.Instance.authField(),
    },
    siteConfigRes: {
      config_hjson: null,
    },
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
      this.state.siteConfigForm.config_hjson = this.state.siteConfigRes.config_hjson;
      this.state.siteConfigLoading = false;
      this.state.loading = false;
    } else {
      WebSocketService.Instance.client.getSiteConfig({
        auth: UserService.Instance.authField(),
      });
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let form: GetSiteConfig = { auth: req.auth };
    return [req.client.getSiteConfig(form)];
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
    return `${i18n.t('admin_settings')} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <svg class="icon icon-spinner spin">
              <use xlinkHref="#icon-spinner"></use>
            </svg>
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-md-6">
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
        <h5>{capitalizeFirstLetter(i18n.t('admins'))}</h5>
        <ul class="list-unstyled">
          {this.state.siteRes.admins.map(admin => (
            <li class="list-inline-item">
              <UserListing user={admin.user} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  bannedUsers() {
    return (
      <>
        <h5>{i18n.t('banned_users')}</h5>
        <ul class="list-unstyled">
          {this.state.siteRes.banned.map(banned => (
            <li class="list-inline-item">
              <UserListing user={banned.user} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  adminSettings() {
    return (
      <div>
        <h5>{i18n.t('admin_settings')}</h5>
        <form onSubmit={linkEvent(this, this.handleSiteConfigSubmit)}>
          <div class="form-group row">
            <label
              class="col-12 col-form-label"
              htmlFor={this.siteConfigTextAreaId}
            >
              {i18n.t('site_config')}
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
                  <svg class="icon icon-spinner spin">
                    <use xlinkHref="#icon-spinner"></use>
                  </svg>
                ) : (
                  capitalizeFirstLetter(i18n.t('save'))
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
    WebSocketService.Instance.client.saveSiteConfig(i.state.siteConfigForm);
    i.setState(i.state);
  }

  handleSiteConfigHjsonChange(i: AdminSettings, event: any) {
    i.state.siteConfigForm.config_hjson = event.target.value;
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.context.router.history.push('/');
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (msg.reconnect) {
    } else if (op == UserOperation.EditSite) {
      let data = wsJsonToRes<SiteResponse>(msg).data;
      this.state.siteRes.site_view = data.site_view;
      this.setState(this.state);
      toast(i18n.t('site_saved'));
    } else if (op == UserOperation.GetSiteConfig) {
      let data = wsJsonToRes<GetSiteConfigResponse>(msg).data;
      this.state.siteConfigRes = data;
      this.state.loading = false;
      this.state.siteConfigForm.config_hjson = this.state.siteConfigRes.config_hjson;
      this.setState(this.state);
      var textarea: any = document.getElementById(this.siteConfigTextAreaId);
      autosize(textarea);
    } else if (op == UserOperation.SaveSiteConfig) {
      let data = wsJsonToRes<GetSiteConfigResponse>(msg).data;
      this.state.siteConfigRes = data;
      this.state.siteConfigForm.config_hjson = this.state.siteConfigRes.config_hjson;
      this.state.siteConfigLoading = false;
      toast(i18n.t('site_saved'));
      this.setState(this.state);
    }
  }
}
