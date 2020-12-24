import { Component, linkEvent } from 'inferno';
import { Subscription } from 'rxjs';
import {
  UserOperation,
  CommentView,
  SortType,
  GetReplies,
  GetRepliesResponse,
  GetUserMentions,
  GetUserMentionsResponse,
  UserMentionResponse,
  CommentResponse,
  PrivateMessageView,
  GetPrivateMessages,
  PrivateMessagesResponse,
  PrivateMessageResponse,
  SiteView,
  UserMentionView,
} from 'lemmy-js-client';
import { WebSocketService, UserService } from '../services';
import {
  wsJsonToRes,
  fetchLimit,
  toast,
  editCommentRes,
  saveCommentRes,
  createCommentLikeRes,
  commentsToFlatNodes,
  setupTippy,
  setIsoData,
  wsSubscribe,
  isBrowser,
  wsUserOp,
} from '../utils';
import { CommentNodes } from './comment-nodes';
import { PrivateMessage } from './private-message';
import { HtmlTags } from './html-tags';
import { SortSelect } from './sort-select';
import { i18n } from '../i18next';
import { InitialFetchRequest } from 'shared/interfaces';

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
  view: CommentView | PrivateMessageView | UserMentionView;
  published: string;
};

interface InboxState {
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  replies: CommentView[];
  mentions: UserMentionView[];
  messages: PrivateMessageView[];
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
    sort: SortType.New,
    page: 1,
    site_view: this.isoData.site_res.site_view,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);

    if (!UserService.Instance.user && isBrowser()) {
      toast(i18n.t('not_logged_in'), 'danger');
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.replies = this.isoData.routeData[0].replies;
      this.state.mentions = this.isoData.routeData[1].mentions;
      this.state.messages = this.isoData.routeData[2].messages;
      this.sendUnreadCount();
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
    return `@${UserService.Instance.user.name} ${i18n.t('inbox')} - ${
      this.state.site_view.site.name
    }`;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <svg class="icon icon-spinner spin">
              <use xlinkHref="#icon-spinner"></use>
            </svg>
          </h5>
        ) : (
          <div class="row">
            <div class="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
              />
              <h5 class="mb-1">
                {i18n.t('inbox')}
                <small>
                  <a
                    href={`/feeds/inbox/${UserService.Instance.auth}.xml`}
                    target="_blank"
                    title="RSS"
                    rel="noopener"
                  >
                    <svg class="icon ml-2 text-muted small">
                      <use xlinkHref="#icon-rss">#</use>
                    </svg>
                  </a>
                </small>
              </h5>
              {this.state.replies.length +
                this.state.mentions.length +
                this.state.messages.length >
                0 &&
                this.state.unreadOrAll == UnreadOrAll.Unread && (
                  <ul class="list-inline mb-1 text-muted small font-weight-bold">
                    <li className="list-inline-item">
                      <span
                        class="pointer"
                        onClick={linkEvent(this, this.markAllAsRead)}
                      >
                        {i18n.t('mark_all_as_read')}
                      </span>
                    </li>
                  </ul>
                )}
              {this.selects()}
              {this.state.messageType == MessageType.All && this.all()}
              {this.state.messageType == MessageType.Replies && this.replies()}
              {this.state.messageType == MessageType.Mentions &&
                this.mentions()}
              {this.state.messageType == MessageType.Messages &&
                this.messages()}
              {this.paginator()}
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
            ${this.state.unreadOrAll == UnreadOrAll.Unread && 'active'}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.Unread}
            checked={this.state.unreadOrAll == UnreadOrAll.Unread}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t('unread')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.All && 'active'}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.All}
            checked={this.state.unreadOrAll == UnreadOrAll.All}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t('all')}
        </label>
      </div>
    );
  }

  messageTypeRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.All && 'active'}
          `}
        >
          <input
            type="radio"
            value={MessageType.All}
            checked={this.state.messageType == MessageType.All}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t('all')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.Replies && 'active'}
          `}
        >
          <input
            type="radio"
            value={MessageType.Replies}
            checked={this.state.messageType == MessageType.Replies}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t('replies')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.Mentions && 'active'}
          `}
        >
          <input
            type="radio"
            value={MessageType.Mentions}
            checked={this.state.messageType == MessageType.Mentions}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t('mentions')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.Messages && 'active'}
          `}
        >
          <input
            type="radio"
            value={MessageType.Messages}
            checked={this.state.messageType == MessageType.Messages}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t('messages')}
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
        />
      </div>
    );
  }

  combined(): ReplyType[] {
    let id = 0;
    let replies: ReplyType[] = this.state.replies.map(r => ({
      id: id++,
      type_: ReplyEnum.Reply,
      view: r,
      published: r.comment.published,
    }));
    let mentions: ReplyType[] = this.state.mentions.map(r => ({
      id: id++,
      type_: ReplyEnum.Mention,
      view: r,
      published: r.comment.published,
    }));
    let messages: ReplyType[] = this.state.messages.map(r => ({
      id: id++,
      type_: ReplyEnum.Message,
      view: r,
      published: r.private_message.published,
    }));

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
            nodes={[{ comment_view: i.view as UserMentionView }]}
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
    return <div>{this.combined().map(i => this.renderReplyType(i))}</div>;
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
            key={umv.user_mention.id}
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

  paginator() {
    return (
      <div class="mt-2">
        {this.state.page > 1 && (
          <button
            class="btn btn-secondary mr-1"
            onClick={linkEvent(this, this.prevPage)}
          >
            {i18n.t('prev')}
          </button>
        )}
        {this.unreadCount() > 0 && (
          <button
            class="btn btn-secondary"
            onClick={linkEvent(this, this.nextPage)}
          >
            {i18n.t('next')}
          </button>
        )}
      </div>
    );
  }

  nextPage(i: Inbox) {
    i.state.page++;
    i.setState(i.state);
    i.refetch();
  }

  prevPage(i: Inbox) {
    i.state.page--;
    i.setState(i.state);
    i.refetch();
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

    let userMentionsForm: GetUserMentions = {
      sort: SortType.New,
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.getUserMentions(userMentionsForm));

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
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.getReplies(repliesForm);

    let userMentionsForm: GetUserMentions = {
      sort: this.state.sort,
      unread_only: this.state.unreadOrAll == UnreadOrAll.Unread,
      page: this.state.page,
      limit: fetchLimit,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.getUserMentions(userMentionsForm);

    let privateMessagesForm: GetPrivateMessages = {
      unread_only: this.state.unreadOrAll == UnreadOrAll.Unread,
      page: this.state.page,
      limit: fetchLimit,
      auth: UserService.Instance.authField(),
    };
    WebSocketService.Instance.client.getPrivateMessages(privateMessagesForm);
  }

  handleSortChange(val: SortType) {
    this.state.sort = val;
    this.state.page = 1;
    this.setState(this.state);
    this.refetch();
  }

  markAllAsRead(i: Inbox) {
    WebSocketService.Instance.client.markAllAsRead({
      auth: UserService.Instance.authField(),
    });
    i.state.replies = [];
    i.state.mentions = [];
    i.state.messages = [];
    i.sendUnreadCount();
    window.scrollTo(0, 0);
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      return;
    } else if (msg.reconnect) {
      this.refetch();
    } else if (op == UserOperation.GetReplies) {
      let data = wsJsonToRes<GetRepliesResponse>(msg).data;
      this.state.replies = data.replies;
      this.state.loading = false;
      this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.GetUserMentions) {
      let data = wsJsonToRes<GetUserMentionsResponse>(msg).data;
      this.state.mentions = data.mentions;
      this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.GetPrivateMessages) {
      let data = wsJsonToRes<PrivateMessagesResponse>(msg).data;
      this.state.messages = data.private_messages;
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
        found.private_message.content =
          data.private_message_view.private_message.content;
        found.private_message.updated =
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
        found.private_message.deleted =
          data.private_message_view.private_message.deleted;
        found.private_message.updated =
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
        found.private_message.updated =
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
        } else {
          let found = this.state.messages.find(
            c =>
              c.private_message.id ==
              data.private_message_view.private_message.id
          );
          found.private_message.read =
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
      } else {
        let found = this.state.replies.find(
          c => c.comment.id == data.comment_view.comment.id
        );
        found.comment.read = data.comment_view.comment.read;
      }
      this.sendUnreadCount();
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.MarkUserMentionAsRead) {
      let data = wsJsonToRes<UserMentionResponse>(msg).data;

      // TODO this might not be correct, it might need to use the comment id
      let found = this.state.mentions.find(
        c => c.user_mention.id == data.user_mention_view.user_mention.id
      );
      found.comment.content = data.user_mention_view.comment.content;
      found.comment.updated = data.user_mention_view.comment.updated;
      found.comment.removed = data.user_mention_view.comment.removed;
      found.comment.deleted = data.user_mention_view.comment.deleted;
      found.counts.upvotes = data.user_mention_view.counts.upvotes;
      found.counts.downvotes = data.user_mention_view.counts.downvotes;
      found.counts.score = data.user_mention_view.counts.score;

      // If youre in the unread view, just remove it from the list
      if (
        this.state.unreadOrAll == UnreadOrAll.Unread &&
        data.user_mention_view.user_mention.read
      ) {
        this.state.mentions = this.state.mentions.filter(
          r => r.user_mention.id !== data.user_mention_view.user_mention.id
        );
      } else {
        let found = this.state.mentions.find(
          c => c.user_mention.id == data.user_mention_view.user_mention.id
        );
        // TODO test to make sure these mentions are getting marked as read
        found.user_mention.read = data.user_mention_view.user_mention.read;
      }
      this.sendUnreadCount();
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      if (data.recipient_ids.includes(UserService.Instance.user.id)) {
        this.state.replies.unshift(data.comment_view);
        this.setState(this.state);
      } else if (data.comment_view.creator.id == UserService.Instance.user.id) {
        // TODO this seems wrong, you should be using form_id
        toast(i18n.t('reply_sent'));
      }
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;
      if (
        data.private_message_view.recipient.id == UserService.Instance.user.id
      ) {
        this.state.messages.unshift(data.private_message_view);
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
    }
  }

  sendUnreadCount() {
    UserService.Instance.unreadCountSub.next(this.unreadCount());
  }

  unreadCount(): number {
    return (
      this.state.replies.filter(r => !r.comment.read).length +
      this.state.mentions.filter(r => !r.user_mention.read).length +
      this.state.messages.filter(
        r =>
          UserService.Instance.user &&
          !r.private_message.read &&
          // TODO also seems very strang and wrong
          r.creator.id !== UserService.Instance.user.id
      ).length
    );
  }
}
