import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Prompt } from "inferno-router";
import {
  CreatePrivateMessage,
  EditPrivateMessage,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { relTags } from "../../config";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PersonListing } from "../person/person-listing";

interface PrivateMessageFormProps {
  recipient: Person;
  privateMessageView?: PrivateMessageView; // If a pm is given, that means this is an edit
  replyType?: boolean;
  onCancel?(): any;
  onCreate?(form: CreatePrivateMessage): Promise<boolean>;
  onEdit?(form: EditPrivateMessage): Promise<boolean>;
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
    this.handlePrivateMessageSubmit =
      this.handlePrivateMessageSubmit.bind(this);
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
          {this.props.recipient.matrix_user_id && (
            <>
              &nbsp;
              <T
                i18nKey="private_message_form_user_matrix_blurb"
                parent="span"
                interpolation={{
                  matrix_id: this.props.recipient.matrix_user_id,
                }}
              >
                #
                <a
                  className="alert-link"
                  rel={relTags}
                  href={`https://matrix.to/#/${this.props.recipient.matrix_user_id}`}
                >
                  #
                </a>
                #
              </T>
            </>
          )}
        </div>
        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("message")}
          </label>
          <div className="col-sm-10">
            <MarkdownTextArea
              onSubmit={this.handlePrivateMessageSubmit}
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

  async handlePrivateMessageSubmit(): Promise<boolean> {
    this.setState({ loading: true, submitted: true });
    const pm = this.props.privateMessageView;
    const content = this.state.content ?? "";
    let success: boolean | undefined;
    if (pm) {
      success = await this.props.onEdit?.({
        private_message_id: pm.private_message.id,
        content,
      });
    } else {
      success = await this.props.onCreate?.({
        content,
        recipient_id: this.props.recipient.id,
      });
    }
    return success ?? true;
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
