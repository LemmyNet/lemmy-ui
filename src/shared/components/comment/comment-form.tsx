import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { CommentId, Language, LanguageId, PostId } from "lemmy-js-client";
import { Subscription } from "rxjs";
import { CommentNodeI } from "shared/interfaces";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { capitalizeFirstLetter } from "../../utils";
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
  onReplyCancel?(): any;
  allLanguages: Language[];
  siteLanguages: number[];
  onCreateComment(
    content: string,
    formId: string,
    postId: PostId,
    parentId?: CommentId,
    languageId?: LanguageId
  ): void;
  onEditComment(
    content: string,
    formId: string,
    commentId: CommentId,
    languageId?: LanguageId
  ): void;
  loading: boolean;
}

interface CommentFormState {
  buttonTitle: string;
}

export class CommentForm extends Component<CommentFormProps, CommentFormState> {
  private subscription?: Subscription;
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

  componentWillUnmount() {
    this.subscription?.unsubscribe();
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
            loading={this.props.loading}
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

  handleCommentSubmit(content: string, formId: string, languageId?: number) {
    let node = this.props.node;

    if (typeof node === "number") {
      let postId = node;
      this.props.onCreateComment(
        content,
        formId,
        postId,
        undefined,
        languageId
      );
    } else {
      if (this.props.edit) {
        let commentId = node.comment_view.comment.id;
        this.props.onEditComment(content, formId, commentId, languageId);
      } else {
        let postId = node.comment_view.post.id;
        let parentId = node.comment_view.comment.id;
        this.props.onCreateComment(
          content,
          formId,
          postId,
          parentId,
          languageId
        );
      }
    }
  }

  handleReplyCancel() {
    this.props.onReplyCancel?.();
  }
}
