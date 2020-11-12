import { Component } from 'inferno';
import { Subscription } from 'rxjs';
import { CommunityForm } from './community-form';
import { HtmlTags } from './html-tags';
import {
  Community,
  UserOperation,
  WebSocketJsonResponse,
  Site,
  ListCategoriesResponse,
  Category,
} from 'lemmy-js-client';
import {
  setIsoData,
  toast,
  wsJsonToRes,
  wsSubscribe,
  isBrowser,
} from '../utils';
import { WebSocketService, UserService } from '../services';
import { i18n } from '../i18next';
import { InitialFetchRequest } from 'shared/interfaces';

interface CreateCommunityState {
  site: Site;
  categories: Category[];
  loading: boolean;
}

export class CreateCommunity extends Component<any, CreateCommunityState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreateCommunityState = {
    site: this.isoData.site.site,
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
      WebSocketService.Instance.listCategories();
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t('create_community')} - ${this.state.site.name}`;
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
            <div class="col-12 col-lg-6 offset-lg-3 mb-4">
              <h5>{i18n.t('create_community')}</h5>
              <CommunityForm
                categories={this.state.categories}
                onCreate={this.handleCommunityCreate}
                enableNsfw={this.state.site.enable_nsfw}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  handleCommunityCreate(community: Community) {
    this.props.history.push(`/c/${community.name}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    return [req.client.listCategories()];
  }

  parseMessage(msg: WebSocketJsonResponse) {
    console.log(msg);
    let res = wsJsonToRes(msg);
    if (msg.error) {
      // Toast errors are already handled by community-form
      return;
    } else if (res.op == UserOperation.ListCategories) {
      let data = res.data as ListCategoriesResponse;
      this.state.categories = data.categories;
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
