import { Component } from 'inferno';
import { Subscription } from 'rxjs';
import { CommunityForm } from './community-form';
import { HtmlTags } from './html-tags';
import { Spinner } from './icon';
import {
  CommunityView,
  UserOperation,
  SiteView,
  ListCategoriesResponse,
  Category,
} from 'lemmy-js-client';
import {
  setIsoData,
  toast,
  wsJsonToRes,
  wsSubscribe,
  isBrowser,
  wsUserOp,
  wsClient,
} from '../utils';
import { WebSocketService, UserService } from '../services';
import { i18n } from '../i18next';
import { InitialFetchRequest } from 'shared/interfaces';

interface CreateCommunityState {
  site_view: SiteView;
  categories: Category[];
  loading: boolean;
}

export class CreateCommunity extends Component<any, CreateCommunityState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreateCommunityState = {
    site_view: this.isoData.site_res.site_view,
    categories: [],
    loading: true,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.handleCommunityCreate = this.handleCommunityCreate.bind(this);
    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (!UserService.Instance.user && isBrowser()) {
      toast(i18n.t('not_logged_in'), 'danger');
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.categories = this.isoData.routeData[0].categories;
      this.state.loading = false;
    } else {
      WebSocketService.Instance.send(wsClient.listCategories());
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t('create_community')} - ${this.state.site_view.site.name}`;
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
            <Spinner />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t('create_community')}</h5>
              <CommunityForm
                categories={this.state.categories}
                onCreate={this.handleCommunityCreate}
                enableNsfw={this.state.site_view.site.enable_nsfw}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  handleCommunityCreate(cv: CommunityView) {
    this.props.history.push(`/c/${cv.community.name}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    return [req.client.listCategories()];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      // Toast errors are already handled by community-form
      return;
    } else if (op == UserOperation.ListCategories) {
      let data = wsJsonToRes<ListCategoriesResponse>(msg).data;
      this.state.categories = data.categories;
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
