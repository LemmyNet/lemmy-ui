import { Component } from 'inferno';
import { Subscription } from 'rxjs';
import { PostForm } from './post-form';
import { HtmlTags } from './html-tags';
import { Spinner } from './icon';
import {
  authField,
  isBrowser,
  setIsoData,
  setOptionalAuth,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from '../utils';
import { UserService, WebSocketService } from '../services';
import {
  UserOperation,
  ListCommunitiesResponse,
  CommunityView,
  SiteView,
  ListCommunities,
  SortType,
  ListingType,
  PostView,
} from 'lemmy-js-client';
import { i18n } from '../i18next';
import { InitialFetchRequest, PostFormParams } from 'shared/interfaces';

interface CreatePostState {
  site_view: SiteView;
  communities: CommunityView[];
  loading: boolean;
}

export class CreatePost extends Component<any, CreatePostState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreatePostState = {
    site_view: this.isoData.site_res.site_view,
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
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.All,
      sort: SortType.TopAll,
      limit: 9999,
      auth: authField(false),
    };
    WebSocketService.Instance.send(
      wsClient.listCommunities(listCommunitiesForm)
    );
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t('create_post')} - ${this.state.site_view.site.name}`;
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
              <h5>{i18n.t('create_post')}</h5>
              <PostForm
                communities={this.state.communities}
                onCreate={this.handlePostCreate}
                params={this.params}
                enableDownvotes={this.state.site_view.site.enable_downvotes}
                enableNsfw={this.state.site_view.site.enable_nsfw}
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

  handlePostCreate(post_view: PostView) {
    this.props.history.push(`/post/${post_view.post.id}`);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let listCommunitiesForm: ListCommunities = {
      type_: ListingType.All,
      sort: SortType.TopAll,
      limit: 9999,
    };
    setOptionalAuth(listCommunitiesForm, req.auth);
    return [req.client.listCommunities(listCommunitiesForm)];
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg).data;
      this.state.communities = data.communities;
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
