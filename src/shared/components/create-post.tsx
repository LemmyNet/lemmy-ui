import { Component } from 'inferno';
import { Subscription } from 'rxjs';
import { PostForm } from './post-form';
import { HtmlTags } from './html-tags';
import {
  isBrowser,
  setAuth,
  setIsoData,
  toast,
  wsJsonToRes,
  wsSubscribe,
} from '../utils';
import { UserService, WebSocketService } from '../services';
import {
  UserOperation,
  PostFormParams,
  WebSocketJsonResponse,
  ListCommunitiesResponse,
  Community,
  Site,
  ListCommunitiesForm,
  SortType,
} from 'lemmy-js-client';
import { i18n } from '../i18next';
import { InitialFetchRequest } from 'shared/interfaces';

interface CreatePostState {
  site: Site;
  communities: Community[];
  loading: boolean;
}

export class CreatePost extends Component<any, CreatePostState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreatePostState = {
    site: this.isoData.site.site,
    communities: [],
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePostCreate = this.handlePostCreate.bind(this);
    this.state = this.emptyState;

    if (!UserService.Instance.user && isBrowser()) {
      toast(i18n.t('not_logged_in'), 'danger');
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.communities = this.isoData.routeData[0].communities;
      this.state.loading = false;
    } else {
      this.refetch();
    }
  }

  refetch() {
    let listCommunitiesForm: ListCommunitiesForm = {
      sort: SortType.TopAll,
      limit: 9999,
    };
    WebSocketService.Instance.listCommunities(listCommunitiesForm);
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t('create_post')} - ${this.state.site.name}`;
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
              <h5>{i18n.t('create_post')}</h5>
              <PostForm
                communities={this.state.communities}
                onCreate={this.handlePostCreate}
                params={this.params}
                enableDownvotes={this.state.site.enable_downvotes}
                enableNsfw={this.state.site.enable_nsfw}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  get params(): PostFormParams {
    let urlParams = new URLSearchParams(this.props.location.search);
    let params: PostFormParams = {
      name: urlParams.get('title'),
      community_name: urlParams.get('community_name') || this.prevCommunityName,
      community_id: urlParams.get('community_id')
        ? Number(urlParams.get('community_id')) || this.prevCommunityId
        : null,
      body: urlParams.get('body'),
      url: urlParams.get('url'),
    };

    return params;
  }

  get prevCommunityName(): string {
    if (this.props.match.params.name) {
      return this.props.match.params.name;
    } else if (this.props.location.state) {
      let lastLocation = this.props.location.state.prevPath;
      if (lastLocation.includes('/c/')) {
        return lastLocation.split('/c/')[1];
      }
    }
    return null;
  }

  get prevCommunityId(): number {
    if (this.props.match.params.id) {
      return this.props.match.params.id;
    } else if (this.props.location.state) {
      let lastLocation = this.props.location.state.prevPath;
      if (lastLocation.includes('/community/')) {
        return Number(lastLocation.split('/community/')[1]);
      }
    }
    return null;
  }

  handlePostCreate(id: number) {
    this.props.history.push(`/post/${id}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let listCommunitiesForm: ListCommunitiesForm = {
      sort: SortType.TopAll,
      limit: 9999,
    };
    setAuth(listCommunitiesForm, req.auth);
    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: WebSocketJsonResponse) {
    console.log(msg);
    let res = wsJsonToRes(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      return;
    } else if (res.op == UserOperation.ListCommunities) {
      let data = res.data as ListCommunitiesResponse;
      this.state.communities = data.communities;
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
