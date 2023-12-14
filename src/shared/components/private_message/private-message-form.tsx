import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, InfernoNode } from "@/inferno";
import { T } from "inferno-i18next-dess";
import { Prompt } from "@/inferno-router";
import {
  CreatePrivateMessage,
  EditPrivateMessage,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { relTags } from "../../config";
import { I18NextService } from "../../services";
import { setupTippy } from "../../tippy";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PersonListing } from "../person/person-listing";

interface PrivateMessageFormProps {
  recipient: Person;
  privateMessageView?: PrivateMessageView; // If a pm is given, that means this is an edit
  replyType?: boolean;
  onCancel?(): any;
  onCreate?(form: CreatePrivateMessage): void;
  onEdit?(form: EditPrivateMessage): void;
}

interface PrivateMessageFormState {
  content?: string;
  loading: boolean;
  previewMode: boolean;
  submitted: boolean;
}

export class PrivateMessageForm extends Component<
  PrivateMessageFormProps,
  PrivateMessageFormState
> {
  state: PrivateMessageFormState = {
    loading: false,
    previewMode: false,
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
    nextProps: Readonly<{ children?: InfernoNode } & PrivateMessageFormProps>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({ loading: false, content: undefined, previewMode: false });
    }
  }

  render() {
    return (
      <form className="private-message-form">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.state.loading && !!this.state.content && !this.state.submitted
          }
        />
        {!this.props.privateMessageView && (
          <div className="mb-3 row align-items-baseline">
            <label className="col-sm-2 col-form-label">
              {capitalizeFirstLetter(I18NextService.i18n.t("to"))}
            </label>

            <div className="col-sm-10">
              <PersonListing person={this.props.recipient} />
            </div>
          </div>
        )}
        <div className="alert alert-warning small">
          <Icon icon="alert-triangle" classes="icon-inline me-1" />
          <T parent="span" i18nKey="private_message_disclaimer">
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
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("message")}
          </label>
          <div className="col-sm-10">
            <MarkdownTextArea
              onSubmit={() => {
                this.handlePrivateMessageSubmit(this, event);
              }}
              initialContent={this.state.content}
              onContentChange={this.handleContentChange}
              allLanguages={[]}
              siteLanguages={[]}
              hideNavigationWarnings
              onReplyCancel={() => this.handleCancel(this)}
              replyType={this.props.replyType}
              buttonTitle={
                this.props.privateMessageView
                  ? capitalizeFirstLetter(I18NextService.i18n.t("save"))
                  : capitalizeFirstLetter(I18NextService.i18n.t("send_message"))
              }
            />
          </div>
        </div>
      </form>
    );
  }

  handlePrivateMessageSubmit(i: PrivateMessageForm, event: any) {
    event.preventDefault();
    i.setState({ loading: true, submitted: true });
    const pm = i.props.privateMessageView;
    const content = i.state.content ?? "";
    if (pm) {
      i.props.onEdit?.({
        private_message_id: pm.private_message.id,
        content,
      });
    } else {
      i.props.onCreate?.({
        content,
        recipient_id: i.props.recipient.id,
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
}
