import {
  enableNsfw,
  mixedToCommentSortType,
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
  CommentId,
  CommentReportResponse,
  CommentResponse,
  CommentSortType,
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
  LemmyHttp,
  ListNotificationsResponse,
  MarkNotificationAsRead,
  MarkPostAsRead,
  MarkPrivateMessageAsRead,
  NotePerson,
  NotificationDataType,
  NotificationView,
  PostSortType,
  PrivateMessageReportResponse,
  PrivateMessageResponse,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  SaveComment,
  SuccessResponse,
  TransferCommunity,
} from "lemmy-js-client";
import { fetchLimit, relTags } from "@utils/config";
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
import { NoOptionI18nKeys } from "i18next";
import { nowBoolean } from "@utils/date";
import { CommentNode } from "@components/comment/comment-node";
import { PostListing } from "@components/post/post-listing";

enum UnreadOrAll {
  Unread,
  All,
}

type InboxData = RouteDataResponse<{
  inboxRes: ListNotificationsResponse;
}>;

interface InboxState {
  unreadOrAll: UnreadOrAll;
  messageType: NotificationDataType;
  inboxRes: RequestState<ListNotificationsResponse>;
  markAllAsReadRes: RequestState<SuccessResponse>;
  sort: PostSortType | CommentSortType;
  cursor?: DirectionalCursor;
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

function setRead(item: NotificationView, read: boolean) {
  item.notification.read = read;
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
    this.handleCommentMarkAsRead = this.handleCommentMarkAsRead.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);

