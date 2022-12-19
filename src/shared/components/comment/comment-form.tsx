import { Either, None, Option, Some } from "@sniptt/monads";
import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  CommentNode as CommentNodeI,
  CommentResponse,
  CreateComment,
  EditComment,
  Language,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  capitalizeFirstLetter,
  myFirstDiscussionLanguageId,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { Icon } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface CommentFormProps {
  /**
   * Can either be the parent, or the editable comment. The right side is a postId.
   */
  node: Either<CommentNodeI, number>;
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
  formId: Option<string>;
}

export class CommentForm extends Component<CommentFormProps, CommentFormState> {
  private subscription: Subscription;
  private emptyState: CommentFormState = {
    buttonTitle: this.props.node.isRight()
      ? capitalizeFirstLetter(i18n.t("post"))
      : this.props.edit
      ? capitalizeFirstLetter(i18n.t("save"))
      : capitalizeFirstLetter(i18n.t("reply")),
    finished: false,
    formId: None,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleCommentSubmit = this.handleCommentSubmit.bind(this);
    this.handleReplyCancel = this.handleReplyCancel.bind(this);

    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  render() {
    let initialContent = this.props.node.match({
      left: node =>
        this.props.edit ? Some(node.comment_view.comment.content) : None,
      right: () => None,
    });

    let selectedLang = this.props.node
      .left()
      .map(n => n.comment_view.comment.language_id)
      .or(
        myFirstDiscussionLanguageId(
          this.props.allLanguages,
          this.props.siteLanguages,
          UserService.Instance.myUserInfo
        )
      );

    return (
      <div className="mb-3">
        {UserService.Instance.myUserInfo.isSome() ? (
          <MarkdownTextArea
            initialContent={initialContent}
            initialLanguageId={selectedLang}
            showLanguage
            buttonTitle={Some(this.state.buttonTitle)}
            maxLength={None}
            finished={this.state.finished}
            replyType={this.props.node.isLeft()}
            focus={this.props.focus}
            disabled={this.props.disabled}
            onSubmit={this.handleCommentSubmit}
            onReplyCancel={this.handleReplyCancel}
            placeholder={Some(i18n.t("comment_here"))}
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
    val: Option<string>;
    formId: string;
    languageId: Option<number>;
  }) {
    let content = msg.val;
    let language_id = msg.languageId;
    this.setState({ formId: Some(msg.formId) });

    this.props.node.match({
      left: node => {
        if (this.props.edit) {
          let form = new EditComment({
            content,
            distinguished: None,
            form_id: this.state.formId,
            comment_id: node.comment_view.comment.id,
            language_id,
            auth: auth().unwrap(),
          });
          WebSocketService.Instance.send(wsClient.editComment(form));
        } else {
          let form = new CreateComment({
            content: content.unwrap(),
            form_id: this.state.formId,
            post_id: node.comment_view.post.id,
            parent_id: Some(node.comment_view.comment.id),
            language_id,
            auth: auth().unwrap(),
          });
          WebSocketService.Instance.send(wsClient.createComment(form));
        }
      },
      right: postId => {
        let form = new CreateComment({
          content: content.unwrap(),
          form_id: this.state.formId,
          post_id: postId,
          parent_id: None,
          language_id,
          auth: auth().unwrap(),
        });
        WebSocketService.Instance.send(wsClient.createComment(form));
      },
    });
    this.setState(this.state);
  }

  handleReplyCancel() {
    this.props.onReplyCancel();
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);

    // Only do the showing and hiding if logged in
    if (UserService.Instance.myUserInfo.isSome()) {
      if (
        op == UserOperation.CreateComment ||
        op == UserOperation.EditComment
      ) {
        let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);

        // This only finishes this form, if the randomly generated form_id matches the one received
        if (this.state.formId.unwrapOr("") == data.form_id.unwrapOr("")) {
          this.setState({ finished: true });

          // Necessary because it broke tribute for some reason
          this.setState({ finished: false });
        }
      }
    }
  }
}
