import { None, Option, Some } from "@sniptt/monads";
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
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  auth,
  capitalizeFirstLetter,
  isBrowser,
  relTags,
  setupTippy,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PersonListing } from "../person/person-listing";

interface PrivateMessageFormProps {
  recipient: PersonSafe;
  privateMessageView: Option<PrivateMessageView>; // If a pm is given, that means this is an edit
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
    privateMessageForm: new CreatePrivateMessage({
      content: null,
      recipient_id: this.props.recipient.id,
      auth: auth().unwrap(),
    }),
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
    if (this.props.privateMessageView.isSome()) {
      this.state.privateMessageForm.content =
        this.props.privateMessageView.unwrap().private_message.content;
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
          {this.props.privateMessageView.isNone() && (
            <div className="form-group row">
              <label className="col-sm-2 col-form-label">
                {capitalizeFirstLetter(i18n.t("to"))}
              </label>

              <div className="col-sm-10 form-control-plaintext">
                <PersonListing person={this.props.recipient} />
              </div>
            </div>
          )}
          <div className="form-group row">
            <label className="col-sm-2 col-form-label">
              {i18n.t("message")}
              <button
                className="btn btn-link text-warning d-inline-block"
                onClick={linkEvent(this, this.handleShowDisclaimer)}
                data-tippy-content={i18n.t("private_message_disclaimer")}
                aria-label={i18n.t("private_message_disclaimer")}
              >
                <Icon icon="alert-triangle" classes="icon-inline" />
              </button>
            </label>
            <div className="col-sm-10">
              <MarkdownTextArea
                initialContent={Some(this.state.privateMessageForm.content)}
                placeholder={None}
                buttonTitle={None}
                maxLength={None}
                onContentChange={this.handleContentChange}
              />
            </div>
          </div>

          {this.state.showDisclaimer && (
            <div className="form-group row">
              <div className="offset-sm-2 col-sm-10">
                <div className="alert alert-danger" role="alert">
                  <T i18nKey="private_message_disclaimer">
                    #
                    <a
                      className="alert-link"
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
          <div className="form-group row">
            <div className="offset-sm-2 col-sm-10">
              <button
                type="submit"
                className="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : this.props.privateMessageView.isSome() ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("send_message"))
                )}
              </button>
              {this.props.privateMessageView.isSome() && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={linkEvent(this, this.handleCancel)}
                >
                  {i18n.t("cancel")}
                </button>
              )}
              <ul className="d-inline-block float-right list-inline mb-1 text-muted font-weight-bold">
                <li className="list-inline-item"></li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    );
  }

  handlePrivateMessageSubmit(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    i.props.privateMessageView.match({
      some: pm => {
        let form = new EditPrivateMessage({
          private_message_id: pm.private_message.id,
          content: i.state.privateMessageForm.content,
          auth: auth().unwrap(),
        });
        WebSocketService.Instance.send(wsClient.editPrivateMessage(form));
      },
      none: WebSocketService.Instance.send(
        wsClient.createPrivateMessage(i.state.privateMessageForm)
      ),
    });
    i.setState({ loading: true });
  }

  handleContentChange(val: string) {
    this.setState(s => ((s.privateMessageForm.content = val), s));
  }

  handleCancel(i: PrivateMessageForm) {
    i.props.onCancel();
  }

  handlePreviewToggle(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    i.setState({ previewMode: !i.state.previewMode });
  }

  handleShowDisclaimer(i: PrivateMessageForm) {
    i.setState({ showDisclaimer: !i.state.showDisclaimer });
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ loading: false });
      return;
    } else if (
      op == UserOperation.EditPrivateMessage ||
      op == UserOperation.DeletePrivateMessage ||
      op == UserOperation.MarkPrivateMessageAsRead
    ) {
      let data = wsJsonToRes<PrivateMessageResponse>(
        msg,
        PrivateMessageResponse
      );
      this.setState({ loading: false });
      this.props.onEdit(data.private_message_view);
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(
        msg,
        PrivateMessageResponse
      );
      this.props.onCreate(data.private_message_view);
    }
  }
}
