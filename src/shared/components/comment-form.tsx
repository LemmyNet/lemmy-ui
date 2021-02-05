import { Component } from 'inferno';
import { Link } from 'inferno-router';
import { Subscription } from 'rxjs';
import {
  CreateComment,
  EditComment,
  UserOperation,
  CommentResponse,
} from 'lemmy-js-client';
import { CommentNode as CommentNodeI } from '../interfaces';
import {
  authField,
  capitalizeFirstLetter,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from '../utils';
import { WebSocketService, UserService } from '../services';
import { i18n } from '../i18next';
import { T } from 'inferno-i18next';
import { MarkdownTextArea } from './markdown-textarea';

interface CommentFormProps {
  postId?: number;
  node?: CommentNodeI; // Can either be the parent, or the editable comment
  edit?: boolean;
  disabled?: boolean;
  focus?: boolean;
  onReplyCancel?(): any;
}

interface CommentFormState {
  buttonTitle: string;
  finished: boolean;
  formId: string;
}

export class CommentForm extends Component<CommentFormProps, CommentFormState> {
  private subscription: Subscription;
  private emptyState: CommentFormState = {
    buttonTitle: !this.props.node
      ? capitalizeFirstLetter(i18n.t('post'))
      : this.props.edit
      ? capitalizeFirstLetter(i18n.t('save'))
      : capitalizeFirstLetter(i18n.t('reply')),
    finished: false,
    formId: 'empty_form',
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
    return (
      <div class="mb-3">
        {UserService.Instance.user ? (
          <MarkdownTextArea
            initialContent={
              this.props.edit
                ? this.props.node.comment_view.comment.content
                : null
            }
            buttonTitle={this.state.buttonTitle}
            finished={this.state.finished}
            replyType={!!this.props.node}
            focus={this.props.focus}
            disabled={this.props.disabled}
            onSubmit={this.handleCommentSubmit}
            onReplyCancel={this.handleReplyCancel}
          />
        ) : (
          <div class="alert alert-light" role="alert">
            <svg class="icon icon-inline mr-2">
              <use xlinkHref="#icon-alert-triangle"></use>
            </svg>
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

  handleCommentSubmit(msg: { val: string; formId: string }) {
    let content = msg.val;
    this.state.formId = msg.formId;

    let node = this.props.node;

    if (this.props.edit) {
      let form: EditComment = {
        content,
        form_id: this.state.formId,
        comment_id: node.comment_view.comment.id,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.editComment(form));
    } else {
      let form: CreateComment = {
        content,
        form_id: this.state.formId,
        post_id: node ? node.comment_view.post.id : this.props.postId,
        parent_id: node ? node.comment_view.comment.id : null,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.createComment(form));
    }
    this.setState(this.state);
  }

  handleReplyCancel() {
    this.props.onReplyCancel();
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);

    // Only do the showing and hiding if logged in
    if (UserService.Instance.user) {
      if (
        op == UserOperation.CreateComment ||
        op == UserOperation.EditComment
      ) {
        let data = wsJsonToRes<CommentResponse>(msg).data;

        // This only finishes this form, if the randomly generated form_id matches the one received
        if (this.state.formId == data.form_id) {
          this.setState({ finished: true });

          // Necessary because it broke tribute for some reason
          this.setState({ finished: false });
        }
      }
    }
  }
}
