import { Component, linkEvent } from 'inferno';
import { Prompt } from 'inferno-router';
import { Subscription } from 'rxjs';
import {
  PrivateMessageForm as PrivateMessageFormI,
  EditPrivateMessageForm,
  PrivateMessage,
  PrivateMessageResponse,
  UserView,
  UserOperation,
  WebSocketJsonResponse,
} from 'lemmy-js-client';
import { WebSocketService } from '../services';
import {
  capitalizeFirstLetter,
  wsJsonToRes,
  toast,
  setupTippy,
  wsSubscribe,
  isBrowser,
} from '../utils';
import { UserListing } from './user-listing';
import { MarkdownTextArea } from './markdown-textarea';
import { i18n } from '../i18next';
import { T } from 'inferno-i18next';

interface PrivateMessageFormProps {
  recipient: UserView;
  privateMessage?: PrivateMessage; // If a pm is given, that means this is an edit
  onCancel?(): any;
  onCreate?(message: PrivateMessage): any;
  onEdit?(message: PrivateMessage): any;
}

interface PrivateMessageFormState {
  privateMessageForm: PrivateMessageFormI;
  loading: boolean;
  previewMode: boolean;
  showDisclaimer: boolean;
}

export class PrivateMessageForm extends Component<
  PrivateMessageFormProps,
  PrivateMessageFormState
> {
  private subscription: Subscription;
  private emptyState: PrivateMessageFormState = {
    privateMessageForm: {
      content: null,
      recipient_id: this.props.recipient.id,
    },
    loading: false,
    previewMode: false,
    showDisclaimer: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.handleContentChange = this.handleContentChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (this.props.privateMessage) {
      this.state.privateMessageForm = {
        content: this.props.privateMessage.content,
        recipient_id: this.props.privateMessage.recipient_id,
      };
    }
  }

  componentDidMount() {
    setupTippy();
  }

  componentDidUpdate() {
    if (!this.state.loading && this.state.privateMessageForm.content) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
      window.onbeforeunload = null;
    }
  }

  render() {
    return (
      <div>
        <Prompt
          when={!this.state.loading && this.state.privateMessageForm.content}
          message={i18n.t('block_leaving')}
        />
        <form onSubmit={linkEvent(this, this.handlePrivateMessageSubmit)}>
          {!this.props.privateMessage && (
            <div class="form-group row">
              <label class="col-sm-2 col-form-label">
                {capitalizeFirstLetter(i18n.t('to'))}
              </label>

              <div class="col-sm-10 form-control-plaintext">
                <UserListing
                  user={{
                    name: this.props.recipient.name,
                    preferred_username: this.props.recipient.preferred_username,
                    avatar: this.props.recipient.avatar,
                    id: this.props.recipient.id,
                    local: this.props.recipient.local,
                    actor_id: this.props.recipient.actor_id,
                  }}
                />
              </div>
            </div>
          )}
          <div class="form-group row">
            <label class="col-sm-2 col-form-label">
              {i18n.t('message')}
              <span
                onClick={linkEvent(this, this.handleShowDisclaimer)}
                class="ml-2 pointer text-danger"
                data-tippy-content={i18n.t('disclaimer')}
              >
                <svg class={`icon icon-inline`}>
                  <use xlinkHref="#icon-alert-triangle"></use>
                </svg>
              </span>
            </label>
            <div class="col-sm-10">
              <MarkdownTextArea
                initialContent={this.state.privateMessageForm.content}
                onContentChange={this.handleContentChange}
              />
            </div>
          </div>

          {this.state.showDisclaimer && (
            <div class="form-group row">
              <div class="offset-sm-2 col-sm-10">
                <div class="alert alert-danger" role="alert">
                  <T i18nKey="private_message_disclaimer">
                    #
                    <a
                      class="alert-link"
                      target="_blank"
                      rel="noopener"
                      href="https://element.io/get-started"
                    >
                      #
                    </a>
                  </T>
                </div>
              </div>
            </div>
          )}
          <div class="form-group row">
            <div class="offset-sm-2 col-sm-10">
              <button
                type="submit"
                class="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <svg class="icon icon-spinner spin">
                    <use xlinkHref="#icon-spinner"></use>
                  </svg>
                ) : this.props.privateMessage ? (
                  capitalizeFirstLetter(i18n.t('save'))
                ) : (
                  capitalizeFirstLetter(i18n.t('send_message'))
                )}
              </button>
              {this.props.privateMessage && (
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={linkEvent(this, this.handleCancel)}
                >
                  {i18n.t('cancel')}
                </button>
              )}
              <ul class="d-inline-block float-right list-inline mb-1 text-muted font-weight-bold">
                <li class="list-inline-item"></li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    );
  }

  handlePrivateMessageSubmit(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    if (i.props.privateMessage) {
      let editForm: EditPrivateMessageForm = {
        edit_id: i.props.privateMessage.id,
        content: i.state.privateMessageForm.content,
      };
      WebSocketService.Instance.editPrivateMessage(editForm);
    } else {
      WebSocketService.Instance.createPrivateMessage(
        i.state.privateMessageForm
      );
    }
    i.state.loading = true;
    i.setState(i.state);
  }

  handleContentChange(val: string) {
    this.state.privateMessageForm.content = val;
    this.setState(this.state);
  }

  handleCancel(i: PrivateMessageForm) {
    i.props.onCancel();
  }

  handlePreviewToggle(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    i.state.previewMode = !i.state.previewMode;
    i.setState(i.state);
  }

  handleShowDisclaimer(i: PrivateMessageForm) {
    i.state.showDisclaimer = !i.state.showDisclaimer;
    i.setState(i.state);
  }

  parseMessage(msg: WebSocketJsonResponse) {
    let res = wsJsonToRes(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (
      res.op == UserOperation.EditPrivateMessage ||
      res.op == UserOperation.DeletePrivateMessage ||
      res.op == UserOperation.MarkPrivateMessageAsRead
    ) {
      let data = res.data as PrivateMessageResponse;
      this.state.loading = false;
      this.props.onEdit(data.message);
    } else if (res.op == UserOperation.CreatePrivateMessage) {
      let data = res.data as PrivateMessageResponse;
      this.state.loading = false;
      this.props.onCreate(data.message);
      this.setState(this.state);
    }
  }
}