    this.handleDeleteMessage = this.handleDeleteMessage.bind(this);
    this.handleMarkMessageAsRead = this.handleMarkMessageAsRead.bind(this);
    this.handleMessageReport = this.handleMessageReport.bind(this);
    this.handleCreateMessage = this.handleCreateMessage.bind(this);
    this.handleEditMessage = this.handleEditMessage.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.handlePersonNote = this.handlePersonNote.bind(this);

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
      return (
        inboxRes.state === "success" && inboxRes.data.notifications.length > 0
      );
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
            {this.all()}
            <PaginatorCursor
              current={this.state.cursor}
              resource={this.state.inboxRes}
              onPageChange={this.handlePageChange}
            />
          </div>
        </div>
      </div>
    );
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
          value={"Reply"}
          checked={this.state.messageType === "Reply"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-replies`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "Reply",
          })}
        >
          {I18NextService.i18n.t("replies")}
        </label>

        <input
          id={`${radioId}-mentions`}
          type="radio"
          className="btn-check"
          value={"Mention"}
          checked={this.state.messageType === "Mention"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-mentions`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "Mention",
          })}
        >
          {I18NextService.i18n.t("mentions")}
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
            current={mixedToCommentSortType(this.state.sort)}
            onChange={this.handleSortChange}
          />
        </div>
      </div>
    );
  }

  renderItemType(item: NotificationView) {
    const siteRes = this.state.siteRes;
    const i = item.data;
    switch (i.type_) {
      case "Comment":
        return (
          <CommentNode
            key={item.notification.id}
            node={{ comment_view: i, children: [], depth: 0 }}
            viewType={CommentViewType.Flat}
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
            onBanPersonFromCommunity={this.handleBanFromCommunity}
            onBanPerson={this.handleBanPerson}
            onCreateComment={this.handleCreateComment}
            onEditComment={this.handleEditComment}
            markable
            read={item.notification.read}
            onMarkRead={this.handleCommentMarkAsRead}
            onPersonNote={this.handlePersonNote}
          />
        );
      case "PrivateMessage":
        return (
          <PrivateMessage
            key={item.notification.id}
            private_message_view={i}
            myUserInfo={this.isoData.myUserInfo}
            onDelete={this.handleDeleteMessage}
            onReport={this.handleMessageReport}
            onCreate={this.handleCreateMessage}
            onEdit={this.handleEditMessage}
            read={item.notification.read}
            onMarkRead={this.handleMarkMessageAsRead}
          />
        );
      case "Post":
        return (
          this.isoData.myUserInfo && (
            <PostListing
              post_view={i}
              showCommunity={true}
              enableNsfw={enableNsfw(this.isoData.siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={[]}
              siteLanguages={[]}
              hideImage
              myUserInfo={this.isoData.myUserInfo}
              localSite={this.isoData.siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              viewOnly={true} // TODO: comments do allow edits and moderation
              onPostEdit={async () => EMPTY_REQUEST}
              onPostVote={async () => EMPTY_REQUEST}
              onPostReport={async () => {}}
              onBlockPerson={async () => {}}
              onLockPost={async () => {}}
              onDeletePost={async () => {}}
              onRemovePost={async () => {}}
              onSavePost={async () => {}}
              onFeaturePost={async () => {}}
              onPurgePerson={async () => {}}
              onPurgePost={async () => {}}
              onBanPersonFromCommunity={async () => {}}
              onBanPerson={async () => {}}
              onAddModToCommunity={async () => {}}
              onAddAdmin={async () => {}}
              onTransferCommunity={async () => {}}
              onHidePost={async () => {}}
              markable={true}
              disableAutoMarkAsRead={true}
              read={item.notification.read}
              onMarkPostAsRead={this.handleMarkPostAsRead}
              onPersonNote={this.handlePersonNote}
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
            inboxRes.data.notifications.map(r => this.renderItemType(r))}
        </div>
      );
    }
  }

  async handlePageChange(cursor?: DirectionalCursor) {
    this.setState({ cursor });
    await this.refetch();
  }

  async handleUnreadOrAllChange(i: Inbox, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), cursor: undefined });
    await i.refetch();
  }

  async handleMessageTypeChange(i: Inbox, event: any) {
    i.setState({
      messageType: event.target.value as NotificationDataType,
      cursor: undefined,
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
        inboxRes: await client.listNotifications({
          type_: "All",
          unread_only: true,
          limit: fetchLimit,
        }),
      };
    }

    return { inboxRes: EMPTY_REQUEST };
  }

  refetchToken?: symbol;
  async refetch() {
    const token = (this.refetchToken = Symbol());
    const unread_only = this.state.unreadOrAll === UnreadOrAll.Unread;
    const cursor = this.state.cursor;

    this.setState({
      inboxRes: LOADING_REQUEST,
    });
    await HttpService.client
      .listNotifications({
        type_: this.state.messageType,
        // TODO: sort: this.state.sort,
        unread_only,
        ...cursorComponents(cursor),
        limit: fetchLimit,
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
    this.setState({ sort: val, cursor: undefined });
    await this.refetch();
  }

  async handleMarkAllAsRead(i: Inbox) {
    i.setState({ markAllAsReadRes: LOADING_REQUEST });

    const markAllAsReadRes =
      await HttpService.client.markAllNotificationsAsRead();

    if (markAllAsReadRes.state === "success") {
      i.setState(s => {
        if (s.inboxRes.state === "success") {
          s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(
            nv => {
              const a = {
                notification: { ...nv.notification },
                data: { ...nv.data },
              };
              setRead(a, true);
              return a;
            },
          );
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
      toast(res.err.name, "danger");
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

  async handleCommentMarkAsRead(comment_id: CommentId, read: boolean) {
    if (this.state.inboxRes.state !== "success") return;
    const notification = this.state.inboxRes.data.notifications.find(
      n => n.data.type_ === "Comment" && n.data.comment.id === comment_id,
    );
    if (notification) {
      await this.handleMarkNotificationAsRead({
        notification_id: notification.notification.id,
        read,
      });
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
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }
    return res.state !== "failed";
  }

  async handleMarkNotificationAsRead(form: MarkNotificationAsRead) {
    const res = await HttpService.client.markNotificationAsRead(form);
    this.setState(s => {
      if (res.state === "success" && s.inboxRes.state === "success") {
        s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(n => {
          if (n.notification.id !== form.notification_id) {
            return n;
          }
          const updated: NotificationView = {
            notification: { ...n.notification },
            data: { ...n.data },
          };
          setRead(updated, form.read);
          return updated;
        });
      }
      return { inboxRes: s.inboxRes };
    });
  }

  async handleMarkMessageAsRead(form: MarkPrivateMessageAsRead) {
    if (this.state.inboxRes.state !== "success") return;
    const notification = this.state.inboxRes.data.notifications.find(
      n =>
        n.data.type_ === "PrivateMessage" &&
        n.data.private_message.id === form.private_message_id,
    );
    if (notification) {
      await this.handleMarkNotificationAsRead({
        notification_id: notification.notification.id,
        read: form.read,
      });
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
        s.inboxRes.data.notifications.unshift({
          // FIXME: maybe just let it disappear, comments do too (own comments don't show in inbox)
          notification: {
            id: 0,
            recipient_id: 0,
            read: true,
            published_at: nowBoolean(true) ?? "",
            kind: "PrivateMessage",
          },
          data: {
            type_: "PrivateMessage",
            ...res.data.private_message_view,
          },
        });
      }
      return s;
    });
    if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }
    return res.state !== "failed";
  }

  findAndUpdateMessage(res: RequestState<PrivateMessageResponse>) {
    this.setState(s => {
      if (s.inboxRes.state === "success" && res.state === "success") {
        const notif = s.inboxRes.data.notifications.find(
          n =>
            n.data.type_ === "PrivateMessage" &&
            n.data.private_message.id ===
              res.data.private_message_view.private_message.id,
        );
        s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(n => {
          if (n !== notif) {
            return n;
          }
          return {
            notification: { ...n.notification },
            data: { type_: "PrivateMessage", ...res.data.private_message_view },
          };
        });
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
          s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(
            c => {
              if (
                c.data.type_ !== "PrivateMessage" &&
                c.data.community.id === communityId &&
                c.data.creator.id === banRes.data.person_view.person.id
              ) {
                const notif: NotificationView = {
                  notification: { ...c.notification },
                  data: { ...c.data },
                };
                switch (notif.data.type_) {
                  case "Comment":
                  case "Post": {
                    notif.data.creator_banned_from_community =
                      banRes.data.banned;
                    break;
                  }
                }
                return notif;
              }
              return c;
            },
          );
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
          s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(
            c => {
              const notif: NotificationView = {
                notification: { ...c.notification },
                data: { ...c.data },
              };
              switch (notif.data.type_) {
                case "Comment":
                case "Post": {
                  notif.data.creator_banned = banRes.data.banned;
                  break;
                }
              }
              return notif;
            },
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
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }
  }

  // A weird case, since you have only replies and mentions, not comment responses
  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.inboxRes.state === "success" && res.state === "success") {
        const notif = s.inboxRes.data.notifications.find(
          n =>
            n.data.type_ === "Comment" &&
            n.data.comment.id === res.data.comment_view.comment.id,
        );
        s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(n => {
          if (n !== notif) {
            return n;
          }
          return {
            notification: { ...n.notification },
            data: { type_: "Comment", ...res.data.comment_view },
          };
        });
      }
      return s;
    });
  }

  async handleMarkPostAsRead(form: MarkPostAsRead) {
    if (this.state.inboxRes.state !== "success") return;
    const notification = this.state.inboxRes.data.notifications.find(
      n => n.data.type_ === "Post" && n.data.post.id === form.post_id,
    );
    if (notification) {
      await this.handleMarkNotificationAsRead({
        notification_id: notification.notification.id,
        read: form.read,
      });
    }
  }

  async handlePersonNote(form: NotePerson) {
    const res = await HttpService.client.notePerson(form);

    if (res.state === "success") {
      // Update the content lists
      this.setState(s => {
        if (s.inboxRes.state === "success") {
          s.inboxRes.data.notifications = s.inboxRes.data.notifications.map(
            c => {
              const notif: NotificationView = {
                notification: { ...c.notification },
                data: { ...c.data },
              };
              switch (notif.data.type_) {
                case "Post":
                case "Comment":
                  if (
                    notif.data.creator.id === form.person_id &&
                    notif.data.person_actions
                  ) {
                    notif.data.person_actions.note = form.note;
                  }
                  break;
              }
              return notif;
            },
          );
        }
        toast(
          I18NextService.i18n.t(form.note ? "note_created" : "note_deleted"),
        );
      });
    }
  }
}
