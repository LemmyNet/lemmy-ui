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
  PrivateMessageReportResponse,
  PrivateMessageResponse,
  PrivateMessageView,
  PrivateMessagesResponse,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { CommentViewType, InitialFetchRequest } from "../../interfaces";
import { UserService } from "../../services";
import {
  commentsToFlatNodes,
  editComments,
  enableDownvotes,
  fetchLimit,
  isBrowser,
  isInitialRoute,
  myAuth,
  myAuthRequired,
  relTags,
  setIsoData,
  setupTippy,
  toast,
  updatePersonBlock,
} from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { CommentSortSelect } from "../common/comment-sort-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { PrivateMessage } from "../private_message/private-message";
import {
  HttpService,
  RequestState,
  apiWrapper,
} from "../../services/HttpService";

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
  repliesRes: RequestState<GetRepliesResponse>;
  mentionsRes: RequestState<GetPersonMentionsResponse>;
  messagesRes: RequestState<PrivateMessagesResponse>;
  sort: CommentSortType;
  page: number;
  siteRes: GetSiteResponse;
}

export class Inbox extends Component<any, InboxState> {
  private isoData = setIsoData(this.context);
  state: InboxState = {
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    sort: "New",
    page: 1,
    siteRes: this.isoData.site_res,
    repliesRes: { state: "empty" },
    mentionsRes: { state: "empty" },
    messagesRes: { state: "empty" },
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        repliesRes: apiWrapper(this.isoData.routeData[0] as GetRepliesResponse),
        mentionsRes: apiWrapper(
          this.isoData.routeData[1] as GetPersonMentionsResponse
        ),
        messagesRes: apiWrapper(
          this.isoData.routeData[2] as PrivateMessagesResponse
        ),
      };
    }
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.refetch();
    }
  }

  get documentTitle(): string {
    let mui = UserService.Instance.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${i18n.t("inbox")} - ${
          this.state.siteRes.site_view.site.name
        }`
      : "";
  }

  get hasUnreads(): boolean {
    if (this.state.unreadOrAll == UnreadOrAll.Unread) {
      const { repliesRes, mentionsRes, messagesRes } = this.state;
      const replyCount =
        repliesRes.state == "success" ? repliesRes.data.replies.length : 0;
      const mentionCount =
        mentionsRes.state == "success" ? mentionsRes.data.mentions.length : 0;
      const messageCount =
        messagesRes.state == "success"
          ? messagesRes.data.private_messages.length
          : 0;

      return replyCount + mentionCount + messageCount > 0;
    } else {
      return false;
    }
  }

  render() {
    let auth = myAuth();
    let inboxRss = auth ? `/feeds/inbox/${auth}.xml` : undefined;
    return (
      <div className="container-lg">
        <div className="row">
          <div className="col-12">
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <h5 className="mb-2">
              {i18n.t("inbox")}
              {inboxRss && (
                <small>
                  <a href={inboxRss} title="RSS" rel={relTags}>
                    <Icon icon="rss" classes="ml-2 text-muted small" />
                  </a>
                  <link
                    rel="alternate"
                    type="application/atom+xml"
                    href={inboxRss}
                  />
                </small>
              )}
            </h5>
            {this.hasUnreads && (
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
            {this.state.messageType == MessageType.Mentions && this.mentions()}
            {this.state.messageType == MessageType.Messages && this.messages()}
            <Paginator
              page={this.state.page}
              onChange={this.handlePageChange}
            />
          </div>
        </div>
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
    let replies: ReplyType[] =
      this.state.repliesRes.state == "success"
        ? this.state.repliesRes.data.replies.map(r => this.replyToReplyType(r))
        : [];
    let mentions: ReplyType[] =
      this.state.mentionsRes.state == "success"
        ? this.state.mentionsRes.data.mentions.map(r =>
            this.mentionToReplyType(r)
          )
        : [];
    let messages: ReplyType[] =
      this.state.messagesRes.state == "success"
        ? this.state.messagesRes.data.private_messages.map(r =>
            this.messageToReplyType(r)
          )
        : [];

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
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
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
            noIndent
            markable
            showCommunity
            showContext
            enableDownvotes={enableDownvotes(this.state.siteRes)}
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
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
    if (
      this.state.repliesRes.state == "loading" ||
      this.state.mentionsRes.state == "loading" ||
      this.state.messagesRes.state == "loading"
    ) {
      return (
        <h5>
          <Spinner large />
        </h5>
      );
    } else {
      return <div>{this.buildCombined().map(this.renderReplyType)}</div>;
    }
  }

  replies() {
    switch (this.state.repliesRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success":
        const replies = this.state.repliesRes.data.replies;
        return (
          <div>
            <CommentNodes
              nodes={commentsToFlatNodes(replies)}
              viewType={CommentViewType.Flat}
              noIndent
              markable
              showCommunity
              showContext
              enableDownvotes={enableDownvotes(this.state.siteRes)}
              allLanguages={this.state.siteRes.all_languages}
              siteLanguages={this.state.siteRes.discussion_languages}
            />
          </div>
        );
    }
  }

  mentions() {
    switch (this.state.mentionsRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success":
        const mentions = this.state.mentionsRes.data.mentions;
        return (
          <div>
            {mentions.map(umv => (
              <CommentNodes
                key={umv.person_mention.id}
                nodes={[{ comment_view: umv, children: [], depth: 0 }]}
                viewType={CommentViewType.Flat}
                noIndent
                markable
                showCommunity
                showContext
                enableDownvotes={enableDownvotes(this.state.siteRes)}
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
              />
            ))}
          </div>
        );
    }
  }

  messages() {
    switch (this.state.messagesRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success":
        const messages = this.state.messagesRes.data.private_messages;
        return (
          <div>
            {messages.map(pmv => (
              <PrivateMessage
                key={pmv.private_message.id}
                private_message_view={pmv}
              />
            ))}
          </div>
        );
    }
  }

  async handlePageChange(page: number) {
    this.setState({ page });
    await this.refetch();
  }

  async handleUnreadOrAllChange(i: Inbox, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), page: 1 });
    await i.refetch();
  }

  async handleMessageTypeChange(i: Inbox, event: any) {
    i.setState({ messageType: Number(event.target.value), page: 1 });
    await i.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let sort: CommentSortType = "New";
    let auth = req.auth;

    if (auth) {
      // It can be /u/me, or /username/1
      let repliesForm: GetReplies = {
        sort: "New",
        unread_only: true,
        page: 1,
        limit: fetchLimit,
        auth,
      };
      promises.push(req.client.getReplies(repliesForm));

      let personMentionsForm: GetPersonMentions = {
        sort,
        unread_only: true,
        page: 1,
        limit: fetchLimit,
        auth,
      };
      promises.push(req.client.getPersonMentions(personMentionsForm));

      let privateMessagesForm: GetPrivateMessages = {
        unread_only: true,
        page: 1,
        limit: fetchLimit,
        auth,
      };
      promises.push(req.client.getPrivateMessages(privateMessagesForm));
    }

    return promises;
  }

  async refetch() {
    let sort = this.state.sort;
    let unread_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    let page = this.state.page;
    let limit = fetchLimit;
    let auth = myAuthRequired();

    this.setState({ repliesRes: { state: "loading" } });
    this.setState({
      repliesRes: apiWrapper(
        await HttpService.client.getReplies({
          sort,
          unread_only,
          page,
          limit,
          auth,
        })
      ),
    });

    this.setState({ mentionsRes: { state: "loading" } });
    this.setState({
      mentionsRes: apiWrapper(
        await HttpService.client.getPersonMentions({
          sort,
          unread_only,
          page,
          limit,
          auth,
        })
      ),
    });

    this.setState({ messagesRes: { state: "loading" } });
    this.setState({
      messagesRes: apiWrapper(
        await HttpService.client.getPrivateMessages({
          unread_only,
          page,
          limit,
          auth,
        })
      ),
    });
  }

  async handleSortChange(val: CommentSortType) {
    this.setState({ sort: val, page: 1 });
    await this.refetch();
  }

  async markAllAsRead(i: Inbox) {
    WebSocketService.Instance.send(
      wsClient.markAllAsRead({
        auth,
      })
    );
    const res = apiWrapper(
      await HttpService.client.markAllAsRead({ auth: myAuthRequired() })
    );

    if (res.state == "success") {
      i.setState({
        repliesRes: { state: "empty" },
        mentionsRes: { state: "empty" },
        messagesRes: { state: "empty" },
      });
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
    } else if (op == UserOperation.EditPrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg);
      let found = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );
      if (found) {
        let combinedView = this.state.combined.find(
          i => i.id == data.private_message_view.private_message.id
        )?.view as PrivateMessageView | undefined;
        if (combinedView) {
          found.private_message.content = combinedView.private_message.content =
            data.private_message_view.private_message.content;
          found.private_message.updated = combinedView.private_message.updated =
            data.private_message_view.private_message.updated;
        }
      }
      this.setState(this.state);
    } else if (op == UserOperation.DeletePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg);
      let found = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );
      if (found) {
        let combinedView = this.state.combined.find(
          i => i.id == data.private_message_view.private_message.id
        )?.view as PrivateMessageView | undefined;
        if (combinedView) {
          found.private_message.deleted = combinedView.private_message.deleted =
            data.private_message_view.private_message.deleted;
          found.private_message.updated = combinedView.private_message.updated =
            data.private_message_view.private_message.updated;
        }
      }
      this.setState(this.state);
    } else if (op == UserOperation.MarkPrivateMessageAsRead) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg);
      let found = this.state.messages.find(
        m =>
          m.private_message.id === data.private_message_view.private_message.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i =>
            i.id == data.private_message_view.private_message.id &&
            i.type_ == ReplyEnum.Message
        )?.view as PrivateMessageView | undefined;
        if (combinedView) {
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
      let data = wsJsonToRes<CommentResponse>(msg);
      editComments(data.comment_view, this.state.replies);
      this.setState(this.state);
    } else if (op == UserOperation.MarkCommentReplyAsRead) {
      let data = wsJsonToRes<CommentReplyResponse>(msg);

      let found = this.state.replies.find(
        c => c.comment_reply.id == data.comment_reply_view.comment_reply.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i =>
            i.id == data.comment_reply_view.comment_reply.id &&
            i.type_ == ReplyEnum.Reply
        )?.view as CommentReplyView | undefined;
        if (combinedView) {
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
                  r.comment_reply.id !==
                  data.comment_reply_view.comment_reply.id
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
      }
      this.sendUnreadCount(data.comment_reply_view.comment_reply.read);
      this.setState(this.state);
    } else if (op == UserOperation.MarkPersonMentionAsRead) {
      let data = wsJsonToRes<PersonMentionResponse>(msg);

      // TODO this might not be correct, it might need to use the comment id
      let found = this.state.mentions.find(
        c => c.person_mention.id == data.person_mention_view.person_mention.id
      );

      if (found) {
        let combinedView = this.state.combined.find(
          i =>
            i.id == data.person_mention_view.person_mention.id &&
            i.type_ == ReplyEnum.Mention
        )?.view as PersonMentionView | undefined;
        if (combinedView) {
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
      }
      this.sendUnreadCount(data.person_mention_view.person_mention.read);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg);
      let mui = UserService.Instance.myUserInfo;
      if (
        data.private_message_view.recipient.id == mui?.local_user_view.person.id
      ) {
        this.state.messages.unshift(data.private_message_view);
        this.state.combined.unshift(
          this.messageToReplyType(data.private_message_view)
        );
        this.setState(this.state);
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      saveCommentRes(data.comment_view, this.state.replies);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(data.comment_view, this.state.replies);
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg);
      updatePersonBlock(data);
    } else if (op == UserOperation.CreatePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreateCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg);
      if (data) {
        toast(i18n.t("report_created"));
      }
    } else if (op == UserOperation.CreatePrivateMessageReport) {
      let data = wsJsonToRes<PrivateMessageReportResponse>(msg);
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
