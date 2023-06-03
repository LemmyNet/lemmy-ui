import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { CreateComment, EditComment, Language } from "lemmy-js-client";
import { CommentNodeI } from "shared/interfaces";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { capitalizeFirstLetter, myAuthRequired } from "../../utils";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface CommentFormProps {
  /**
   * Can either be the parent, or the editable comment. The right side is a postId.
   */
  node: CommentNodeI | number;
  edit?: boolean;
  disabled?: boolean;
  focus?: boolean;
  onReplyCancel?(): void;
  allLanguages: Language[];
  siteLanguages: number[];
  onCreateComment(form: CreateComment): void;
  onEditComment(form: EditComment): void;
}

interface CommentFormState {
  buttonTitle: string;
}

export class CommentForm extends Component<CommentFormProps, CommentFormState> {
  state: CommentFormState = {
    buttonTitle:
      typeof this.props.node === "number"
        ? capitalizeFirstLetter(i18n.t("post"))
        : this.props.edit
        ? capitalizeFirstLetter(i18n.t("save"))
        : capitalizeFirstLetter(i18n.t("reply")),
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleCommentSubmit = this.handleCommentSubmit.bind(this);
    this.handleReplyCancel = this.handleReplyCancel.bind(this);
  }

  render() {
    let initialContent =
      typeof this.props.node !== "number"
        ? this.props.edit
          ? this.props.node.comment_view.comment.content
          : undefined
        : undefined;

    return (
      <div className="mb-3">
        {UserService.Instance.myUserInfo ? (
          <MarkdownTextArea
            initialContent={initialContent}
            showLanguage
            buttonTitle={this.state.buttonTitle}
            replyType={typeof this.props.node !== "number"}
            focus={this.props.focus}
            disabled={this.props.disabled}
            onSubmit={this.handleCommentSubmit}
            onReplyCancel={this.handleReplyCancel}
            placeholder={i18n.t("comment_here")}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
          />
        ) : (
          <div className="alert alert-warning" role="alert">
            <Icon icon="alert-triangle" classes="icon-inline mr-2" />
            <T i18nKey="must_login" class="d-inline">
              #
              <Link className="alert-link" to="/login">
                #
              </Link>
            </T>
          </div>
        )}
      </div>
    );
  }

  handleCommentSubmit(content: string, form_id: string, language_id?: number) {
    let node = this.props.node;

    if (typeof node === "number") {
      let post_id = node;
      this.props.onCreateComment({
        content,
        post_id,
        language_id,
        form_id,
        auth: myAuthRequired(),
      });
    } else {
      if (this.props.edit) {
        let comment_id = node.comment_view.comment.id;
        this.props.onEditComment({
          comment_id,
          form_id,
          language_id,
          auth: myAuthRequired(),
        });
      } else {
        let post_id = node.comment_view.post.id;
        let parent_id = node.comment_view.comment.id;
        this.props.onCreateComment({
          content,
          parent_id,
          post_id,
          form_id,
          language_id,
          auth: myAuthRequired(),
        });
      }
    }
  }

  handleReplyCancel() {
    this.props.onReplyCancel?.();
  }
}
