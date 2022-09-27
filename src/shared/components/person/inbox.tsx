import { None, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  BlockPersonResponse,
  CommentReplyResponse,
  CommentReplyView,
  CommentReportResponse,
  CommentResponse,
  CommentSortType,
  CommentView,
  GetPersonMentions,
  GetPersonMentionsResponse,
  GetPrivateMessages,
  GetReplies,
  GetRepliesResponse,
  GetSiteResponse,
  PersonMentionResponse,
  PersonMentionView,
  PostReportResponse,
  PrivateMessageResponse,
  PrivateMessagesResponse,
  PrivateMessageView,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { CommentViewType, InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  commentsToFlatNodes,
  createCommentLikeRes,
  editCommentRes,
  enableDownvotes,
  fetchLimit,
  isBrowser,
  relTags,
  saveCommentRes,
  setIsoData,
  setupTippy,
  toast,
  updatePersonBlock,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { CommentSortSelect } from "../common/comment-sort-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
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
  view: CommentView | PrivateMessageView | PersonMentionView | CommentReplyView;
  published: string;
};

interface InboxState {
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  replies: CommentReplyView[];
  mentions: PersonMentionView[];
  messages: PrivateMessageView[];
  combined: ReplyType[];
  sort: CommentSortType;
  page: number;
  siteRes: GetSiteResponse;
  loading: boolean;
}

export class Inbox extends Component<any, InboxState> {
  private isoData = setIsoData(
    this.context,
    GetRepliesResponse,
    GetPersonMentionsResponse,
    PrivateMessagesResponse
  );
  private subscription: Subscription;
  private emptyState: InboxState = {
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    replies: [],
    mentions: [],
    messages: [],
    combined: [],
    sort: CommentSortType.New,
    page: 1,
    siteRes: this.isoData.site_res,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    if (UserService.Instance.myUserInfo.isNone() && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        replies:
          (this.isoData.routeData[0] as GetRepliesResponse).replies || [],
        mentions:
          (this.isoData.routeData[1] as GetPersonMentionsResponse).mentions ||
          [],
        messages:
          (this.isoData.routeData[2] as PrivateMessagesResponse)
            .private_messages || [],
        loading: false,
      };
      this.state = { ...this.state, combined: this.buildCombined() };
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
    return this.state.siteRes.site_view.match({
      some: siteView =>
        UserService.Instance.myUserInfo.match({
          some: mui =>
            `@${mui.local_user_view.person.name} ${i18n.t("inbox")} - ${
              siteView.site.name
            }`,
          none: "",
        }),
      none: "",
    });
  }

  render() {
    let inboxRss = auth()
      .ok()
      .map(a => `/feeds/inbox/${a}.xml`);
    return (
      <div className="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div className="row">
            <div className="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                description={None}
                image={None}
              />
              <h5 className="mb-2">
                {i18n.t("inbox")}
                {inboxRss.match({
                  some: rss => (
                    <small>
                      <a href={rss} title="RSS" rel={relTags}>
                        <Icon icon="rss" classes="ml-2 text-muted small" />
                      </a>
                      <link
                        rel="alternate"
                        type="application/atom+xml"
                        href={rss}
                      />
                    </small>
                  ),
                  none: <></>,
                })}
              </h5>
              {this.state.replies.length +
                this.state.mentions.length +
                this.state.messages.length >
                0 &&
                this.state.unreadOrAll == UnreadOrAll.Unread && (
                  <button
                    className="btn btn-secondary mb-2"
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
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
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
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
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
        <span className="mr-3">{this.unreadOrAllRadios()}</span>
        <span className="mr-3">{this.messageTypeRadios()}</span>
        <CommentSortSelect
          sort={this.state.sort}
          onChange={this.handleSortChange}
        />
      </div>
    );
  }

  replyToReplyType(r: CommentReplyView): ReplyType {
    return {
      id: r.comment_reply.id,
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
            nodes={[
              { comment_view: i.view as CommentView, children: [], depth: 0 },
            ]}
            viewType={CommentViewType.Flat}
            moderators={None}
            admins={None}
            maxCommentsShown={None}
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
          />
        );
      case ReplyEnum.Mention:
        return (
          <CommentNodes
            key={i.id}
            nodes={[
              {
                comment_view: i.view as PersonMentionView,
                children: [],
                depth: 0,
              },
            ]}
            viewType={CommentViewType.Flat}
            moderators={None}
            admins={None}
            maxCommentsShown={None}
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
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
          viewType={CommentViewType.Flat}
          moderators={None}
          admins={None}
          maxCommentsShown={None}
          noIndent
          markable
          showCommunity
          showContext
          enableDownvotes={enableDownvotes(this.state.siteRes)}
          allLanguages={this.state.siteRes.all_languages}
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
            nodes={[{ comment_view: umv, children: [], depth: 0 }]}
            viewType={CommentViewType.Flat}
            moderators={None}
            admins={None}
            maxCommentsShown={None}
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
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
    i.setState({ unreadOrAll: Number(event.target.value), page: 1 });
    i.refetch();
  }

  handleMessageTypeChange(i: Inbox, event: any) {
    i.setState({ messageType: Number(event.target.value), page: 1 });
    i.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let sort = Some(CommentSortType.New);

    // It can be /u/me, or /username/1
    let repliesForm = new GetReplies({
      sort,
      unread_only: Some(true),
      page: Some(1),
      limit: Some(fetchLimit),
      auth: req.auth.unwrap(),
    });
    promises.push(req.client.getReplies(repliesForm));

    let personMentionsForm = new GetPersonMentions({
      sort,
      unread_only: Some(true),
      page: Some(1),
      limit: Some(fetchLimit),
      auth: req.auth.unwrap(),
    });
    promises.push(req.client.getPersonMentions(personMentionsForm));

    let privateMessagesForm = new GetPrivateMessages({
      unread_only: Some(true),
      page: Some(1),
      limit: Some(fetchLimit),
      auth: req.auth.unwrap(),
    });
    promises.push(req.client.getPrivateMessages(privateMessagesForm));

    return promises;
  }

  refetch() {
    let sort = Some(this.state.sort);
    let unread_only = Some(this.state.unreadOrAll == UnreadOrAll.Unread);
    let page = Some(this.state.page);
    let limit = Some(fetchLimit);

    let repliesForm = new GetReplies({
      sort,
      unread_only,
      page,
      limit,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.getReplies(repliesForm));

    let personMentionsForm = new GetPersonMentions({
      sort,
      unread_only,
      page,
      limit,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(
      wsClient.getPersonMentions(personMentionsForm)
    );

    let privateMessagesForm = new GetPrivateMessages({
      unread_only,
      page,
      limit,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(
      wsClient.getPrivateMessages(privateMessagesForm)
    );
  }

  handleSortChange(val: CommentSortType) {
    this.setState({ sort: val, page: 1 });
    this.refetch();
  }

  markAllAsRead(i: Inbox) {
    WebSocketService.Instance.send(
      wsClient.markAllAsRead({
        auth: auth().unwrap(),
      })
    );
    i.setState({ replies: [], mentions: [], messages: [] });
    i.setState({ combined: i.buildCombined() });
    UserService.Instance.unreadInboxCountSub.next(0);
    window.scrollTo(0, 0);
    i.setState(i.state);
  }

  sendUnreadCount(read: boolean) {
    let urcs = UserService.Instance.unreadInboxCountSub;
    if (read) {
      urcs.next(urcs.getValue() - 1);
    } else {
      urcs.next(urcs.getValue() + 1);
    }
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
      let data = wsJsonToRes<GetRepliesResponse>(msg, GetRepliesResponse);
      this.setState({ replies: data.replies });
      this.setState({ combined: this.buildCombined(), loading: false });
      window.scrollTo(0, 0);
      setupTippy();
    } else if (op == UserOperation.GetPersonMentions) {
      let data = wsJsonToRes<GetPersonMentionsResponse>(
        msg,
        GetPersonMentionsResponse
      );
      this.setState({ mentions: data.mentions });
      this.setState({ combined: this.buildCombined() });
      window.scrollTo(0, 0);
      setupTippy();
    } else if (op == UserOperation.GetPrivateMessages) {
      let data = wsJsonToRes<PrivateMessagesResponse>(
        msg,
        PrivateMessagesResponse
      );
      this.setState({ messages: data.private_messages });
      this.setState({ combined: this.buildCombined() });
      window.scrollTo(0, 0);
      setupTippy();
    } else if (op == UserOperation.EditPrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(
        msg,
        PrivateMessageResponse
      );
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
      let data = wsJsonToRes<PrivateMessageResponse>(
        msg,
        PrivateMessageResponse
      );
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
      let data = wsJsonToRes<PrivateMessageResponse>(
        msg,
        PrivateMessageResponse
      );
      let found: PrivateMessageView = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i =>
            i.id == data.private_message_view.private_message.id &&
            i.type_ == ReplyEnum.Message
        ).view as PrivateMessageView;
        found.private_message.updated = combinedView.private_message.updated =
          data.private_message_view.private_message.updated;

        // If youre in the unread view, just remove it from the list
        if (
          this.state.unreadOrAll == UnreadOrAll.Unread &&
          data.private_message_view.private_message.read
        ) {
          this.setState({
            messages: this.state.messages.filter(
              r =>
                r.private_message.id !==
                data.private_message_view.private_message.id
            ),
          });
          this.setState({
            combined: this.state.combined.filter(
              r => r.id !== data.private_message_view.private_message.id
            ),
          });
        } else {
          found.private_message.read = combinedView.private_message.read =
            data.private_message_view.private_message.read;
        }
      }
      this.sendUnreadCount(data.private_message_view.private_message.read);
      this.setState(this.state);
    } else if (op == UserOperation.MarkAllAsRead) {
      // Moved to be instant
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      editCommentRes(data.comment_view, this.state.replies);
      this.setState(this.state);
    } else if (op == UserOperation.MarkCommentReplyAsRead) {
      let data = wsJsonToRes<CommentReplyResponse>(msg, CommentReplyResponse);

      let found = this.state.replies.find(
        c => c.comment_reply.id == data.comment_reply_view.comment_reply.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i =>
            i.id == data.comment_reply_view.comment_reply.id &&
            i.type_ == ReplyEnum.Reply
        ).view as CommentReplyView;
        found.comment.content = combinedView.comment.content =
          data.comment_reply_view.comment.content;
        found.comment.updated = combinedView.comment.updated =
          data.comment_reply_view.comment.updated;
        found.comment.removed = combinedView.comment.removed =
          data.comment_reply_view.comment.removed;
        found.comment.deleted = combinedView.comment.deleted =
          data.comment_reply_view.comment.deleted;
        found.counts.upvotes = combinedView.counts.upvotes =
          data.comment_reply_view.counts.upvotes;
        found.counts.downvotes = combinedView.counts.downvotes =
          data.comment_reply_view.counts.downvotes;
        found.counts.score = combinedView.counts.score =
          data.comment_reply_view.counts.score;

        // If youre in the unread view, just remove it from the list
        if (
          this.state.unreadOrAll == UnreadOrAll.Unread &&
          data.comment_reply_view.comment_reply.read
        ) {
          this.setState({
            replies: this.state.replies.filter(
              r =>
                r.comment_reply.id !== data.comment_reply_view.comment_reply.id
            ),
          });
          this.setState({
            combined: this.state.combined.filter(
              r => r.id !== data.comment_reply_view.comment_reply.id
            ),
          });
        } else {
          found.comment_reply.read = combinedView.comment_reply.read =
            data.comment_reply_view.comment_reply.read;
        }
      }
      this.sendUnreadCount(data.comment_reply_view.comment_reply.read);
      this.setState(this.state);
    } else if (op == UserOperation.MarkPersonMentionAsRead) {
      let data = wsJsonToRes<PersonMentionResponse>(msg, PersonMentionResponse);

      // TODO this might not be correct, it might need to use the comment id
      let found = this.state.mentions.find(
        c => c.person_mention.id == data.person_mention_view.person_mention.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i =>
            i.id == data.person_mention_view.person_mention.id &&
            i.type_ == ReplyEnum.Mention
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
          this.setState({
            mentions: this.state.mentions.filter(
              r =>
                r.person_mention.id !==
                data.person_mention_view.person_mention.id
            ),
          });
          this.setState({
            combined: this.state.combined.filter(
              r => r.id !== data.person_mention_view.person_mention.id
            ),
          });
        } else {
          // TODO test to make sure these mentions are getting marked as read
          found.person_mention.read = combinedView.person_mention.read =
            data.person_mention_view.person_mention.read;
        }
      }
      this.sendUnreadCount(data.person_mention_view.person_mention.read);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(
        msg,
        PrivateMessageResponse
      );
      UserService.Instance.myUserInfo.match({
        some: mui => {
          if (
            data.private_message_view.recipient.id ==
            mui.local_user_view.person.id
          ) {
            this.state.messages.unshift(data.private_message_view);
            this.state.combined.unshift(
              this.messageToReplyType(data.private_message_view)
            );
            this.setState(this.state);
          }
        },
        none: void 0,
      });
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      saveCommentRes(data.comment_view, this.state.replies);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      createCommentLikeRes(data.comment_view, this.state.replies);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg, BlockPersonResponse);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg, PostReportResponse);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg, CommentReportResponse);
      if (data) {
        toast(i18n.t("report_created"));
      }
    }
  }

  isMention(view: any): view is PersonMentionView {
    return (view as PersonMentionView).person_mention !== undefined;
  }

  isReply(view: any): view is CommentReplyView {
    return (view as CommentReplyView).comment_reply !== undefined;
  }
}
