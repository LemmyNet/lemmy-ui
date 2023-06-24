import { myAuthRequired } from "@utils/app";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CreatePrivateMessage,
  EditPrivateMessage,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { relTags } from "../../config";
import { I18NextService } from "../../services";
import { setupTippy } from "../../tippy";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import NavigationPrompt from "../common/navigation-prompt";
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
  submitted: boolean;
}

export class PrivateMessageForm extends Component<
  PrivateMessageFormProps,
  PrivateMessageFormState
> {
  state: PrivateMessageFormState = {
    loading: false,
    previewMode: false,
    showDisclaimer: false,
    content: this.props.privateMessageView
      ? this.props.privateMessageView.private_message.content
      : undefined,
    submitted: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleContentChange = this.handleContentChange.bind(this);
  }

  componentDidMount() {
    setupTippy();
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PrivateMessageFormProps>
  ): void {
    if (this.props != nextProps) {
      this.setState({ loading: false, content: undefined, previewMode: false });
    }
  }
  // TODO
  // <Prompt
  //   when={!this.state.loading && this.state.content}
  //   message={I18NextService.i18n.t("block_leaving")}
  // />

  render() {
    return (
      <form
        className="private-message-form"
        onSubmit={linkEvent(this, this.handlePrivateMessageSubmit)}
      >
        <NavigationPrompt
          when={
            !this.state.loading && !!this.state.content && !this.state.submitted
          }
        />
        {!this.props.privateMessageView && (
          <div className="mb-3 row">
            <label className="col-sm-2 col-form-label">
              {capitalizeFirstLetter(I18NextService.i18n.t("to"))}
            </label>

            <div className="col-sm-10 form-control-plaintext">
              <PersonListing person={this.props.recipient} />
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("message")}
            <button
              className="btn btn-link text-warning d-inline-block"
              onClick={linkEvent(this, this.handleShowDisclaimer)}
              data-tippy-content={I18NextService.i18n.t(
                "private_message_disclaimer"
              )}
              aria-label={I18NextService.i18n.t("private_message_disclaimer")}
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
              hideNavigationWarnings
            />
          </div>
        </div>

        {this.state.showDisclaimer && (
          <div className="mb-3 row">
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
        <div className="mb-3 row">
          <div className="offset-sm-2 col-sm-10">
            <button
              type="submit"
              className="btn btn-secondary me-2"
              disabled={this.state.loading}
            >
              {this.state.loading ? (
                <Spinner />
              ) : this.props.privateMessageView ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("send_message"))
              )}
            </button>
            {this.props.privateMessageView && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={linkEvent(this, this.handleCancel)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            )}
            <ul className="d-inline-block float-right list-inline mb-1 text-muted fw-bold">
              <li className="list-inline-item"></li>
            </ul>
          </div>
        </div>
      </form>
    );
  }

  handlePrivateMessageSubmit(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    i.setState({ loading: true, submitted: true });
    const pm = i.props.privateMessageView;
    const auth = myAuthRequired();
    const content = i.state.content ?? "";
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
