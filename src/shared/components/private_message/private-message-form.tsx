import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Prompt } from "inferno-router";
import {
  CreatePrivateMessage,
  EditPrivateMessage,
  MyUserInfo,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { matrixUrl, relTags } from "@utils/config";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { PersonListing } from "../person/person-listing";

interface PrivateMessageFormProps {
  recipient: Person;
  privateMessageView?: PrivateMessageView; // If a pm is given, that means this is an edit
  replyType?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onCancel?(): any;
  onCreate?(form: CreatePrivateMessage, bypassNavWarning: () => void): void;
  onEdit?(form: EditPrivateMessage, bypassNavWarning: () => void): void;
  createOrEditLoading: boolean;
}

interface PrivateMessageFormState {
  content?: string;
  previewMode: boolean;
  bypassNavWarning?: boolean;
}

export class PrivateMessageForm extends Component<
  PrivateMessageFormProps,
  PrivateMessageFormState
> {
  state: PrivateMessageFormState = {
    previewMode: false,
    content: this.props.privateMessageView
      ? this.props.privateMessageView.private_message.content
      : undefined,
  };

  render() {
    return (
      <form className="private-message-form">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.state.bypassNavWarning &&
            (!!this.state.content || this.props.createOrEditLoading)
          }
        />
        {!this.props.privateMessageView && (
          <div className="mb-3 row align-items-baseline">
            <label className="col-sm-2 col-form-label">
              {capitalizeFirstLetter(I18NextService.i18n.t("to"))}
            </label>

            <div className="col-sm-10">
              <PersonListing
                person={this.props.recipient}
                myUserInfo={this.props.myUserInfo}
                banned={false}
              />
            </div>
          </div>
        )}
        <div className="alert alert-warning small">
          <Icon icon="alert-triangle" classes="icon-inline me-1" />
          <T parent="span" i18nKey="private_message_disclaimer">
            #
            <a className="alert-link" rel={relTags} href={matrixUrl}>
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
              onSubmit={() => handlePrivateMessageSubmit(this)}
              initialContent={this.state.content}
              onContentChange={val => handleContentChange(this, val)}
              allLanguages={[]}
              siteLanguages={[]}
              hideNavigationWarnings
              onReplyCancel={() => handleCancel(this)}
              replyType={this.props.replyType}
              buttonTitle={
                this.props.privateMessageView
                  ? capitalizeFirstLetter(I18NextService.i18n.t("save"))
                  : capitalizeFirstLetter(I18NextService.i18n.t("send_message"))
              }
              myUserInfo={this.props.myUserInfo}
              loading={this.props.createOrEditLoading}
            />
          </div>
        </div>
      </form>
    );
  }
}

function handlePrivateMessageSubmit(i: PrivateMessageForm) {
  const pm = i.props.privateMessageView;
  const content = i.state.content ?? "";
  if (pm) {
    i.props.onEdit?.(
      {
        private_message_id: pm.private_message.id,
        content,
      },
      () => {
        i.setState({ bypassNavWarning: true });
      },
    );
  } else {
    i.props.onCreate?.(
      {
        content,
        recipient_id: i.props.recipient.id,
      },
      () => {
        i.setState({ bypassNavWarning: true });
      },
    );
  }
}

function handleContentChange(i: PrivateMessageForm, val: string) {
  i.setState({ content: val });
}

function handleCancel(i: PrivateMessageForm) {
  i.props.onCancel?.();
}
