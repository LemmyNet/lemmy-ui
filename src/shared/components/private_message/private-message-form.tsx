import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Prompt } from "inferno-router";
import {
  CreatePrivateMessage,
  EditPrivateMessage,
  PersonSafe,
  PrivateMessageResponse,
  PrivateMessageView,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  authField,
  capitalizeFirstLetter,
  isBrowser,
  relTags,
  setupTippy,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PersonListing } from "../person/person-listing";

interface PrivateMessageFormProps {
  recipient: PersonSafe;
  privateMessage?: PrivateMessageView; // If a pm is given, that means this is an edit
  onCancel?(): any;
  onCreate?(message: PrivateMessageView): any;
  onEdit?(message: PrivateMessageView): any;
}

interface PrivateMessageFormState {
  privateMessageForm: CreatePrivateMessage;
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
      auth: authField(),
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

    // Its an edit
    if (this.props.privateMessage) {
      this.state.privateMessageForm.content =
        this.props.privateMessage.private_message.content;
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
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handlePrivateMessageSubmit)}>
          {!this.props.privateMessage && (
            <div class="form-group row">
              <label class="col-sm-2 col-form-label">
                {capitalizeFirstLetter(i18n.t("to"))}
              </label>

              <div class="col-sm-10 form-control-plaintext">
                <PersonListing person={this.props.recipient} />
              </div>
            </div>
          )}
          <div class="form-group row">
            <label class="col-sm-2 col-form-label">
              {i18n.t("message")}
              <button
                class="btn btn-link text-warning d-inline-block"
                onClick={linkEvent(this, this.handleShowDisclaimer)}
                data-tippy-content={i18n.t("private_message_disclaimer")}
                aria-label={i18n.t("private_message_disclaimer")}
              >
                <Icon icon="alert-triangle" classes="icon-inline" />
              </button>
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
                      rel={relTags}
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
                  <Spinner />
                ) : this.props.privateMessage ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("send_message"))
                )}
              </button>
              {this.props.privateMessage && (
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={linkEvent(this, this.handleCancel)}
                >
                  {i18n.t("cancel")}
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
      let form: EditPrivateMessage = {
        private_message_id: i.props.privateMessage.private_message.id,
        content: i.state.privateMessageForm.content,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.editPrivateMessage(form));
    } else {
      WebSocketService.Instance.send(
        wsClient.createPrivateMessage(i.state.privateMessageForm)
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

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.state.loading = false;
      this.setState(this.state);
      return;
    } else if (
      op == UserOperation.EditPrivateMessage ||
      op == UserOperation.DeletePrivateMessage ||
      op == UserOperation.MarkPrivateMessageAsRead
    ) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      this.state.loading = false;
      this.props.onEdit(data.private_message_view);
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      this.state.loading = false;
      this.props.onCreate(data.private_message_view);
      this.setState(this.state);
    }
  }
}
