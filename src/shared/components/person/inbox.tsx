import {
  commentsToFlatNodes,
  editCombined,
  getUncombinedInbox,
  myAuth,
  setIsoData,
  updatePersonBlock,
} from "@utils/app";
import {
  capitalizeFirstLetter,
  cursorComponents,
  randomStr,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { DirectionalCursor, RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, InfernoNode, linkEvent } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  CommentReplyView,
  CommentReportResponse,
  CommentResponse,
  CommentSortType,
  CommentView,
  CommunityId,
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
  GetSiteResponse,
  InboxCombinedView,
  InboxDataType,
  LemmyHttp,
  ListInboxResponse,
  MarkCommentReplyAsRead,
  MarkPersonCommentMentionAsRead,
  MarkPostAsRead,
  MarkPrivateMessageAsRead,
  PersonCommentMentionView,
  PrivateMessageReportResponse,
  PrivateMessageResponse,
  PrivateMessageView,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  SaveComment,
  SuccessResponse,
  TransferCommunity,
} from "lemmy-js-client";
import { relTags } from "@utils/config";
import { CommentViewType, InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
import { UnreadCounterService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { CommentNodes } from "../comment/comment-nodes";
import { CommentSortSelect } from "../common/sort-select";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { PrivateMessage } from "../private_message/private-message";
import { getHttpBaseInternal } from "../../utils/env";
import { CommentsLoadingSkeleton } from "../common/loading-skeleton";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "../common/paginator-cursor";
import { PostMention } from "../post/post-mention";
import { NoOptionI18nKeys } from "i18next";

enum UnreadOrAll {
  Unread,
  All,
}

enum ReplyEnum {
  Reply,
  Mention,
  Message,
}

type InboxData = RouteDataResponse<{
  inboxRes: ListInboxResponse;
}>;

type ReplyType = {
  id: number;
  type_: ReplyEnum;
  view:
    | CommentView
    | PrivateMessageView
    | PersonCommentMentionView
    | CommentReplyView;
  published_at: string;
};

interface InboxState {
  unreadOrAll: UnreadOrAll;
  messageType: InboxDataType;
  inboxRes: RequestState<ListInboxResponse>;
  markAllAsReadRes: RequestState<SuccessResponse>;
  sort: CommentSortType;
  page?: DirectionalCursor;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

type InboxRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type InboxFetchConfig = IRoutePropsWithFetch<
  InboxData,
  Record<string, never>,
  Record<string, never>
>;

function setRead(item: InboxCombinedView, read: boolean) {
  switch (item.type_) {
    case "CommentReply":
      item.comment_reply.read = read;
      break;
    case "CommentMention":
      item.person_comment_mention.read = read;
      break;
    case "PostMention":
      item.person_post_mention.read = read;
      break;
    case "PrivateMessage":
      item.private_message.read = read;
      break;
  }
}

@scrollMixin
export class Inbox extends Component<InboxRouteProps, InboxState> {
  private isoData = setIsoData<InboxData>(this.context);
  state: InboxState = {
    unreadOrAll: UnreadOrAll.Unread,
    messageType: "All",
    sort: "New",
    siteRes: this.isoData.siteRes,
    inboxRes: EMPTY_REQUEST,
    markAllAsReadRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.inboxRes]);
  }

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
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { inboxRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        inboxRes,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.refetch();
    }
  }

  get documentTitle(): string {
    const mui = this.isoData.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${I18NextService.i18n.t(
          "inbox",
        )} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  get hasUnreads(): boolean {
    if (this.state.unreadOrAll === UnreadOrAll.Unread) {
      const { inboxRes } = this.state;
      return inboxRes.state === "success" && inboxRes.data.inbox.length > 0;
    } else {
      return false;
    }
  }

  render() {
    const auth = myAuth();
    const inboxRss = auth ? `/feeds/inbox/${auth}.xml` : undefined;
    return (
      <div className="inbox container-lg">
        <div className="row">
          <div className="col-12">
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("inbox")}
              {inboxRss && (
                <small>
                  <a href={inboxRss} title="RSS" rel={relTags}>
                    <Icon icon="rss" classes="ms-2 text-muted small" />
                  </a>
                  <link
                    rel="alternate"
                    type="application/atom+xml"
                    href={inboxRss}
                  />
                </small>
              )}
            </h1>
            {this.hasUnreads && (
              <button
                className="btn btn-secondary mb-2 mb-sm-3"
                onClick={linkEvent(this, this.handleMarkAllAsRead)}
              >
                {this.state.markAllAsReadRes.state === "loading" ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(
                    I18NextService.i18n.t("mark_all_as_read"),
                  )
                )}
              </button>
            )}
            {this.selects()}
            {this.section}
            <PaginatorCursor
              resource={this.state.inboxRes}
              onPageChange={this.handlePageChange}
            />
          </div>
        </div>
      </div>
    );
  }

  get section(): InfernoNode {
    switch (this.state.messageType) {
      case "All":
        return this.all();
      case "CommentReply":
        return this.replies();
      case "CommentMention":
        return this.commentMentions();
      case "PostMention":
        return this.postMentions();
      case "PrivateMessage":
        return this.messages();
    }
  }

  unreadOrAllRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap" role="group">
        <input
          id={`${radioId}-unread`}
          type="radio"
          className="btn-check"
          value={UnreadOrAll.Unread}
          checked={this.state.unreadOrAll === UnreadOrAll.Unread}
          onChange={linkEvent(this, this.handleUnreadOrAllChange)}
        />
        <label
          htmlFor={`${radioId}-unread`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.unreadOrAll === UnreadOrAll.Unread,
          })}
        >
          {I18NextService.i18n.t("unread")}
        </label>

        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={UnreadOrAll.All}
          checked={this.state.unreadOrAll === UnreadOrAll.All}
          onChange={linkEvent(this, this.handleUnreadOrAllChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.unreadOrAll === UnreadOrAll.All,
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>
      </div>
    );
  }

  messageTypeRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap" role="group">
        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={"All"}
          checked={this.state.messageType === "All"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "All",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>

        <input
          id={`${radioId}-replies`}
          type="radio"
          className="btn-check"
          value={"CommentReply"}
          checked={this.state.messageType === "CommentReply"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-replies`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "CommentReply",
          })}
        >
          {I18NextService.i18n.t("replies")}
        </label>

        <input
          id={`${radioId}-comment-mentions`}
          type="radio"
          className="btn-check"
          value={"CommentMention"}
          checked={this.state.messageType === "CommentMention"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-comment-mentions`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "CommentMention",
          })}
        >
          {I18NextService.i18n.t("comments")}
        </label>

        <input
          id={`${radioId}-post-mentions`}
          type="radio"
          className="btn-check"
          value={"PostMention"}
          checked={this.state.messageType === "PostMention"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-post-mentions`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "PostMention",
          })}
        >
          {I18NextService.i18n.t("posts")}
        </label>

        <input
          id={`${radioId}-messages`}
          type="radio"
          className="btn-check"
          value={"PrivateMessage"}
          checked={this.state.messageType === "PrivateMessage"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-messages`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "PrivateMessage",
          })}
        >
          {I18NextService.i18n.t("messages")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="row row-cols-auto g-2 g-sm-3 mb-2 mb-sm-3">
        <div className="col">{this.unreadOrAllRadios()}</div>
        <div className="col">{this.messageTypeRadios()}</div>
        <div className="col">
          <CommentSortSelect
            current={this.state.sort}
            onChange={this.handleSortChange}
          />
        </div>
      </div>
    );
  }

  replyToReplyType(r: CommentReplyView): ReplyType {
    return {
      id: r.comment_reply.id,
      type_: ReplyEnum.Reply,
      view: r,
      published_at: r.comment.published_at,
    };
  }

  mentionToReplyType(r: PersonCommentMentionView): ReplyType {
    return {
      id: r.person_comment_mention.id,
      type_: ReplyEnum.Mention,
      view: r,
      published_at: r.comment.published_at,
    };
  }

  messageToReplyType(r: PrivateMessageView): ReplyType {
    return {
      id: r.private_message.id,
      type_: ReplyEnum.Message,
      view: r,
      published_at: r.private_message.published_at,
    };
  }

  renderReplyType(i: InboxCombinedView) {
    const siteRes = this.state.siteRes;
    switch (i.type_) {
      case "CommentReply":
        return (
          <CommentNodes
            key={i.type_ + i.comment_reply.id}
            nodes={[{ comment_view: i, children: [], depth: 0 }]}
            viewType={CommentViewType.Flat}
            markable
            showCommunity
            showContext
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
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
          />
        );
      case "CommentMention":
        return (
          <CommentNodes
            key={i.type_ + i.person_comment_mention.id}
            nodes={[
              {
                comment_view: i,
                children: [],
                depth: 0,
              },
            ]}
            viewType={CommentViewType.Flat}
            markable
            showCommunity
            showContext
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
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
          />
        );
      case "PrivateMessage":
        return (
          <PrivateMessage
            key={i.type_ + i.private_message.id}
            private_message_view={i}
            myUserInfo={this.isoData.myUserInfo}
            onDelete={this.handleDeleteMessage}
            onMarkRead={this.handleMarkMessageAsRead}
            onReport={this.handleMessageReport}
            onCreate={this.handleCreateMessage}
            onEdit={this.handleEditMessage}
          />
        );
      case "PostMention":
        return (
          this.isoData.myUserInfo && (
            <PostMention
              key={i.type_ + i.person_post_mention.id}
              mention={i}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              myUserInfo={this.isoData.myUserInfo}
              localSite={this.isoData.siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              onMarkPostMentionAsRead={this.handleMarkPostAsRead}
            />
          )
        );
    }
  }

  all(): InfernoNode {
    const { inboxRes } = this.state;
    if (inboxRes.state === "loading") {
      return <CommentsLoadingSkeleton />;
    } else {
      return (
        <div>
          {inboxRes.state === "success" &&
            inboxRes.data.inbox.map((r: InboxCombinedView) =>
              this.renderReplyType(r),
            )}
        </div>
      );
    }
  }

  replies() {
    const siteRes = this.state.siteRes;
    switch (this.state.inboxRes.state) {
      case "loading":
        return <CommentsLoadingSkeleton />;
      case "success": {
        const replies = this.state.inboxRes.data.inbox.filter(
          i => i.type_ === "CommentReply",
        );
        return (
          <div>
            <CommentNodes
              nodes={commentsToFlatNodes(replies)}
              viewType={CommentViewType.Flat}
              markable
              showCommunity
              showContext
              allLanguages={siteRes.all_languages}
              siteLanguages={siteRes.discussion_languages}
              myUserInfo={this.isoData.myUserInfo}
              localSite={siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
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
            />
          </div>
        );
      }
    }
  }

  commentMentions() {
    const siteRes = this.state.siteRes;
    switch (this.state.inboxRes.state) {
      case "loading":
        return <CommentsLoadingSkeleton />;
      case "success": {
        const mentions = this.state.inboxRes.data.inbox.filter(
          i => i.type_ === "CommentMention",
        );
        return (
          <div>
            {mentions.map(umv => (
              <CommentNodes
                key={umv.person_comment_mention.id}
                nodes={[{ comment_view: umv, children: [], depth: 0 }]}
                viewType={CommentViewType.Flat}
                markable
                showCommunity
                showContext
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
                myUserInfo={this.isoData.myUserInfo}
                localSite={siteRes.site_view.local_site}
                admins={this.isoData.siteRes.admins}
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
              />
            ))}
          </div>
        );
      }
    }
  }

  postMentions() {
    switch (this.state.inboxRes.state) {
      case "loading":
        return <CommentsLoadingSkeleton />;
      case "success": {
        const mentions = this.state.inboxRes.data.inbox.filter(
          i => i.type_ === "PostMention",
        );
        return (
          <div>
            {mentions.map(
              umv =>
                this.isoData.myUserInfo && (
                  <PostMention
                    mention={umv}
                    showAdultConsentModal={this.isoData.showAdultConsentModal}
                    myUserInfo={this.isoData.myUserInfo}
                    localSite={this.isoData.siteRes.site_view.local_site}
                    admins={this.isoData.siteRes.admins}
                    onMarkPostMentionAsRead={this.handleMarkPostAsRead}
                  />
                ),
            )}
          </div>
        );
      }
    }
  }

  messages() {
    switch (this.state.inboxRes.state) {
      case "loading":
        return <CommentsLoadingSkeleton />;
      case "success": {
        const messages = this.state.inboxRes.data.inbox.filter(
          i => i.type_ === "PrivateMessage",
        );
        return (
          <div>
            {messages.map(pmv => (
              <PrivateMessage
                key={pmv.private_message.id}
                private_message_view={pmv}
                myUserInfo={this.isoData.myUserInfo}
                onDelete={this.handleDeleteMessage}
                onMarkRead={this.handleMarkMessageAsRead}
                onReport={this.handleMessageReport}
                onCreate={this.handleCreateMessage}
                onEdit={this.handleEditMessage}
              />
            ))}
          </div>
        );
      }
    }
  }

  async handlePageChange(page: DirectionalCursor) {
    this.setState({ page });
    await this.refetch();
  }

  async handleUnreadOrAllChange(i: Inbox, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), page: undefined });
    await i.refetch();
  }

  async handleMessageTypeChange(i: Inbox, event: any) {
    i.setState({
      messageType: event.target.value as InboxDataType,
      page: undefined,
    });
    await i.refetch();
  }

  static async fetchInitialData({
    headers,
    myUserInfo,
  }: InitialFetchRequest): Promise<InboxData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    if (myUserInfo) {
      return {
        inboxRes: await client.listInbox({
          type_: "All",
          unread_only: true,
        }),
      };
    }

    return { inboxRes: EMPTY_REQUEST };
  }

  refetchToken?: symbol;
  async refetch() {
    const token = (this.refetchToken = Symbol());
    const unread_only = this.state.unreadOrAll === UnreadOrAll.Unread;
    const page = this.state.page;

    this.setState({
      inboxRes: LOADING_REQUEST,
    });
    await HttpService.client
      .listInbox({
        type_: this.state.messageType,
        unread_only,
        ...cursorComponents(page),
      })
      .then(inboxRes => {
        if (token === this.refetchToken) {
          this.setState({
            inboxRes,
          });
        }
      });
    UnreadCounterService.Instance.updateInboxCounts();
  }

  async handleSortChange(val: CommentSortType) {
    this.setState({ sort: val, page: undefined });
    await this.refetch();
  }

  async handleMarkAllAsRead(i: Inbox) {
    i.setState({ markAllAsReadRes: LOADING_REQUEST });

    const markAllAsReadRes =
      await HttpService.client.markAllNotificationsAsRead();

    if (markAllAsReadRes.state === "success") {
      this.setState(s => {
        if (s.inboxRes.state === "success") {
          s.inboxRes.data.inbox = s.inboxRes.data.inbox.map(e => {
            const a = { ...e };
            setRead(a, true);
            return a;
          });
        }
        return { inboxRes: s.inboxRes, markAllAsReadRes };
      });
    } else {
      i.setState({ markAllAsReadRes });
    }
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    // TODO not sure what to do here
    HttpService.client.addModToCommunity(form);
  }

  async handlePurgePerson(form: PurgePerson) {
    const purgePersonRes = await HttpService.client.purgePerson(form);
    this.purgeItem(purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    const purgeCommentRes = await HttpService.client.purgeComment(form);
    this.purgeItem(purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    const purgeRes = await HttpService.client.purgePost(form);
    this.purgeItem(purgeRes);
  }

  async handleBlockPerson(form: BlockPerson) {
    const blockPersonRes = await HttpService.client.blockPerson(form);
    if (blockPersonRes.state === "success") {
      updatePersonBlock(blockPersonRes.data, this.isoData.myUserInfo);
    }
  }

  async handleCreateComment(form: CreateComment) {
    const res = await HttpService.client.createComment(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("reply_sent"));
      // The reply just disappears. Only replies to private messages appear in the inbox.
    }

    return res;
  }

  async handleEditComment(form: EditComment) {
    const res = await HttpService.client.editComment(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("edit"));
      this.findAndUpdateComment(res);
    } else if (res.state === "failed") {
      toast(res.err.message, "danger");
    }

    return res;
  }

  async handleDeleteComment(form: DeleteComment) {
    const res = await HttpService.client.deleteComment(form);
    if (res.state === "success") {
      toast(I18NextService.i18n.t("deleted"));
      this.findAndUpdateComment(res);
    }
  }

  async handleRemoveComment(form: RemoveComment) {
    const res = await HttpService.client.removeComment(form);
    if (res.state === "success") {
      toast(I18NextService.i18n.t("remove_comment"));
      this.findAndUpdateComment(res);
    }
  }

  async handleSaveComment(form: SaveComment) {
    const res = await HttpService.client.saveComment(form);
    this.findAndUpdateComment(res);
  }

  async handleCommentVote(form: CreateCommentLike) {
    const res = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(res);
  }

  async handleCommentReport(form: CreateCommentReport) {
    const reportRes = await HttpService.client.createCommentReport(form);
    this.reportToast(reportRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    const res = await HttpService.client.distinguishComment(form);
    this.findAndUpdateComment(res);
  }

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = await HttpService.client.addAdmin(form);

    if (addAdminRes.state === "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    await HttpService.client.transferCommunity(form);
    toast(I18NextService.i18n.t("transfer_community"));
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    const res = await HttpService.client.markCommentReplyAsRead(form);
    if (res.state === "success") {
      this.updateRead("CommentReply", form.comment_reply_id, form.read);
    }
  }

  async handlePersonMentionRead(form: MarkPersonCommentMentionAsRead) {
    const res = await HttpService.client.markCommentMentionAsRead(form);
    if (res.state === "success") {
      this.updateRead(
        "CommentMention",
        form.person_comment_mention_id,
        form.read,
      );
    }
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes, form.community_id);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
  }

  async handleDeleteMessage(form: DeletePrivateMessage) {
    const res = await HttpService.client.deletePrivateMessage(form);
    this.findAndUpdateMessage(res);
  }

  async handleEditMessage(form: EditPrivateMessage): Promise<boolean> {
    const res = await HttpService.client.editPrivateMessage(form);
    this.findAndUpdateMessage(res);
    if (res.state === "failed") {
      toast(
        I18NextService.i18n.t(res.err.message as NoOptionI18nKeys),
        "danger",
      );
    }
    return res.state !== "failed";
  }

  updateRead(type_: InboxCombinedView["type_"], id: number, read: boolean) {
    this.setState(s => {
      if (s.inboxRes.state === "success") {
        s.inboxRes.data.inbox = s.inboxRes.data.inbox.map(i => {
          let read_id: number;
          switch (i.type_) {
            case "CommentReply":
              read_id = i.comment_reply.id;
              break;
            case "CommentMention":
              read_id = i.person_comment_mention.id;
              break;
            case "PostMention":
              read_id = i.person_post_mention.id;
              break;
            case "PrivateMessage":
              read_id = i.private_message.id;
              break;
          }
          if (i.type_ === type_ && read_id === id) {
            const a = { ...i };
            setRead(a, read);
            return a;
          }
          return i;
        });
      }
      return { inboxRes: s.inboxRes };
    });
  }

  async handleMarkMessageAsRead(form: MarkPrivateMessageAsRead) {
    const res = await HttpService.client.markPrivateMessageAsRead(form);
    if (res.state === "success") {
      this.updateRead("PrivateMessage", form.private_message_id, form.read);
    }
  }

  async handleMessageReport(form: CreatePrivateMessageReport) {
    const res = await HttpService.client.createPrivateMessageReport(form);
    this.reportToast(res);
  }

  async handleCreateMessage(form: CreatePrivateMessage): Promise<boolean> {
    const res = await HttpService.client.createPrivateMessage(form);
    this.setState(s => {
      if (s.inboxRes.state === "success" && res.state === "success") {
        s.inboxRes.data.inbox.unshift({
          type_: "PrivateMessage",
          ...res.data.private_message_view,
        });
      }

      return s;
    });
    if (res.state === "failed") {
      toast(
        I18NextService.i18n.t(res.err.message as NoOptionI18nKeys),
        "danger",
      );
    }
    return res.state !== "failed";
  }

  findAndUpdateMessage(res: RequestState<PrivateMessageResponse>) {
    this.setState(s => {
      if (s.inboxRes.state === "success" && res.state === "success") {
        s.inboxRes.data.inbox = editCombined(
          { type_: "PrivateMessage", ...res.data.private_message_view },
          s.inboxRes.data.inbox,
          getUncombinedInbox,
        );
      }
      return s;
    });
  }

  updateBanFromCommunity(
    banRes: RequestState<BanFromCommunityResponse>,
    communityId: CommunityId,
  ) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.inboxRes.state === "success") {
          s.inboxRes.data.inbox = s.inboxRes.data.inbox.map(c => {
            if (
              c.type_ !== "PrivateMessage" &&
              c.community.id === communityId &&
              c.creator.id === banRes.data.person_view.person.id
            ) {
              return { ...c, banned_from_community: banRes.data.banned };
            }
            return c;
          });
        }
        return { inboxRes: s.inboxRes };
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.inboxRes.state === "success") {
          s.inboxRes.data.inbox = s.inboxRes.data.inbox.map(c =>
            c.type_ !== "PrivateMessage" &&
            c.creator.id === banRes.data.person_view.person.id
              ? { ...c, creator: { ...c.creator, banned: banRes.data.banned } }
              : c,
          );
        }
        return { inboxRes: s.inboxRes };
      });
    }
  }

  purgeItem(purgeRes: RequestState<SuccessResponse>) {
    if (purgeRes.state === "success") {
      toast(I18NextService.i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  reportToast(
    res: RequestState<PrivateMessageReportResponse | CommentReportResponse>,
  ) {
    if (res.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    } else if (res.state === "failed") {
      toast(
        I18NextService.i18n.t(res.err.message as NoOptionI18nKeys),
        "danger",
      );
    }
  }

  // A weird case, since you have only replies and mentions, not comment responses
  findAndUpdateComment(res: RequestState<CommentResponse>) {
    if (res.state === "success") {
      this.setState(s => {
        if (s.inboxRes.state === "success") {
          s.inboxRes.data.inbox = s.inboxRes.data.inbox.map(i => {
            if (
              (i.type_ === "CommentReply" || i.type_ === "CommentMention") &&
              i.comment.id === res.data.comment_view.comment.id
            ) {
              return {
                ...i, // Keep the reply/mention props
                ...res.data.comment_view, // update the comment props
              };
            }
            return i;
          });
        }
        return { inboxRes: s.inboxRes };
      });
    }
  }

  async handleMarkPostAsRead(form: MarkPostAsRead) {
    if (this.state.inboxRes.state === "success") {
      const mention = this.state.inboxRes.data.inbox
        .filter(i => i.type_ === "PostMention") // filter first to get the correct type
        .find(i => i.post.id === form.post_id);
      if (mention) {
        const res = await HttpService.client.markPostMentionAsRead({
          person_post_mention_id: mention.person_post_mention.id,
          read: form.read,
        });
        if (res.state === "success") {
          this.updateRead(
            "PostMention",
            mention.person_post_mention.id,
            form.read,
          );
        }
      }
    }
  }
}
