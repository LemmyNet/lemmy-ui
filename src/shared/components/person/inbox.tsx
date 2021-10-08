import { Component, linkEvent } from "inferno";
import {
  BlockPersonResponse,
  CommentReportResponse,
  CommentResponse,
  CommentView,
  GetPersonMentions,
  GetPersonMentionsResponse,
  GetPrivateMessages,
  GetReplies,
  GetRepliesResponse,
  PersonMentionResponse,
  PersonMentionView,
  PostReportResponse,
  PrivateMessageResponse,
  PrivateMessagesResponse,
  PrivateMessageView,
  SiteView,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  commentsToFlatNodes,
  createCommentLikeRes,
  editCommentRes,
  fetchLimit,
  isBrowser,
  saveCommentRes,
  setIsoData,
  setupTippy,
  toast,
  updatePersonBlock,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { SortSelect } from "../common/sort-select";
import { PrivateMessage } from "../private_message/private-message";

enum UnreadOrAll {
  Unread,
  All,
}

enum MessageType {
  All,
  Replies,
  Mentions,
  Messages,
}

enum ReplyEnum {
  Reply,
  Mention,
  Message,
}
type ReplyType = {
  id: number;
  type_: ReplyEnum;
  view: CommentView | PrivateMessageView | PersonMentionView;
  published: string;
};

interface InboxState {
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  replies: CommentView[];
  mentions: PersonMentionView[];
  messages: PrivateMessageView[];
  combined: ReplyType[];
  sort: SortType;
  page: number;
  site_view: SiteView;
  loading: boolean;
}

export class Inbox extends Component<any, InboxState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: InboxState = {
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    replies: [],
    mentions: [],
    messages: [],
    combined: [],
    sort: SortType.New,
    page: 1,
    site_view: this.isoData.site_res.site_view,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.replies = this.isoData.routeData[0].replies || [];
      this.state.mentions = this.isoData.routeData[1].mentions || [];
      this.state.messages = this.isoData.routeData[2].messages || [];
      this.state.combined = this.buildCombined();
      this.state.loading = false;
    } else {
      this.refetch();
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `@${
      UserService.Instance.myUserInfo.local_user_view.person.name
    } ${i18n.t("inbox")} - ${this.state.site_view.site.name}`;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
              />
              <h5 class="mb-2">
                {i18n.t("inbox")}
                <small>
                  <a
                    href={`/feeds/inbox/${UserService.Instance.auth}.xml`}
                    title="RSS"
                    rel="noopener"
                  >
                    <Icon icon="rss" classes="ml-2 text-muted small" />
                  </a>
                </small>
              </h5>
              {this.state.replies.length +
                this.state.mentions.length +
                this.state.messages.length >
                0 &&
                this.state.unreadOrAll == UnreadOrAll.Unread && (
                  <button
                    class="btn btn-secondary mb-2"
                    onClick={linkEvent(this, this.markAllAsRead)}
                  >
                    {i18n.t("mark_all_as_read")}
                  </button>
                )}
              {this.selects()}
              {this.state.messageType == MessageType.All && this.all()}
              {this.state.messageType == MessageType.Replies && this.replies()}
              {this.state.messageType == MessageType.Mentions &&
                this.mentions()}
              {this.state.messageType == MessageType.Messages &&
                this.messages()}
              <Paginator
                page={this.state.page}
                onChange={this.handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  unreadOrAllRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.Unread && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.Unread}
            checked={this.state.unreadOrAll == UnreadOrAll.Unread}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("unread")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.All && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.All}
            checked={this.state.unreadOrAll == UnreadOrAll.All}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("all")}
        </label>
      </div>
    );
  }

  messageTypeRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.All && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.All}
            checked={this.state.messageType == MessageType.All}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("all")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.Replies && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.Replies}
            checked={this.state.messageType == MessageType.Replies}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("replies")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.Mentions && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.Mentions}
            checked={this.state.messageType == MessageType.Mentions}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("mentions")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.Messages && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.Messages}
            checked={this.state.messageType == MessageType.Messages}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("messages")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span class="mr-3">{this.unreadOrAllRadios()}</span>
        <span class="mr-3">{this.messageTypeRadios()}</span>
        <SortSelect
          sort={this.state.sort}
          onChange={this.handleSortChange}
          hideHot
          hideMostComments
        />
      </div>
    );
  }

  replyToReplyType(r: CommentView): ReplyType {
    return {
      id: r.comment.id,
      type_: ReplyEnum.Reply,
      view: r,
      published: r.comment.published,
    };
  }

  mentionToReplyType(r: PersonMentionView): ReplyType {
    return {
      id: r.person_mention.id,
      type_: ReplyEnum.Mention,
      view: r,
      published: r.comment.published,
    };
  }

  messageToReplyType(r: PrivateMessageView): ReplyType {
    return {
      id: r.private_message.id,
      type_: ReplyEnum.Message,
      view: r,
      published: r.private_message.published,
    };
  }

  buildCombined(): ReplyType[] {
    let replies: ReplyType[] = this.state.replies.map(r =>
      this.replyToReplyType(r)
    );
    let mentions: ReplyType[] = this.state.mentions.map(r =>
      this.mentionToReplyType(r)
    );
    let messages: ReplyType[] = this.state.messages.map(r =>
      this.messageToReplyType(r)
    );

    return [...replies, ...mentions, ...messages].sort((a, b) =>
      b.published.localeCompare(a.published)
    );
  }

  renderReplyType(i: ReplyType) {
    switch (i.type_) {
      case ReplyEnum.Reply:
        return (
          <CommentNodes
            key={i.id}
            nodes={[{ comment_view: i.view as CommentView }]}
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={this.state.site_view.site.enable_downvotes}
          />
        );
      case ReplyEnum.Mention:
        return (
          <CommentNodes
            key={i.id}
            nodes={[{ comment_view: i.view as PersonMentionView }]}
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={this.state.site_view.site.enable_downvotes}
          />
        );
      case ReplyEnum.Message:
        return (
          <PrivateMessage
            key={i.id}
            private_message_view={i.view as PrivateMessageView}
          />
        );
      default:
        return <div />;
    }
  }

  all() {
    return <div>{this.state.combined.map(i => this.renderReplyType(i))}</div>;
  }

  replies() {
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.state.replies)}
          noIndent
          markable
          showCommunity
          showContext
          enableDownvotes={this.state.site_view.site.enable_downvotes}
        />
      </div>
    );
  }

  mentions() {
    return (
      <div>
        {this.state.mentions.map(umv => (
          <CommentNodes
            key={umv.person_mention.id}
            nodes={[{ comment_view: umv }]}
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={this.state.site_view.site.enable_downvotes}
          />
        ))}
      </div>
    );
  }

  messages() {
    return (
      <div>
        {this.state.messages.map(pmv => (
          <PrivateMessage
            key={pmv.private_message.id}
            private_message_view={pmv}
          />
        ))}
      </div>
    );
  }

  handlePageChange(page: number) {
    this.setState({ page });
    this.refetch();
  }

  handleUnreadOrAllChange(i: Inbox, event: any) {
    i.state.unreadOrAll = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  handleMessageTypeChange(i: Inbox, event: any) {
    i.state.messageType = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    // It can be /u/me, or /username/1
    let repliesForm: GetReplies = {
      sort: SortType.New,
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.getReplies(repliesForm));

    let personMentionsForm: GetPersonMentions = {
      sort: SortType.New,
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.getPersonMentions(personMentionsForm));

    let privateMessagesForm: GetPrivateMessages = {
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.getPrivateMessages(privateMessagesForm));

    return promises;
  }

  refetch() {
    let repliesForm: GetReplies = {
      sort: this.state.sort,
      unread_only: this.state.unreadOrAll == UnreadOrAll.Unread,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.getReplies(repliesForm));

    let personMentionsForm: GetPersonMentions = {
      sort: this.state.sort,
      unread_only: this.state.unreadOrAll == UnreadOrAll.Unread,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(),
    };
    WebSocketService.Instance.send(
      wsClient.getPersonMentions(personMentionsForm)
    );

    let privateMessagesForm: GetPrivateMessages = {
      unread_only: this.state.unreadOrAll == UnreadOrAll.Unread,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(),
    };
    WebSocketService.Instance.send(
      wsClient.getPrivateMessages(privateMessagesForm)
    );
  }

  handleSortChange(val: SortType) {
    this.state.sort = val;
    this.state.page = 1;
    this.setState(this.state);
    this.refetch();
  }

  markAllAsRead(i: Inbox) {
    WebSocketService.Instance.send(
      wsClient.markAllAsRead({
        auth: authField(),
      })
    );
    i.state.replies = [];
    i.state.mentions = [];
    i.state.messages = [];
    i.sendUnreadCount();
    window.scrollTo(0, 0);
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      this.refetch();
    } else if (op == UserOperation.GetReplies) {
      let data = wsJsonToRes<GetRepliesResponse>(msg).data;
      this.state.replies = data.replies;
      this.state.combined = this.buildCombined();
      this.state.loading = false;
      this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.GetPersonMentions) {
      let data = wsJsonToRes<GetPersonMentionsResponse>(msg).data;
      this.state.mentions = data.mentions;
      this.state.combined = this.buildCombined();
      this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.GetPrivateMessages) {
      let data = wsJsonToRes<PrivateMessagesResponse>(msg).data;
      this.state.messages = data.private_messages;
      this.state.combined = this.buildCombined();
      this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.EditPrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      let found: PrivateMessageView = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );
      if (found) {
        let combinedView = this.state.combined.find(
          i => i.id == data.private_message_view.private_message.id
        ).view as PrivateMessageView;
        found.private_message.content = combinedView.private_message.content =
          data.private_message_view.private_message.content;
        found.private_message.updated = combinedView.private_message.updated =
          data.private_message_view.private_message.updated;
      }
      this.setState(this.state);
    } else if (op == UserOperation.DeletePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      let found: PrivateMessageView = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );
      if (found) {
        let combinedView = this.state.combined.find(
          i => i.id == data.private_message_view.private_message.id
        ).view as PrivateMessageView;
        found.private_message.deleted = combinedView.private_message.deleted =
          data.private_message_view.private_message.deleted;
        found.private_message.updated = combinedView.private_message.updated =
          data.private_message_view.private_message.updated;
      }
      this.setState(this.state);
    } else if (op == UserOperation.MarkPrivateMessageAsRead) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      let found: PrivateMessageView = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i => i.id == data.private_message_view.private_message.id
        ).view as PrivateMessageView;
        found.private_message.updated = combinedView.private_message.updated =
          data.private_message_view.private_message.updated;

        // If youre in the unread view, just remove it from the list
        if (
          this.state.unreadOrAll == UnreadOrAll.Unread &&
          data.private_message_view.private_message.read
        ) {
          this.state.messages = this.state.messages.filter(
            r =>
              r.private_message.id !==
              data.private_message_view.private_message.id
          );
          this.state.combined = this.state.combined.filter(
            r => r.id !== data.private_message_view.private_message.id
          );
        } else {
          found.private_message.read = combinedView.private_message.read =
            data.private_message_view.private_message.read;
        }
      }
      this.sendUnreadCount();
      this.setState(this.state);
    } else if (op == UserOperation.MarkAllAsRead) {
      // Moved to be instant
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(data.comment_view, this.state.replies);
      this.setState(this.state);
    } else if (op == UserOperation.MarkCommentAsRead) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      // If youre in the unread view, just remove it from the list
      if (
        this.state.unreadOrAll == UnreadOrAll.Unread &&
        data.comment_view.comment.read
      ) {
        this.state.replies = this.state.replies.filter(
          r => r.comment.id !== data.comment_view.comment.id
        );
        this.state.combined = this.state.combined.filter(
          r => r.id !== data.comment_view.comment.id
        );
      } else {
        let found = this.state.replies.find(
          c => c.comment.id == data.comment_view.comment.id
        );
        let combinedView = this.state.combined.find(
          i => i.id == data.comment_view.comment.id
        ).view as CommentView;
        found.comment.read = combinedView.comment.read =
          data.comment_view.comment.read;
      }
      this.sendUnreadCount();
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.MarkPersonMentionAsRead) {
      let data = wsJsonToRes<PersonMentionResponse>(msg).data;

      // TODO this might not be correct, it might need to use the comment id
      let found = this.state.mentions.find(
        c => c.person_mention.id == data.person_mention_view.person_mention.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i => i.id == data.person_mention_view.person_mention.id
        ).view as PersonMentionView;
        found.comment.content = combinedView.comment.content =
          data.person_mention_view.comment.content;
        found.comment.updated = combinedView.comment.updated =
          data.person_mention_view.comment.updated;
        found.comment.removed = combinedView.comment.removed =
          data.person_mention_view.comment.removed;
        found.comment.deleted = combinedView.comment.deleted =
          data.person_mention_view.comment.deleted;
        found.counts.upvotes = combinedView.counts.upvotes =
          data.person_mention_view.counts.upvotes;
        found.counts.downvotes = combinedView.counts.downvotes =
          data.person_mention_view.counts.downvotes;
        found.counts.score = combinedView.counts.score =
          data.person_mention_view.counts.score;

        // If youre in the unread view, just remove it from the list
        if (
          this.state.unreadOrAll == UnreadOrAll.Unread &&
          data.person_mention_view.person_mention.read
        ) {
          this.state.mentions = this.state.mentions.filter(
            r =>
              r.person_mention.id !== data.person_mention_view.person_mention.id
          );
          this.state.combined = this.state.combined.filter(
            r => r.id !== data.person_mention_view.person_mention.id
          );
        } else {
          // TODO test to make sure these mentions are getting marked as read
          found.person_mention.read = combinedView.person_mention.read =
            data.person_mention_view.person_mention.read;
        }
      }
      this.sendUnreadCount();
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      if (
        data.recipient_ids.includes(
          UserService.Instance.myUserInfo.local_user_view.local_user.id
        )
      ) {
        this.state.replies.unshift(data.comment_view);
        this.state.combined.unshift(this.replyToReplyType(data.comment_view));
        this.setState(this.state);
      } else if (
        data.comment_view.creator.id ==
        UserService.Instance.myUserInfo.local_user_view.person.id
      ) {
        // If youre in the unread view, just remove it from the list
        if (this.state.unreadOrAll == UnreadOrAll.Unread) {
          this.state.replies = this.state.replies.filter(
            r => r.comment.id !== data.comment_view.comment.parent_id
          );
          this.state.combined = this.state.combined.filter(r => {
            if (this.isMention(r.view))
              return r.view.comment.id !== data.comment_view.comment.parent_id;
            else return r.id !== data.comment_view.comment.parent_id;
          });
        } else {
          this.state.mentions.forEach(i => {
            if (i.comment.id == data.comment_view.comment.parent_id) {
              i.person_mention.read = true;
            }
          });
          this.state.replies.forEach(i => {
            if (i.comment.id == data.comment_view.comment.parent_id) {
              i.comment.read = true;
            }
          });
          this.state.combined = this.buildCombined();
        }
        this.sendUnreadCount();
        this.setState(this.state);
        setupTippy();
        // TODO this seems wrong, you should be using form_id
        toast(i18n.t("reply_sent"));
      }
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      if (
        data.private_message_view.recipient.id ==
        UserService.Instance.myUserInfo.local_user_view.person.id
      ) {
        this.state.messages.unshift(data.private_message_view);
        this.state.combined.unshift(
          this.messageToReplyType(data.private_message_view)
        );
        this.setState(this.state);
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(data.comment_view, this.state.replies);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(data.comment_view, this.state.replies);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg).data;
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg).data;
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg).data;
      if (data) {
        toast(i18n.t("report_created"));
      }
    }
  }

  sendUnreadCount() {
    UserService.Instance.unreadInboxCountSub.next(this.unreadCount());
  }

  unreadCount(): number {
    return (
      this.state.replies.filter(r => !r.comment.read).length +
      this.state.mentions.filter(r => !r.person_mention.read).length +
      this.state.messages.filter(
        r =>
          UserService.Instance.myUserInfo &&
          !r.private_message.read &&
          // TODO also seems very strange and wrong
          r.creator.id !==
            UserService.Instance.myUserInfo.local_user_view.person.id
      ).length
    );
  }
  
  isMention(view: any): view is PersonMentionView {
    return (view as PersonMentionView).person_mention !== undefined;
  }
}
