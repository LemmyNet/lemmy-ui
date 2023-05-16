import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  CommentResponse,
  CreateComment,
  EditComment,
  Language,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { CommentNodeI } from "shared/interfaces";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  capitalizeFirstLetter,
  myAuth,
  wsClient,
  wsSubscribe,
} from "../../utils";
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
}

interface CommentFormState {
  buttonTitle: string;
  finished: boolean;
  formId?: string;
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
    finished: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleCommentSubmit = this.handleCommentSubmit.bind(this);
    this.handleReplyCancel = this.handleReplyCancel.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
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
            finished={this.state.finished}
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

  handleCommentSubmit(msg: {
    val: string;
    formId: string;
    languageId?: number;
  }) {
    let content = msg.val;
    let language_id = msg.languageId;
    let node = this.props.node;

    this.setState({ formId: msg.formId });

    let auth = myAuth();
    if (auth) {
      if (typeof node === "number") {
        let postId = node;
        let form: CreateComment = {
          content,
          form_id: this.state.formId,
          post_id: postId,
          language_id,
          auth,
        };
        WebSocketService.Instance.send(wsClient.createComment(form));
      } else {
        if (this.props.edit) {
          let form: EditComment = {
            content,
            form_id: this.state.formId,
            comment_id: node.comment_view.comment.id,
            language_id,
            auth,
          };
          WebSocketService.Instance.send(wsClient.editComment(form));
        } else {
          let form: CreateComment = {
            content,
            form_id: this.state.formId,
            post_id: node.comment_view.post.id,
            parent_id: node.comment_view.comment.id,
            language_id,
            auth,
          };
          WebSocketService.Instance.send(wsClient.createComment(form));
        }
      }
    }
  }

  handleReplyCancel() {
    this.props.onReplyCancel?.();
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);

    // Only do the showing and hiding if logged in
    if (UserService.Instance.myUserInfo) {
      if (
        op == UserOperation.CreateComment ||
        op == UserOperation.EditComment
      ) {
        let data = wsJsonToRes<CommentResponse>(msg);

        // This only finishes this form, if the randomly generated form_id matches the one received
        if (this.state.formId && this.state.formId == data.form_id) {
          this.setState({ finished: true });

          // Necessary because it broke tribute for some reason
          this.setState({ finished: false });
        }
      }
    }
  }
}
