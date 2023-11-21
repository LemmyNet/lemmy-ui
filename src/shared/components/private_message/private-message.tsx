import { Component, InfernoNode, linkEvent } from "inferno";
import {
  CreatePrivateMessage,
  CreatePrivateMessageReport,
  DeletePrivateMessage,
  EditPrivateMessage,
  MarkPrivateMessageAsRead,
  Person,
  PrivateMessageView,
} from "lemmy-js-client";
import { mdToHtml } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PersonListing } from "../person/person-listing";
import { PrivateMessageForm } from "./private-message-form";
import ModerationActionForm from "../common/mod-action-form";

interface PrivateMessageState {
  showReply: boolean;
  showEdit: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showReportDialog: boolean;
  deleteLoading: boolean;
  readLoading: boolean;
}

interface PrivateMessageProps {
  private_message_view: PrivateMessageView;
  onDelete(form: DeletePrivateMessage): void;
  onMarkRead(form: MarkPrivateMessageAsRead): void;
  onReport(form: CreatePrivateMessageReport): void;
  onCreate(form: CreatePrivateMessage): void;
  onEdit(form: EditPrivateMessage): void;
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
    deleteLoading: false,
    readLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handleReportSubmit = this.handleReportSubmit.bind(this);
  }

  get mine(): boolean {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ===
      this.props.private_message_view.creator.id
    );
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PrivateMessageProps>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({
        showReply: false,
        showEdit: false,
        collapsed: false,
        viewSource: false,
        showReportDialog: false,
        deleteLoading: false,
        readLoading: false,
      });
    }
  }

  render() {
    const message_view = this.props.private_message_view;
    const otherPerson: Person = this.mine
      ? message_view.recipient
      : message_view.creator;

    return (
      <div className="private-message border-top border-light">
        <div>
          <ul className="list-inline mb-0 text-muted small">
            {/* TODO refactor this */}
            <li className="list-inline-item">
              {this.mine
                ? I18NextService.i18n.t("to")
                : I18NextService.i18n.t("from")}
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
              <button
                type="button"
                className="pointer text-monospace p-0 bg-transparent border-0 d-block"
                onClick={linkEvent(this, this.handleMessageCollapse)}
              >
                {this.state.collapsed ? (
                  <Icon icon="plus-square" />
                ) : (
                  <Icon icon="minus-square" />
                )}
              </button>
            </li>
          </ul>
          {this.state.showEdit && (
            <PrivateMessageForm
              recipient={otherPerson}
              privateMessageView={message_view}
              onEdit={this.props.onEdit}
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
              <ul className="list-inline mb-0 text-muted fw-bold">
                {!this.mine && (
                  <>
                    <li className="list-inline-item">
                      <button
                        type="button"
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleMarkRead)}
                        data-tippy-content={
                          message_view.private_message.read
                            ? I18NextService.i18n.t("mark_as_unread")
                            : I18NextService.i18n.t("mark_as_read")
                        }
                        aria-label={
                          message_view.private_message.read
                            ? I18NextService.i18n.t("mark_as_unread")
                            : I18NextService.i18n.t("mark_as_read")
                        }
                      >
                        {this.state.readLoading ? (
                          <Spinner />
                        ) : (
                          <Icon
                            icon="check"
                            classes={`icon-inline ${
                              message_view.private_message.read &&
                              "text-success"
                            }`}
                          />
                        )}
                      </button>
                    </li>
                    <li className="list-inline-item">{this.reportButton}</li>
                    <li className="list-inline-item">
                      <button
                        type="button"
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleReplyClick)}
                        data-tippy-content={I18NextService.i18n.t("reply")}
                        aria-label={I18NextService.i18n.t("reply")}
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
                        type="button"
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleEditClick)}
                        data-tippy-content={I18NextService.i18n.t("edit")}
                        aria-label={I18NextService.i18n.t("edit")}
                      >
                        <Icon icon="edit" classes="icon-inline" />
                      </button>
                    </li>
                    <li className="list-inline-item">
                      <button
                        type="button"
                        className="btn btn-link btn-animate text-muted"
                        onClick={linkEvent(this, this.handleDeleteClick)}
                        data-tippy-content={
                          !message_view.private_message.deleted
                            ? I18NextService.i18n.t("delete")
                            : I18NextService.i18n.t("restore")
                        }
                        aria-label={
                          !message_view.private_message.deleted
                            ? I18NextService.i18n.t("delete")
                            : I18NextService.i18n.t("restore")
                        }
                      >
                        {this.state.deleteLoading ? (
                          <Spinner />
                        ) : (
                          <Icon
                            icon="trash"
                            classes={`icon-inline ${
                              message_view.private_message.deleted &&
                              "text-danger"
                            }`}
                          />
                        )}
                      </button>
                    </li>
                  </>
                )}
                <li className="list-inline-item">
                  <button
                    type="button"
                    className="btn btn-link btn-animate text-muted"
                    onClick={linkEvent(this, this.handleViewSource)}
                    data-tippy-content={I18NextService.i18n.t("view_source")}
                    aria-label={I18NextService.i18n.t("view_source")}
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
          <ModerationActionForm
            onSubmit={this.handleReportSubmit}
            modActionType="report"
            onCancel={() => {}}
          />
        )}
        {this.state.showReply && (
          <div className="row">
            <div className="col-sm-6">
              <PrivateMessageForm
                replyType={true}
                recipient={otherPerson}
                onCreate={this.props.onCreate}
                onCancel={this.handleReplyCancel}
              />
            </div>
          </div>
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div className="row col-12"></div>}
      </div>
    );
  }

  get reportButton() {
    return (
      <button
        type="button"
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleShowReportDialog)}
        data-tippy-content={I18NextService.i18n.t("show_report_dialog")}
        aria-label={I18NextService.i18n.t("show_report_dialog")}
      >
        <Icon icon="flag" inline />
      </button>
    );
  }

  get messageUnlessRemoved(): string {
    const message = this.props.private_message_view.private_message;
    return message.deleted
      ? `*${I18NextService.i18n.t("deleted")}*`
      : message.content;
  }

  handleReplyClick(i: PrivateMessage) {
    i.setState({ showReply: true });
  }

  handleEditClick(i: PrivateMessage) {
    i.setState({ showEdit: true });
    i.setState(i.state);
  }

  handleDeleteClick(i: PrivateMessage) {
    i.setState({ deleteLoading: true });
    i.props.onDelete({
      private_message_id: i.props.private_message_view.private_message.id,
      deleted: !i.props.private_message_view.private_message.deleted,
    });
  }

  handleReplyCancel() {
    this.setState({ showReply: false, showEdit: false });
  }

  handleMarkRead(i: PrivateMessage) {
    i.setState({ readLoading: true });
    i.props.onMarkRead({
      private_message_id: i.props.private_message_view.private_message.id,
      read: !i.props.private_message_view.private_message.read,
    });
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

  handleReportSubmit(reason: string) {
    this.props.onReport({
      private_message_id: this.props.private_message_view.private_message.id,
      reason,
    });

    this.setState({
      showReportDialog: false,
    });
  }
}
