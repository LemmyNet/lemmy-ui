import { myAuthRequired } from "@utils/app";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { CreateComment, EditComment, Language } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { CommentNodeI } from "../../interfaces";
import { UserService } from "../../services";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface CommentFormProps {
  /**
   * Can either be the parent, or the editable comment. The right side is a postId.
   */
  node: CommentNodeI | number;
  finished?: boolean;
  edit?: boolean;
  disabled?: boolean;
  focus?: boolean;
  onReplyCancel?(): void;
  allLanguages: Language[];
  siteLanguages: number[];
  containerClass?: string;
  onUpsertComment(form: EditComment | CreateComment): void;
}

export class CommentForm extends Component<CommentFormProps, any> {
  constructor(props: any, context: any) {
    super(props, context);

    this.handleCommentSubmit = this.handleCommentSubmit.bind(this);
  }

  render() {
    const initialContent =
      typeof this.props.node !== "number"
        ? this.props.edit
          ? this.props.node.comment_view.comment.content
          : undefined
        : undefined;

    return (
      <div
        className={["comment-form", "mb-3", this.props.containerClass].join(
          " "
        )}
      >
        {UserService.Instance.myUserInfo ? (
          <MarkdownTextArea
            initialContent={initialContent}
            showLanguage
            buttonTitle={this.buttonTitle}
            finished={this.props.finished}
            replyType={typeof this.props.node !== "number"}
            focus={this.props.focus}
            disabled={this.props.disabled}
            onSubmit={this.handleCommentSubmit}
            onReplyCancel={this.props.onReplyCancel}
            placeholder={i18n.t("comment_here")}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
          />
        ) : (
          <div className="alert alert-warning" role="alert">
            <Icon icon="alert-triangle" classes="icon-inline me-2" />
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

  get buttonTitle(): string {
    return typeof this.props.node === "number"
      ? capitalizeFirstLetter(i18n.t("post"))
      : this.props.edit
      ? capitalizeFirstLetter(i18n.t("save"))
      : capitalizeFirstLetter(i18n.t("reply"));
  }

  handleCommentSubmit(content: string, form_id: string, language_id?: number) {
    const { node, onUpsertComment, edit } = this.props;
    if (typeof node === "number") {
      const post_id = node;
      onUpsertComment({
        content,
        post_id,
        language_id,
        form_id,
        auth: myAuthRequired(),
      });
    } else {
      if (edit) {
        const comment_id = node.comment_view.comment.id;
        onUpsertComment({
          content,
          comment_id,
          form_id,
          language_id,
          auth: myAuthRequired(),
        });
      } else {
        const post_id = node.comment_view.post.id;
        const parent_id = node.comment_view.comment.id;
        this.props.onUpsertComment({
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
}
