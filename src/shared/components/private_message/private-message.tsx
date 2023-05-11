import { Component, linkEvent } from "inferno";
import {
  CreatePrivateMessageReport,
  DeletePrivateMessage,
  MarkPrivateMessageAsRead,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import { mdToHtml, myAuth, toast, wsClient } from "../../utils";
import { Icon } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PersonListing } from "../person/person-listing";
import { PrivateMessageForm } from "./private-message-form";

interface PrivateMessageState {
  showReply: boolean;
  showEdit: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showReportDialog: boolean;
  reportReason?: string;
}

interface PrivateMessageProps {
  private_message_view: PrivateMessageView;
}

export class PrivateMessage extends Component<
  PrivateMessageProps,
  PrivateMessageState
> {
  state: PrivateMessageState = {
    showReply: false,
    showEdit: false,
    collapsed: false,
    viewSource: false,
    showReportDialog: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handlePrivateMessageCreate =
      this.handlePrivateMessageCreate.bind(this);
    this.handlePrivateMessageEdit = this.handlePrivateMessageEdit.bind(this);
  }

  get mine(): boolean {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ==
      this.props.private_message_view.creator.id
    );
  }

  render() {
    let message_view = this.props.private_message_view;
    let otherPerson: Person = this.mine
      ? message_view.recipient
      : message_view.creator;

    return (
      <div className="border-top border-light">
        <div>
          <ul className="list-inline mb-0 text-muted small">
            {/* TODO refactor this */}
            <li className="list-inline-item">
              {this.mine ? i18n.t("to") : i18n.t("from")}
            </li>
            <li className="list-inline-item">
              <PersonListing person={otherPerson} />
            </li>
            <li className="list-inline-item">
              <span>
                <MomentTime
                  published={message_view.private_message.published}
                  updated={message_view.private_message.updated}
                />
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
              recipient={otherPerson}
              privateMessageView={message_view}
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
              <ul className="list-inline mb-0 text-muted font-weight-bold">
                {!this.mine && (
                  <>
                    <li className="list-inline-item">
                      <button
                        className="btn btn-link btn-animate text-muted"
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
                    <li className="list-inline-item">{this.reportButton}</li>
                    <li className="list-inline-item">
                      <button
                        className="btn btn-link btn-animate text-muted"
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
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleEditClick)}
                        data-tippy-content={i18n.t("edit")}
                        aria-label={i18n.t("edit")}
                      >
                        <Icon icon="edit" classes="icon-inline" />
                      </button>
                    </li>
                    <li className="list-inline-item">
                      <button
                        className="btn btn-link btn-animate text-muted"
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
                    className="btn btn-link btn-animate text-muted"
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
        {this.state.showReportDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleReportSubmit)}
          >
            <label className="sr-only" htmlFor="pm-report-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="pm-report-reason"
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              required
              value={this.state.reportReason}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={i18n.t("create_report")}
            >
              {i18n.t("create_report")}
            </button>
          </form>
        )}
        {this.state.showReply && (
          <PrivateMessageForm
            recipient={otherPerson}
            onCreate={this.handlePrivateMessageCreate}
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div className="row col-12"></div>}
      </div>
    );
  }

  get reportButton() {
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleShowReportDialog)}
        data-tippy-content={i18n.t("show_report_dialog")}
        aria-label={i18n.t("show_report_dialog")}
      >
        <Icon icon="flag" inline />
      </button>
    );
  }

  get messageUnlessRemoved(): string {
    let message = this.props.private_message_view.private_message;
    return message.deleted ? `*${i18n.t("deleted")}*` : message.content;
  }

  handleReplyClick(i: PrivateMessage) {
    i.setState({ showReply: true });
  }

  handleEditClick(i: PrivateMessage) {
    i.setState({ showEdit: true });
    i.setState(i.state);
  }

  handleDeleteClick(i: PrivateMessage) {
    let auth = myAuth();
    if (auth) {
      let form: DeletePrivateMessage = {
        private_message_id: i.props.private_message_view.private_message.id,
        deleted: !i.props.private_message_view.private_message.deleted,
        auth,
      };
      WebSocketService.Instance.send(wsClient.deletePrivateMessage(form));
    }
  }

  handleReplyCancel() {
    this.setState({ showReply: false, showEdit: false });
  }

  handleMarkRead(i: PrivateMessage) {
    let auth = myAuth();
    if (auth) {
      let form: MarkPrivateMessageAsRead = {
        private_message_id: i.props.private_message_view.private_message.id,
        read: !i.props.private_message_view.private_message.read,
        auth,
      };
      WebSocketService.Instance.send(wsClient.markPrivateMessageAsRead(form));
    }
  }

  handleMessageCollapse(i: PrivateMessage) {
    i.setState({ collapsed: !i.state.collapsed });
  }

  handleViewSource(i: PrivateMessage) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowReportDialog(i: PrivateMessage) {
    i.setState({ showReportDialog: !i.state.showReportDialog });
  }

  handleReportReasonChange(i: PrivateMessage, event: any) {
    i.setState({ reportReason: event.target.value });
  }

  handleReportSubmit(i: PrivateMessage, event: any) {
    event.preventDefault();
    let auth = myAuth();
    let reason = i.state.reportReason;
    if (auth && reason) {
      let form: CreatePrivateMessageReport = {
        private_message_id: i.props.private_message_view.private_message.id,
        reason,
        auth,
      };
      WebSocketService.Instance.send(wsClient.createPrivateMessageReport(form));

      i.setState({ showReportDialog: false });
    }
  }

  handlePrivateMessageEdit() {
    this.setState({ showEdit: false });
  }

  handlePrivateMessageCreate(message: PrivateMessageView) {
    if (
      message.creator.id ==
      UserService.Instance.myUserInfo?.local_user_view.person.id
    ) {
      this.setState({ showReply: false });
      toast(i18n.t("message_sent"));
    }
  }
}
