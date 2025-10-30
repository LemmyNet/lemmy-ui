import { Component, InfernoNode, linkEvent } from "inferno";
import {
  CreatePrivateMessage,
  CreatePrivateMessageReport,
  DeletePrivateMessage,
  EditPrivateMessage,
  MyUserInfo,
  Person,
  PrivateMessageId,
  PrivateMessageView,
} from "lemmy-js-client";
import { mdToHtmlNoImages } from "@utils/markdown";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PersonListing } from "../person/person-listing";
import { PrivateMessageForm } from "./private-message-form";
import ModActionFormModal from "../common/modal/mod-action-form-modal";
import { tippyMixin } from "../mixins/tippy-mixin";
import { mark_as_read_i18n } from "@utils/app";

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
  myUserInfo: MyUserInfo | undefined;
  onDelete(form: DeletePrivateMessage): void;
  onReport(form: CreatePrivateMessageReport): void;
  onCreate(form: CreatePrivateMessage): Promise<boolean>;
  onEdit(form: EditPrivateMessage): Promise<boolean>;
  read: boolean;
  onMarkRead(privateMessageId: PrivateMessageId, read: boolean): void;
}

@tippyMixin
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
    this.hideReportDialog = this.hideReportDialog.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PrivateMessageProps>,
  ) {
    if (this.props.private_message_view !== nextProps.private_message_view) {
      this.setState({ readLoading: false });
    }
  }

  get mine(): boolean {
    return (
      this.props.myUserInfo?.local_user_view.person.id ===
      this.props.private_message_view.creator.id
    );
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
              <PersonListing
                person={otherPerson}
                banned={false}
                myUserInfo={this.props.myUserInfo}
              />
            </li>
            <li className="list-inline-item">
              <span>
                <MomentTime
                  published={message_view.private_message.published_at}
                  updated={message_view.private_message.updated_at}
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
              myUserInfo={this.props.myUserInfo}
              onEdit={this.handleEdit}
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
                  dangerouslySetInnerHTML={mdToHtmlNoImages(
                    this.messageUnlessRemoved,
                    () => this.forceUpdate(),
                  )}
                />
              )}
              <ul className="list-inline mb-0 text-muted fw-bold">
                {!this.mine && (
                  <>
                    {
                      <li className="list-inline-item">
                        <button
                          type="button"
                          className="btn btn-link btn-animate text-muted"
                          onClick={linkEvent(this, this.handleMarkRead)}
                          data-tippy-content={mark_as_read_i18n(
                            this.props.read,
                          )}
                          aria-label={mark_as_read_i18n(this.props.read)}
                        >
                          {this.state.readLoading ? (
                            <Spinner />
                          ) : (
                            <Icon
                              icon="check"
                              classes={`icon-inline ${
                                this.props.read && "text-success"
                              }`}
                            />
                          )}
                        </button>
                      </li>
                    }
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
        <ModActionFormModal
          onSubmit={this.handleReportSubmit}
          modActionType="report-message"
          onCancel={this.hideReportDialog}
          show={this.state.showReportDialog}
        />
        {this.state.showReply && (
          <div className="row">
            <div className="col-sm-6">
              <PrivateMessageForm
                replyType
                recipient={otherPerson}
                myUserInfo={this.props.myUserInfo}
                onCreate={this.handleCreate}
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

  async handleCreate(form: CreatePrivateMessage): Promise<boolean> {
    const success = await this.props.onCreate(form);
    if (success) {
      this.setState({ showReply: false });
    }
    return success;
  }

  async handleEdit(form: EditPrivateMessage): Promise<boolean> {
    const success = await this.props.onEdit(form);
    if (success) {
      this.setState({ showEdit: false });
    }
    return success;
  }

  handleMarkRead(i: PrivateMessage) {
    i.setState({ readLoading: true });
    i.props.onMarkRead(
      i.props.private_message_view.private_message.id,
      !i.props.read,
    );
  }

  handleMessageCollapse(i: PrivateMessage) {
    i.setState({ collapsed: !i.state.collapsed });
  }

  handleViewSource(i: PrivateMessage) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowReportDialog(i: PrivateMessage) {
    i.setState({ showReportDialog: true });
  }

  hideReportDialog() {
    this.setState({
      showReportDialog: false,
    });
  }

  async handleReportSubmit(reason: string) {
    this.props.onReport({
      private_message_id: this.props.private_message_view.private_message.id,
      reason,
    });

    this.hideReportDialog();
  }
}
