import { Component } from 'inferno';
import { Helmet } from 'inferno-helmet';
import { Subscription } from 'rxjs';
import { PostForm } from './post-form';
import {
  lemmyHttp,
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

    if (!UserService.Instance.user) {
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
    this.subscription.unsubscribe();
  }

  get documentTitle(): string {
    return `${i18n.t('create_post')} - ${this.state.site.name}`;
  }

  render() {
    return (
      <div class="container">
        <Helmet title={this.documentTitle} />
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
      community: urlParams.get('community') || this.prevCommunityName,
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

  handlePostCreate(id: number) {
    this.props.history.push(`/post/${id}`);
  }

  static fetchInitialData(auth: string, _path: string): Promise<any>[] {
    let listCommunitiesForm: ListCommunitiesForm = {
      sort: SortType.TopAll,
      limit: 9999,
    };
    setAuth(listCommunitiesForm, auth);
    return [lemmyHttp.listCommunities(listCommunitiesForm)];
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
