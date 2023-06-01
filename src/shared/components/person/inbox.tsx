import { Component, linkEvent } from "inferno";
import {
  AddAdmin,
  AddAdminResponse,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentReplyResponse,
  CommentReplyView,
  CommentReportResponse,
  CommentResponse,
  CommentSortType,
  CommentView,
  CommunityResponse,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePrivateMessage,
  CreatePrivateMessageReport,
  DeleteComment,
  DeletePrivateMessage,
  DistinguishComment,
  EditComment,
  EditPrivateMessage,
  GetCommentsResponse,
  GetPersonMentions,
  GetPersonMentionsResponse,
  GetPrivateMessages,
  GetReplies,
  GetRepliesResponse,
  GetSiteResponse,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  MarkPrivateMessageAsRead,
  PersonMentionResponse,
  PersonMentionView,
  PrivateMessageReportResponse,
  PrivateMessageResponse,
  PrivateMessageView,
  PrivateMessagesResponse,
  PurgeComment,
  PurgeItemResponse,
  PurgePerson,
  PurgePost,
  RemoveComment,
  SaveComment,
  TransferCommunity,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { CommentViewType, InitialFetchRequest } from "../../interfaces";
import { UserService } from "../../services";
import {
  HttpService,
  RequestState,
  apiWrapper,
  apiWrapperIso,
} from "../../services/HttpService";
import {
  commentsToFlatNodes,
  editCommentReplies,
  editCommentRepliesWithComment,
  editMentions,
  editMentionsWithComment,
  editPrivateMessages,
  enableDownvotes,
  fetchLimit,
  isBrowser,
  isInitialRoute,
  myAuth,
  myAuthRequired,
  relTags,
  setIsoData,
  toast,
  updatePersonBlock,
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
  repliesRes: RequestState<GetRepliesResponse>;
  mentionsRes: RequestState<GetPersonMentionsResponse>;
  messagesRes: RequestState<PrivateMessagesResponse>;

  // Some used for loading indicators
  banPersonRes: RequestState<BanPersonResponse>;
  banFromCommunityRes: RequestState<BanPersonResponse>;
  addModRes: RequestState<AddModToCommunityResponse>;
  addAdminRes: RequestState<AddAdminResponse>;
  transferCommunityRes: RequestState<CommunityResponse>;

  createCommentRes: RequestState<CommentResponse>;
  editCommentRes: RequestState<CommentResponse>;
  voteCommentRes: RequestState<CommentResponse>;
  saveCommentRes: RequestState<CommentResponse>;
  readCommentReplyRes: RequestState<CommentReplyResponse>;
  readPersonMentionRes: RequestState<PersonMentionResponse>;
  blockPersonRes: RequestState<BlockPersonResponse>;
  deleteCommentRes: RequestState<CommentResponse>;
  removeCommentRes: RequestState<CommentResponse>;
  distinguishCommentRes: RequestState<CommentResponse>;
  fetchChildrenRes: RequestState<GetCommentsResponse>;
  reportCommentRes: RequestState<CommentReportResponse>;
  purgeCommentRes: RequestState<PurgeItemResponse>;

  deletePrivateMessageRes: RequestState<PrivateMessageResponse>;
  editPrivateMessageRes: RequestState<PrivateMessageResponse>;
  createPrivateMessageRes: RequestState<PrivateMessageResponse>;
  readPrivateMessageRes: RequestState<PrivateMessageResponse>;
  reportPrivateMessageRes: RequestState<PrivateMessageReportResponse>;

  markAllAsReadRes: RequestState<GetRepliesResponse>;
  purgePostRes: RequestState<PurgeItemResponse>;
  purgePersonRes: RequestState<PurgeItemResponse>;

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
    createCommentRes: { state: "empty" },
    editCommentRes: { state: "empty" },
    voteCommentRes: { state: "empty" },
    saveCommentRes: { state: "empty" },
    readCommentReplyRes: { state: "empty" },
    readPersonMentionRes: { state: "empty" },
    blockPersonRes: { state: "empty" },
    deleteCommentRes: { state: "empty" },
    removeCommentRes: { state: "empty" },
    distinguishCommentRes: { state: "empty" },
    fetchChildrenRes: { state: "empty" },
    reportCommentRes: { state: "empty" },
    purgeCommentRes: { state: "empty" },
    banPersonRes: { state: "empty" },
    banFromCommunityRes: { state: "empty" },
    addModRes: { state: "empty" },
    addAdminRes: { state: "empty" },
    transferCommunityRes: { state: "empty" },
    deletePrivateMessageRes: { state: "empty" },
    editPrivateMessageRes: { state: "empty" },
    createPrivateMessageRes: { state: "empty" },
    readPrivateMessageRes: { state: "empty" },
    reportPrivateMessageRes: { state: "empty" },
    markAllAsReadRes: { state: "empty" },
    purgePostRes: { state: "empty" },
    purgePersonRes: { state: "empty" },
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleCommentVote = this.handleCommentVote.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleCommentReport = this.handleCommentReport.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleCommentReplyRead = this.handleCommentReplyRead.bind(this);
    this.handlePersonMentionRead = this.handlePersonMentionRead.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);

    this.handleDeleteMessage = this.handleDeleteMessage.bind(this);
    this.handleMarkMessageAsRead = this.handleMarkMessageAsRead.bind(this);
    this.handleMessageReport = this.handleMessageReport.bind(this);
    this.handleCreateMessage = this.handleCreateMessage.bind(this);
    this.handleEditMessage = this.handleEditMessage.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        repliesRes: apiWrapperIso(
          this.isoData.routeData[0] as GetRepliesResponse
        ),
        mentionsRes: apiWrapperIso(
          this.isoData.routeData[1] as GetPersonMentionsResponse
        ),
        messagesRes: apiWrapperIso(
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
                onClick={linkEvent(this, this.handleMarkAllAsRead)}
              >
                {this.state.markAllAsReadRes.state == "loading" ? (
                  <Spinner />
                ) : (
                  i18n.t("mark_all_as_read")
                )}
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
            onSaveComment={this.handleSaveComment}
            onBlockPerson={this.handleBlockPerson}
            onDeleteComment={this.handleDeleteComment}
            onRemoveComment={this.handleRemoveComment}
            onCommentVote={this.handleCommentVote}
            onCommentReport={this.handleCommentReport}
            onDistinguishComment={this.handleDistinguishComment}
            onAddModToCommunity={this.handleAddModToCommunity}
            onAddAdmin={this.handleAddAdmin}
            onTransferCommunity={this.handleTransferCommunity}
            onPurgeComment={this.handlePurgeComment}
            onPurgePerson={this.handlePurgePerson}
            onCommentReplyRead={this.handleCommentReplyRead}
            onPersonMentionRead={this.handlePersonMentionRead}
            onBanPersonFromCommunity={this.handleBanFromCommunity}
            onBanPerson={this.handleBanPerson}
            onCreateComment={this.handleCreateComment}
            onEditComment={this.handleEditComment}
            createOrEditCommentLoading={
              this.state.createCommentRes.state == "loading" ||
              this.state.editCommentRes.state == "loading"
            }
            upvoteLoading={this.state.voteCommentRes.state == "loading"}
            downvoteLoading={this.state.voteCommentRes.state == "loading"}
            saveLoading={this.state.saveCommentRes.state == "loading"}
            readLoading={
              this.state.readCommentReplyRes.state == "loading" ||
              this.state.readPersonMentionRes.state == "loading"
            }
            blockPersonLoading={this.state.blockPersonRes.state == "loading"}
            deleteLoading={this.state.deleteCommentRes.state == "loading"}
            removeLoading={this.state.removeCommentRes.state == "loading"}
            distinguishLoading={
              this.state.distinguishCommentRes.state == "loading"
            }
            banLoading={this.state.banPersonRes.state == "loading"}
            addModLoading={this.state.addModRes.state == "loading"}
            addAdminLoading={this.state.addAdminRes.state == "loading"}
            transferCommunityLoading={
              this.state.transferCommunityRes.state == "loading"
            }
            fetchChildrenLoading={
              this.state.fetchChildrenRes.state == "loading"
            }
            reportLoading={this.state.reportCommentRes.state == "loading"}
            purgeLoading={this.state.purgeCommentRes.state == "loading"}
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
            onSaveComment={this.handleSaveComment}
            onBlockPerson={this.handleBlockPerson}
            onDeleteComment={this.handleDeleteComment}
            onRemoveComment={this.handleRemoveComment}
            onCommentVote={this.handleCommentVote}
            onCommentReport={this.handleCommentReport}
            onDistinguishComment={this.handleDistinguishComment}
            onAddModToCommunity={this.handleAddModToCommunity}
            onAddAdmin={this.handleAddAdmin}
            onTransferCommunity={this.handleTransferCommunity}
            onPurgeComment={this.handlePurgeComment}
            onPurgePerson={this.handlePurgePerson}
            onCommentReplyRead={this.handleCommentReplyRead}
            onPersonMentionRead={this.handlePersonMentionRead}
            onBanPersonFromCommunity={this.handleBanFromCommunity}
            onBanPerson={this.handleBanPerson}
            onCreateComment={this.handleCreateComment}
            onEditComment={this.handleEditComment}
            createOrEditCommentLoading={
              this.state.createCommentRes.state == "loading" ||
              this.state.editCommentRes.state == "loading"
            }
            upvoteLoading={this.state.voteCommentRes.state == "loading"}
            downvoteLoading={this.state.voteCommentRes.state == "loading"}
            saveLoading={this.state.saveCommentRes.state == "loading"}
            readLoading={
              this.state.readCommentReplyRes.state == "loading" ||
              this.state.readPersonMentionRes.state == "loading"
            }
            blockPersonLoading={this.state.blockPersonRes.state == "loading"}
            deleteLoading={this.state.deleteCommentRes.state == "loading"}
            removeLoading={this.state.removeCommentRes.state == "loading"}
            distinguishLoading={
              this.state.distinguishCommentRes.state == "loading"
            }
            banLoading={this.state.banPersonRes.state == "loading"}
            addModLoading={this.state.addModRes.state == "loading"}
            addAdminLoading={this.state.addAdminRes.state == "loading"}
            transferCommunityLoading={
              this.state.transferCommunityRes.state == "loading"
            }
            fetchChildrenLoading={
              this.state.fetchChildrenRes.state == "loading"
            }
            reportLoading={this.state.reportCommentRes.state == "loading"}
            purgeLoading={this.state.purgeCommentRes.state == "loading"}
          />
        );
      case ReplyEnum.Message:
        return (
          <PrivateMessage
            key={i.id}
            private_message_view={i.view as PrivateMessageView}
            onDelete={this.handleDeleteMessage}
            onMarkRead={this.handleMarkMessageAsRead}
            onReport={this.handleMessageReport}
            onCreate={this.handleCreateMessage}
            onEdit={this.handleEditMessage}
            deleteLoading={
              this.state.deletePrivateMessageRes.state == "loading"
            }
            createOrEditLoading={
              this.state.editPrivateMessageRes.state == "loading" ||
              this.state.createPrivateMessageRes.state == "loading"
            }
            readLoading={this.state.readPrivateMessageRes.state == "loading"}
            reportLoading={
              this.state.reportPrivateMessageRes.state == "loading"
            }
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
      case "success": {
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
              onSaveComment={this.handleSaveComment}
              onBlockPerson={this.handleBlockPerson}
              onDeleteComment={this.handleDeleteComment}
              onRemoveComment={this.handleRemoveComment}
              onCommentVote={this.handleCommentVote}
              onCommentReport={this.handleCommentReport}
              onDistinguishComment={this.handleDistinguishComment}
              onAddModToCommunity={this.handleAddModToCommunity}
              onAddAdmin={this.handleAddAdmin}
              onTransferCommunity={this.handleTransferCommunity}
              onPurgeComment={this.handlePurgeComment}
              onPurgePerson={this.handlePurgePerson}
              onCommentReplyRead={this.handleCommentReplyRead}
              onPersonMentionRead={this.handlePersonMentionRead}
              onBanPersonFromCommunity={this.handleBanFromCommunity}
              onBanPerson={this.handleBanPerson}
              onCreateComment={this.handleCreateComment}
              onEditComment={this.handleEditComment}
              createOrEditCommentLoading={
                this.state.createCommentRes.state == "loading" ||
                this.state.editCommentRes.state == "loading"
              }
              upvoteLoading={this.state.voteCommentRes.state == "loading"}
              downvoteLoading={this.state.voteCommentRes.state == "loading"}
              saveLoading={this.state.saveCommentRes.state == "loading"}
              readLoading={
                this.state.readCommentReplyRes.state == "loading" ||
                this.state.readPersonMentionRes.state == "loading"
              }
              blockPersonLoading={this.state.blockPersonRes.state == "loading"}
              deleteLoading={this.state.deleteCommentRes.state == "loading"}
              removeLoading={this.state.removeCommentRes.state == "loading"}
              distinguishLoading={
                this.state.distinguishCommentRes.state == "loading"
              }
              banLoading={this.state.banPersonRes.state == "loading"}
              addModLoading={this.state.addModRes.state == "loading"}
              addAdminLoading={this.state.addAdminRes.state == "loading"}
              transferCommunityLoading={
                this.state.transferCommunityRes.state == "loading"
              }
              fetchChildrenLoading={
                this.state.fetchChildrenRes.state == "loading"
              }
              reportLoading={this.state.reportCommentRes.state == "loading"}
              purgeLoading={this.state.purgeCommentRes.state == "loading"}
            />
          </div>
        );
      }
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
      case "success": {
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
                onSaveComment={this.handleSaveComment}
                onBlockPerson={this.handleBlockPerson}
                onDeleteComment={this.handleDeleteComment}
                onRemoveComment={this.handleRemoveComment}
                onCommentVote={this.handleCommentVote}
                onCommentReport={this.handleCommentReport}
                onDistinguishComment={this.handleDistinguishComment}
                onAddModToCommunity={this.handleAddModToCommunity}
                onAddAdmin={this.handleAddAdmin}
                onTransferCommunity={this.handleTransferCommunity}
                onPurgeComment={this.handlePurgeComment}
                onPurgePerson={this.handlePurgePerson}
                onCommentReplyRead={this.handleCommentReplyRead}
                onPersonMentionRead={this.handlePersonMentionRead}
                onBanPersonFromCommunity={this.handleBanFromCommunity}
                onBanPerson={this.handleBanPerson}
                onCreateComment={this.handleCreateComment}
                onEditComment={this.handleEditComment}
                createOrEditCommentLoading={
                  this.state.createCommentRes.state == "loading" ||
                  this.state.editCommentRes.state == "loading"
                }
                upvoteLoading={this.state.voteCommentRes.state == "loading"}
                downvoteLoading={this.state.voteCommentRes.state == "loading"}
                saveLoading={this.state.saveCommentRes.state == "loading"}
                readLoading={
                  this.state.readCommentReplyRes.state == "loading" ||
                  this.state.readPersonMentionRes.state == "loading"
                }
                blockPersonLoading={
                  this.state.blockPersonRes.state == "loading"
                }
                deleteLoading={this.state.deleteCommentRes.state == "loading"}
                removeLoading={this.state.removeCommentRes.state == "loading"}
                distinguishLoading={
                  this.state.distinguishCommentRes.state == "loading"
                }
                banLoading={this.state.banPersonRes.state == "loading"}
                addModLoading={this.state.addModRes.state == "loading"}
                addAdminLoading={this.state.addAdminRes.state == "loading"}
                transferCommunityLoading={
                  this.state.transferCommunityRes.state == "loading"
                }
                fetchChildrenLoading={
                  this.state.fetchChildrenRes.state == "loading"
                }
                reportLoading={this.state.reportCommentRes.state == "loading"}
                purgeLoading={this.state.purgeCommentRes.state == "loading"}
              />
            ))}
          </div>
        );
      }
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
      case "success": {
        const messages = this.state.messagesRes.data.private_messages;
        return (
          <div>
            {messages.map(pmv => (
              <PrivateMessage
                key={pmv.private_message.id}
                private_message_view={pmv}
                onDelete={this.handleDeleteMessage}
                onMarkRead={this.handleMarkMessageAsRead}
                onReport={this.handleMessageReport}
                onCreate={this.handleCreateMessage}
                onEdit={this.handleEditMessage}
                deleteLoading={
                  this.state.deletePrivateMessageRes.state == "loading"
                }
                createOrEditLoading={
                  this.state.editPrivateMessageRes.state == "loading" ||
                  this.state.createPrivateMessageRes.state == "loading"
                }
                readLoading={
                  this.state.readPrivateMessageRes.state == "loading"
                }
                reportLoading={
                  this.state.reportPrivateMessageRes.state == "loading"
                }
              />
            ))}
          </div>
        );
      }
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
      repliesRes: await apiWrapper(
        HttpService.client.getReplies({
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
      mentionsRes: await apiWrapper(
        HttpService.client.getPersonMentions({
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
      messagesRes: await apiWrapper(
        HttpService.client.getPrivateMessages({
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

  async handleMarkAllAsRead(i: Inbox) {
    i.setState({ markAllAsReadRes: { state: "loading" } });
    const markAllAsReadRes = await apiWrapper(
      HttpService.client.markAllAsRead({ auth: myAuthRequired() })
    );
    i.setState({ markAllAsReadRes });

    if (markAllAsReadRes.state == "success") {
      i.setState({
        repliesRes: { state: "empty" },
        mentionsRes: { state: "empty" },
        messagesRes: { state: "empty" },
      });
    }
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    this.setState({ addModRes: { state: "loading" } });
    this.setState({
      addModRes: await apiWrapper(HttpService.client.addModToCommunity(form)),
    });
  }

  async handlePurgePerson(form: PurgePerson) {
    this.setState({ purgePersonRes: { state: "loading" } });
    this.setState({
      purgePersonRes: await apiWrapper(HttpService.client.purgePerson(form)),
    });
    this.purgeItem(this.state.purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    this.setState({ purgeCommentRes: { state: "loading" } });
    this.setState({
      purgeCommentRes: await apiWrapper(HttpService.client.purgeComment(form)),
    });
    this.purgeItem(this.state.purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    this.setState({ purgePostRes: { state: "loading" } });
    this.setState({
      purgePostRes: await apiWrapper(HttpService.client.purgePost(form)),
    });
    this.purgeItem(this.state.purgePostRes);
  }

  async handleBlockPerson(form: BlockPerson) {
    this.setState({ blockPersonRes: { state: "loading" } });
    const blockPersonRes = await apiWrapper(
      HttpService.client.blockPerson(form)
    );
    this.setState({ blockPersonRes });

    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleCreateComment(form: CreateComment) {
    this.setState({ createCommentRes: { state: "loading" } });

    const createCommentRes = await apiWrapper(
      HttpService.client.createComment(form)
    );
    this.setState({ createCommentRes });

    if (createCommentRes.state == "success") {
      toast(i18n.t("created"));
    }
  }

  async handleEditComment(form: EditComment) {
    this.setState({ editCommentRes: { state: "loading" } });
    const editCommentRes = await apiWrapper(
      HttpService.client.editComment(form)
    );
    this.setState({ editCommentRes });

    this.findAndUpdateComment(editCommentRes);
  }

  async handleDeleteComment(form: DeleteComment) {
    this.setState({ deleteCommentRes: { state: "loading" } });
    const deleteCommentRes = await apiWrapper(
      HttpService.client.deleteComment(form)
    );
    this.setState({ deleteCommentRes });

    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    this.setState({ removeCommentRes: { state: "loading" } });
    const removeCommentRes = await apiWrapper(
      HttpService.client.removeComment(form)
    );
    this.setState({ removeCommentRes });

    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    this.setState({ saveCommentRes: { state: "loading" } });
    const saveCommentRes = await apiWrapper(
      HttpService.client.saveComment(form)
    );
    this.setState({ saveCommentRes });
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    this.setState({ voteCommentRes: { state: "loading" } });
    const voteCommentRes = await apiWrapper(
      HttpService.client.likeComment(form)
    );
    this.setState({ voteCommentRes });
    this.findAndUpdateComment(voteCommentRes);
  }

  async handleCommentReport(form: CreateCommentReport) {
    this.setState({ reportCommentRes: { state: "loading" } });
    const reportCommentRes = await apiWrapper(
      HttpService.client.createCommentReport(form)
    );
    this.setState({ reportCommentRes });
    if (reportCommentRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handleDistinguishComment(form: DistinguishComment) {
    this.setState({ distinguishCommentRes: { state: "loading" } });
    const distinguishCommentRes = await apiWrapper(
      HttpService.client.distinguishComment(form)
    );
    this.setState({ distinguishCommentRes });
    this.findAndUpdateComment(distinguishCommentRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    this.setState({ addAdminRes: { state: "loading" } });
    const addAdminRes = await apiWrapper(HttpService.client.addAdmin(form));
    this.setState({ addAdminRes });

    if (addAdminRes.state == "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    this.setState({ transferCommunityRes: { state: "loading" } });
    const transferCommunityRes = await apiWrapper(
      HttpService.client.transferCommunity(form)
    );
    this.setState({ transferCommunityRes });
    toast(i18n.t("transfer_community"));
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    this.setState({ readCommentReplyRes: { state: "loading" } });
    const readCommentReplyRes = await apiWrapper(
      HttpService.client.markCommentReplyAsRead(form)
    );
    this.setState({ readCommentReplyRes });
    this.findAndUpdateCommentReply(readCommentReplyRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    this.setState({ readPersonMentionRes: { state: "loading" } });
    const readPersonMentionRes = await apiWrapper(
      HttpService.client.markPersonMentionAsRead(form)
    );
    this.setState({ readPersonMentionRes });
    this.findAndUpdateMention(readPersonMentionRes);
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    this.setState({ banFromCommunityRes: { state: "loading" } });
    const banFromCommunityRes = await apiWrapper(
      HttpService.client.banFromCommunity(form)
    );
    this.setState({ banFromCommunityRes });
    this.updateBanFromCommunity(banFromCommunityRes);
  }

  async handleBanPerson(form: BanPerson) {
    this.setState({ banPersonRes: { state: "loading" } });
    const banPersonRes = await apiWrapper(HttpService.client.banPerson(form));
    this.setState({ banPersonRes });
    this.updateBan(banPersonRes);
  }

  async handleDeleteMessage(form: DeletePrivateMessage) {
    this.setState({ deletePrivateMessageRes: { state: "loading" } });
    const deletePrivateMessageRes = await apiWrapper(
      HttpService.client.deletePrivateMessage(form)
    );
    this.setState({ deletePrivateMessageRes });
    this.findAndUpdateMessage(deletePrivateMessageRes);
  }

  async handleEditMessage(form: EditPrivateMessage) {
    this.setState({ editPrivateMessageRes: { state: "loading" } });
    const editPrivateMessageRes = await apiWrapper(
      HttpService.client.editPrivateMessage(form)
    );
    this.setState({ editPrivateMessageRes });
    this.findAndUpdateMessage(editPrivateMessageRes);
  }

  async handleMarkMessageAsRead(form: MarkPrivateMessageAsRead) {
    this.setState({ readPrivateMessageRes: { state: "loading" } });
    const readPrivateMessageRes = await apiWrapper(
      HttpService.client.markPrivateMessageAsRead(form)
    );
    this.setState({ readPrivateMessageRes });
    this.findAndUpdateMessage(readPrivateMessageRes);
  }

  async handleMessageReport(form: CreatePrivateMessageReport) {
    this.setState({ reportPrivateMessageRes: { state: "loading" } });
    const reportPrivateMessageRes = await apiWrapper(
      HttpService.client.createPrivateMessageReport(form)
    );
    this.setState({ reportPrivateMessageRes });
    this.reportToast(reportPrivateMessageRes);
  }

  async handleCreateMessage(form: CreatePrivateMessage) {
    this.setState({ createPrivateMessageRes: { state: "loading" } });
    const createPrivateMessageRes = await apiWrapper(
      HttpService.client.createPrivateMessage(form)
    );
    this.setState({ createPrivateMessageRes });
    this.setState(s => {
      if (
        s.messagesRes.state == "success" &&
        createPrivateMessageRes.state == "success"
      ) {
        s.messagesRes.data.private_messages.unshift(
          createPrivateMessageRes.data.private_message_view
        );
      }

      return s;
    });
  }

  findAndUpdateMessage(res: RequestState<PrivateMessageResponse>) {
    this.setState(s => {
      if (s.messagesRes.state == "success" && res.state == "success") {
        s.messagesRes.data.private_messages = editPrivateMessages(
          res.data.private_message_view,
          s.messagesRes.data.private_messages
        );
      }
      return s;
    });
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.repliesRes.state == "success") {
          s.repliesRes.data.replies
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
        }
        if (s.mentionsRes.state == "success") {
          s.mentionsRes.data.mentions
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.repliesRes.state == "success") {
          s.repliesRes.data.replies
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        if (s.mentionsRes.state == "success") {
          s.mentionsRes.data.mentions
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        return s;
      });
    }
  }

  purgeItem(purgeRes: RequestState<PurgeItemResponse>) {
    if (purgeRes.state == "success") {
      toast(i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  reportToast(
    res: RequestState<PrivateMessageReportResponse | CommentReportResponse>
  ) {
    if (res.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  // A weird case, since you have only replies and mentions, not comment responses
  findAndUpdateComment(res: RequestState<CommentResponse>) {
    if (res.state == "success") {
      this.setState(s => {
        if (s.repliesRes.state == "success") {
          s.repliesRes.data.replies = editCommentRepliesWithComment(
            res.data.comment_view,
            s.repliesRes.data.replies
          );
        }
        if (s.mentionsRes.state == "success") {
          s.mentionsRes.data.mentions = editMentionsWithComment(
            res.data.comment_view,
            s.mentionsRes.data.mentions
          );
        }
        return s;
      });
    }
  }

  findAndUpdateCommentReply(res: RequestState<CommentReplyResponse>) {
    this.setState(s => {
      if (s.repliesRes.state == "success" && res.state == "success") {
        s.repliesRes.data.replies = editCommentReplies(
          res.data.comment_reply_view,
          s.repliesRes.data.replies
        );
      }
      return s;
    });
  }

  findAndUpdateMention(res: RequestState<PersonMentionResponse>) {
    this.setState(s => {
      if (s.mentionsRes.state == "success" && res.state == "success") {
        s.mentionsRes.data.mentions = editMentions(
          res.data.person_mention_view,
          s.mentionsRes.data.mentions
        );
      }
      return s;
    });
  }
}
