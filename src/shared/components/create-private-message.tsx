import { Component } from 'inferno';
import { Subscription } from 'rxjs';
import { PrivateMessageForm } from './private-message-form';
import { HtmlTags } from './html-tags';
import { UserService, WebSocketService } from '../services';
import {
  SiteView,
  UserOperation,
  GetUserDetailsResponse,
  UserViewSafe,
  SortType,
  GetUserDetails,
} from 'lemmy-js-client';
import {
  getRecipientIdFromProps,
  isBrowser,
  setIsoData,
  toast,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from '../utils';
import { i18n } from '../i18next';
import { InitialFetchRequest } from 'shared/interfaces';

interface CreatePrivateMessageProps {}

interface CreatePrivateMessageState {
  site_view: SiteView;
  recipient: UserViewSafe;
  recipient_id: number;
  loading: boolean;
}

export class CreatePrivateMessage extends Component<
  CreatePrivateMessageProps,
  CreatePrivateMessageState
> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: CreatePrivateMessageState = {
    site_view: this.isoData.site_res.site_view,
    recipient: undefined,
    recipient_id: getRecipientIdFromProps(this.props),
    loading: true,
  };
  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handlePrivateMessageCreate = this.handlePrivateMessageCreate.bind(
      this
    );

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (!UserService.Instance.user) {
      toast(i18n.t('not_logged_in'), 'danger');
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.recipient = this.isoData.routeData[0].user;
      this.state.loading = false;
    } else {
      this.fetchUserDetails();
    }
  }

  fetchUserDetails() {
    let form: GetUserDetails = {
      user_id: this.state.recipient_id,
      sort: SortType.New,
      saved_only: false,
      auth: UserService.Instance.authField(false),
    };
    WebSocketService.Instance.client.getUserDetails(form);
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let user_id = Number(req.path.split('/').pop());
    let form: GetUserDetails = {
      user_id,
      sort: SortType.New,
      saved_only: false,
      auth: req.auth,
    };
    return [req.client.getUserDetails(form)];
  }

  get documentTitle(): string {
    return `${i18n.t('create_private_message')} - ${
      this.state.site_view.site.name
    }`;
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
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
              <h5>{i18n.t('create_private_message')}</h5>
              <PrivateMessageForm
                onCreate={this.handlePrivateMessageCreate}
                recipient={this.state.recipient.user}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  handlePrivateMessageCreate() {
    toast(i18n.t('message_sent'));

    // Navigate to the front
    this.context.router.history.push(`/`);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (op == UserOperation.GetUserDetails) {
      let data = wsJsonToRes<GetUserDetailsResponse>(msg).data;
      this.state.recipient = data.user_view;
      this.state.loading = false;
      this.setState(this.state);
    }
  }
}
