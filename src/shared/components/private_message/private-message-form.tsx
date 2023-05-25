import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Prompt } from "inferno-router";
import {
  CreatePrivateMessage,
  EditPrivateMessage,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import {
  capitalizeFirstLetter,
  myAuthRequired,
  relTags,
  setupTippy,
} from "../../utils";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PersonListing } from "../person/person-listing";

interface PrivateMessageFormProps {
  recipient: Person;
  privateMessageView?: PrivateMessageView; // If a pm is given, that means this is an edit
  onCancel?(): any;
  onCreate?(form: CreatePrivateMessage): void;
  onEdit?(form: EditPrivateMessage): void;
}

interface PrivateMessageFormState {
  content?: string;
  loading: boolean;
  previewMode: boolean;
  showDisclaimer: boolean;
}

export class PrivateMessageForm extends Component<
  PrivateMessageFormProps,
  PrivateMessageFormState
> {
  state: PrivateMessageFormState = {
    loading: false,
    previewMode: false,
    showDisclaimer: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleContentChange = this.handleContentChange.bind(this);

    // Its an edit
    if (this.props.privateMessageView) {
      this.state.content =
        this.props.privateMessageView.private_message.content;
    }
  }

  componentDidMount() {
    setupTippy();
  }

  // TODO what is this
  componentDidUpdate() {
    if (!this.state.loading && this.state.content) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
  }

  render() {
    return (
      <div>
        <Prompt
          when={!this.state.loading && this.state.content}
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handlePrivateMessageSubmit)}>
          {!this.props.privateMessageView && (
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
                initialContent={this.state.content}
                onContentChange={this.handleContentChange}
                allLanguages={[]}
                siteLanguages={[]}
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
                ) : this.props.privateMessageView ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("send_message"))
                )}
              </button>
              {this.props.privateMessageView && (
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

  handlePrivateMessageSubmit(i: PrivateMessageForm) {
    i.setState({ loading: true });
    let pm = i.props.privateMessageView;
    let auth = myAuthRequired();
    let content = i.state.content ?? "";
    if (pm) {
      i.props.onEdit?.({
        private_message_id: pm.private_message.id,
        content,
        auth,
      });
    } else {
      i.props.onCreate?.({
        content,
        recipient_id: i.props.recipient.id,
        auth,
      });
    }
  }

  handleContentChange(val: string) {
    this.setState({ content: val });
  }

  handleCancel(i: PrivateMessageForm) {
    i.props.onCancel?.();
  }

  handlePreviewToggle(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    i.setState({ previewMode: !i.state.previewMode });
  }

  handleShowDisclaimer(i: PrivateMessageForm) {
    i.setState({ showDisclaimer: !i.state.showDisclaimer });
  }
}
