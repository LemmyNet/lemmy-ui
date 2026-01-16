import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  CreateComment,
  EditComment,
  Language,
  MyUserInfo,
} from "lemmy-js-client";
import { CommentNodeType } from "@utils/types";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { userNotLoggedInOrBanned } from "@utils/app";

interface CommentFormProps {
  /**
   * Can either be the parent, or the editable comment. The right side is a postId.
   */
  node: CommentNodeType | number;
  edit?: boolean;
  disabled?: boolean;
  focus?: boolean;
  onReplyCancel?(): void;
  allLanguages: Language[];
  siteLanguages: number[];
  containerClass?: string;
  myUserInfo: MyUserInfo | undefined;
  onCreateComment(form: CreateComment): void;
  onEditComment(form: EditComment): void;
  loading: boolean;
}

export class CommentForm extends Component<CommentFormProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const initialContent =
      typeof this.props.node !== "number"
        ? this.props.edit
          ? this.props.node.view.comment_view.comment.content
          : undefined
        : undefined;
    const placeholder = this.props.disabled
      ? I18NextService.i18n.t("locked_post_comment_placeholder")
      : I18NextService.i18n.t("comment_here");
    const disabled =
      this.props.disabled || userNotLoggedInOrBanned(this.props.myUserInfo);

    return (
      <div
        className={["comment-form", "mb-3", this.props.containerClass].join(
          " ",
        )}
      >
        {this.props.myUserInfo ? (
          <MarkdownTextArea
            initialContent={initialContent}
            showLanguage
            buttonTitle={this.buttonTitle}
            replyType={typeof this.props.node !== "number"}
            focus={this.props.focus}
            disabled={disabled}
            onSubmit={(content, languageId) =>
              handleCommentSubmit(this, content, languageId)
            }
            onReplyCancel={this.props.onReplyCancel}
            placeholder={placeholder ?? undefined}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            myUserInfo={this.props.myUserInfo}
            loading={this.props.loading}
          />
        ) : (
          <div className="alert alert-warning" role="alert">
            <Icon icon="alert-triangle" classes="icon-inline me-2" />
            <T i18nKey="must_login" className="d-inline">
              #
              <Link className="alert-link" to="/login">
                #
              </Link>
              <Link className="alert-link" to="/signup">
                #
              </Link>
            </T>
          </div>
        )}
      </div>
    );
  }

  get buttonTitle(): string {
    return typeof this.props.node === "number"
      ? capitalizeFirstLetter(I18NextService.i18n.t("post"))
      : this.props.edit
        ? capitalizeFirstLetter(I18NextService.i18n.t("save"))
        : capitalizeFirstLetter(I18NextService.i18n.t("reply"));
  }
}

function handleCommentSubmit(
  i: CommentForm,
  content: string,
  language_id?: number,
) {
  const { node, onCreateComment, onEditComment, edit } = i.props;

  if (typeof node === "number") {
    const post_id = node;
    onCreateComment({
      content,
      post_id,
      language_id,
    });
  } else if (edit) {
    const comment_id = node.view.comment_view.comment.id;
    onEditComment({
      content,
      comment_id,
      language_id,
    });
  }
  // If its a node, and not an edit, that means its a reply to the parent
  else {
    const post_id = node.view.comment_view.comment.post_id;
    const parent_id = node.view.comment_view.comment.id;
    onCreateComment({
      content,
      parent_id,
      post_id,
      language_id,
    });
  }
}
