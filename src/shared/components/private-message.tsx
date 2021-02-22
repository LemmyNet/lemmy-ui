import { Component, linkEvent } from "inferno";
import {
  PrivateMessageView,
  DeletePrivateMessage,
  MarkPrivateMessageAsRead,
  UserSafe,
} from "lemmy-js-client";
import { WebSocketService, UserService } from "../services";
import { authField, mdToHtml, toast, wsClient } from "../utils";
import { MomentTime } from "./moment-time";
import { PrivateMessageForm } from "./private-message-form";
import { UserListing } from "./user-listing";
import { Icon } from "./icon";
import { i18n } from "../i18next";

interface PrivateMessageState {
  showReply: boolean;
  showEdit: boolean;
  collapsed: boolean;
  viewSource: boolean;
}

interface PrivateMessageProps {
  private_message_view: PrivateMessageView;
}

export class PrivateMessage extends Component<
  PrivateMessageProps,
  PrivateMessageState
> {
  private emptyState: PrivateMessageState = {
    showReply: false,
    showEdit: false,
    collapsed: false,
    viewSource: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handlePrivateMessageCreate = this.handlePrivateMessageCreate.bind(
      this
    );
    this.handlePrivateMessageEdit = this.handlePrivateMessageEdit.bind(this);
  }

  get mine(): boolean {
    return (
      UserService.Instance.user &&
      UserService.Instance.user.id == this.props.private_message_view.creator.id
    );
  }

  render() {
    let message_view = this.props.private_message_view;
    // TODO check this again
    let userOther: UserSafe = this.mine
      ? message_view.recipient
      : message_view.creator;

    return (
      <div class="border-top border-light">
        <div>
          <ul class="list-inline mb-0 text-muted small">
            {/* TODO refactor this */}
            <li className="list-inline-item">
              {this.mine ? i18n.t("to") : i18n.t("from")}
            </li>
            <li className="list-inline-item">
              <UserListing user={userOther} />
            </li>
            <li className="list-inline-item">
              <span>
                <MomentTime data={message_view.private_message} />
              </span>
            </li>
            <li className="list-inline-item">
              <div
                role="button"
                className="pointer text-monospace"
                onClick={linkEvent(this, this.handleMessageCollapse)}
              >
                {this.state.collapsed ? (
                  <Icon icon="plus-square" classes="icon-inline" />
                ) : (
                  <Icon icon="minus-square" classes="icon-inline" />
                )}
              </div>
            </li>
          </ul>
          {this.state.showEdit && (
            <PrivateMessageForm
              recipient={userOther}
              privateMessage={message_view}
              onEdit={this.handlePrivateMessageEdit}
              onCreate={this.handlePrivateMessageCreate}
              onCancel={this.handleReplyCancel}
            />
          )}
          {!this.state.showEdit && !this.state.collapsed && (
            <div>
              {this.state.viewSource ? (
                <pre>{this.messageUnlessRemoved}</pre>
              ) : (
                <div
                  className="md-div"
                  dangerouslySetInnerHTML={mdToHtml(this.messageUnlessRemoved)}
                />
              )}
              <ul class="list-inline mb-0 text-muted font-weight-bold">
                {!this.mine && (
                  <>
                    <li className="list-inline-item">
                      <button
                        class="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleMarkRead)}
                        data-tippy-content={
                          message_view.private_message.read
                            ? i18n.t("mark_as_unread")
                            : i18n.t("mark_as_read")
                        }
                        aria-label={
                          message_view.private_message.read
                            ? i18n.t("mark_as_unread")
                            : i18n.t("mark_as_read")
                        }
                      >
                        <Icon
                          icon="check"
                          classes={`icon-inline ${
                            message_view.private_message.read && "text-success"
                          }`}
                        />
                      </button>
                    </li>
                    <li className="list-inline-item">
                      <button
                        class="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleReplyClick)}
                        data-tippy-content={i18n.t("reply")}
                        aria-label={i18n.t("reply")}
                      >
                        <Icon icon="reply1" classes="icon-inline" />
                      </button>
                    </li>
                  </>
                )}
                {this.mine && (
                  <>
                    <li className="list-inline-item">
                      <button
                        class="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleEditClick)}
                        data-tippy-content={i18n.t("edit")}
                        aria-label={i18n.t("edit")}
                      >
                        <Icon icon="edit" classes="icon-inline" />
                      </button>
                    </li>
                    <li className="list-inline-item">
                      <button
                        class="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleDeleteClick)}
                        data-tippy-content={
                          !message_view.private_message.deleted
                            ? i18n.t("delete")
                            : i18n.t("restore")
                        }
                        aria-label={
                          !message_view.private_message.deleted
                            ? i18n.t("delete")
                            : i18n.t("restore")
                        }
                      >
                        <Icon
                          icon="trash"
                          classes={`icon-inline ${
                            message_view.private_message.deleted &&
                            "text-danger"
                          }`}
                        />
                      </button>
                    </li>
                  </>
                )}
                <li className="list-inline-item">
                  <button
                    class="btn btn-link btn-animate text-muted"
                    onClick={linkEvent(this, this.handleViewSource)}
                    data-tippy-content={i18n.t("view_source")}
                    aria-label={i18n.t("view_source")}
                  >
                    <Icon
                      icon="file-text"
                      classes={`icon-inline ${
                        this.state.viewSource && "text-success"
                      }`}
                    />
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
        {this.state.showReply && (
          <PrivateMessageForm
            recipient={userOther}
            onCreate={this.handlePrivateMessageCreate}
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div class="row col-12"></div>}
      </div>
    );
  }

  get messageUnlessRemoved(): string {
    let message = this.props.private_message_view.private_message;
    return message.deleted ? `*${i18n.t("deleted")}*` : message.content;
  }

  handleReplyClick(i: PrivateMessage) {
    i.state.showReply = true;
    i.setState(i.state);
  }

  handleEditClick(i: PrivateMessage) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleDeleteClick(i: PrivateMessage) {
    let form: DeletePrivateMessage = {
      private_message_id: i.props.private_message_view.private_message.id,
      deleted: !i.props.private_message_view.private_message.deleted,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.deletePrivateMessage(form));
  }

  handleReplyCancel() {
    this.state.showReply = false;
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleMarkRead(i: PrivateMessage) {
    let form: MarkPrivateMessageAsRead = {
      private_message_id: i.props.private_message_view.private_message.id,
      read: !i.props.private_message_view.private_message.read,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.markPrivateMessageAsRead(form));
  }

  handleMessageCollapse(i: PrivateMessage) {
    i.state.collapsed = !i.state.collapsed;
    i.setState(i.state);
  }

  handleViewSource(i: PrivateMessage) {
    i.state.viewSource = !i.state.viewSource;
    i.setState(i.state);
  }

  handlePrivateMessageEdit() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handlePrivateMessageCreate(message: PrivateMessageView) {
    if (
      UserService.Instance.user &&
      message.creator.id == UserService.Instance.user.id
    ) {
      this.state.showReply = false;
      this.setState(this.state);
      toast(i18n.t("message_sent"));
    }
  }
}
