import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  CommentResponse,
  CreateComment,
  EditComment,
  Language,
} from "lemmy-js-client";
import { CommentNodeI } from "../../interfaces";
import { I18NextService, UserService } from "../../services";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { RequestState } from "../../services/HttpService";

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
  containerClass?: string;
  onUpsertComment(
    form: EditComment | CreateComment,
  ): Promise<RequestState<CommentResponse>>;
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
          " ",
        )}
      >
        {UserService.Instance.myUserInfo ? (
          <MarkdownTextArea
            initialContent={initialContent}
            showLanguage
            buttonTitle={this.buttonTitle}
            replyType={typeof this.props.node !== "number"}
            focus={this.props.focus}
            disabled={this.props.disabled}
            onSubmit={this.handleCommentSubmit}
            onReplyCancel={this.props.onReplyCancel}
            placeholder={I18NextService.i18n.t("comment_here") ?? undefined}
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
      ? capitalizeFirstLetter(I18NextService.i18n.t("post"))
      : this.props.edit
        ? capitalizeFirstLetter(I18NextService.i18n.t("save"))
        : capitalizeFirstLetter(I18NextService.i18n.t("reply"));
  }

  async handleCommentSubmit(
    content: string,
    language_id?: number,
  ): Promise<boolean> {
    const { node, onUpsertComment, edit } = this.props;
    let response: RequestState<CommentResponse>;

    if (typeof node === "number") {
      const post_id = node;
      response = await onUpsertComment({
        content,
        post_id,
        language_id,
      });
    } else if (edit) {
      const comment_id = node.comment_view.comment.id;
      response = await onUpsertComment({
        content,
        comment_id,
        language_id,
      });
    } else {
      const post_id = node.comment_view.post.id;
      const parent_id = node.comment_view.comment.id;
      response = await onUpsertComment({
        content,
        parent_id,
        post_id,
        language_id,
      });
    }

    return response.state !== "failed";
  }
}
