import {
  commentToFlatNode,
  enableNsfw,
  myAuth,
  setIsoData,
  updateCommunityBlock,
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
  BanPerson,
  PersonResponse,
  BlockCommunity,
  BlockPerson,
  CommentId,
  CommentReportResponse,
  CommentResponse,
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
  LockComment,
  MarkNotificationAsRead,
  MarkPostAsRead,
  NotePerson,
  NotificationDataType,
  NotificationView,
  PrivateMessageId,
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
import { InitialFetchRequest } from "@utils/types";
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
import { NotificationModlogItem } from "./notification-modlog-item";
import {
  RadioButtonGroup,
  RadioOption,
} from "@components/common/radio-button-group";

enum UnreadOrAll {
  Unread,
  All,
}

type NotificationsData = RouteDataResponse<{
  notifsRes: ListNotificationsResponse;
}>;

interface NotificationsState {
  unreadOrAll: UnreadOrAll;
  messageType: NotificationDataType;
  notifsRes: RequestState<ListNotificationsResponse>;
  markAllAsReadRes: RequestState<SuccessResponse>;
  cursor?: DirectionalCursor;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
}

type NotificationsRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type NotificationsFetchConfig = IRoutePropsWithFetch<
  NotificationsData,
  Record<string, never>,
  Record<string, never>
>;

function setRead(item: NotificationView, read: boolean) {
  item.notification.read = read;
}

@scrollMixin
export class Notifications extends Component<
  NotificationsRouteProps,
  NotificationsState
> {
  private isoData = setIsoData<NotificationsData>(this.context);
  state: NotificationsState = {
    unreadOrAll: UnreadOrAll.Unread,
    messageType: "all",
    siteRes: this.isoData.siteRes,
    notifsRes: EMPTY_REQUEST,
    markAllAsReadRes: EMPTY_REQUEST,
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.notifsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);

    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleBlockCommunity = this.handleBlockCommunity.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleLockComment = this.handleLockComment.bind(this);
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
    this.handleMarkNotificationAsRead =
      this.handleMarkNotificationAsRead.bind(this);

    this.handleDeleteMessage = this.handleDeleteMessage.bind(this);
    this.handleMessageMarkAsRead = this.handleMessageMarkAsRead.bind(this);
    this.handleMessageReport = this.handleMessageReport.bind(this);
    this.handleCreateMessage = this.handleCreateMessage.bind(this);
    this.handleEditMessage = this.handleEditMessage.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.handlePersonNote = this.handlePersonNote.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { notifsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        notifsRes,
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
          "notifications",
        )} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  get hasUnreads(): boolean {
    if (this.state.unreadOrAll === UnreadOrAll.Unread) {
      const { notifsRes } = this.state;
      return (
        notifsRes.state === "success" && notifsRes.data.notifications.length > 0
      );
    } else {
      return false;
    }
  }

  render() {
    const auth = myAuth();
    const notifsRss = auth ? `/feeds/notifications/${auth}.xml` : undefined;
    return (
      <div className="notifications container-lg">
        <div className="row">
          <div className="col-12">
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("notifications")}
              {notifsRss && (
                <small>
                  <a href={notifsRss} title="RSS" rel={relTags}>
                    <Icon icon="rss" classes="ms-2 text-muted small" />
                  </a>
                  <link
                    rel="alternate"
                    type="application/atom+xml"
                    href={notifsRss}
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
              resource={this.state.notifsRes}
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
    const allStates: RadioOption[] = [
      { value: "all" },
      { value: "reply", i18n: "replies" },
      { value: "mention", i18n: "mentions" },
      { value: "private_message", i18n: "messages" },
      { value: "mod_action", i18n: "modlog" },
    ];

    return (
      <RadioButtonGroup
        allOptions={allStates}
        currentOption={this.state.messageType}
        onClick={val => this.handleMessageTypeChange(this, val)}
      />
    );
  }

  selects() {
    return (
      <div className="row row-cols-auto g-2 g-sm-3 mb-2 mb-sm-3">
        <div className="col">{this.unreadOrAllRadios()}</div>
        <div className="col">{this.messageTypeRadios()}</div>
      </div>
    );
  }

  // TODO the markable status of all these items should be moved externally from the item.
  // A NotificationWrapper should display a checkmark that exists outside the component.
  renderItemType(item: NotificationView) {
    const siteRes = this.state.siteRes;
    const data = item.data;
    switch (data.type_) {
      case "comment":
        return (
          <CommentNode
            key={item.notification.id}
            node={commentToFlatNode(data)}
            viewType={"flat"}
            showCommunity
            showContext
            hideImages={false}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
            onSaveComment={this.handleSaveComment}
            onBlockPerson={this.handleBlockPerson}
            onBlockCommunity={this.handleBlockCommunity}
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
            onPersonNote={this.handlePersonNote}
            onLockComment={this.handleLockComment}
          />
        );
      case "private_message":
        return (
          <PrivateMessage
            key={item.notification.id}
            private_message_view={data}
            myUserInfo={this.isoData.myUserInfo}
            onDelete={this.handleDeleteMessage}
            onReport={this.handleMessageReport}
            onCreate={this.handleCreateMessage}
            onEdit={this.handleEditMessage}
            read={item.notification.read}
            onMarkRead={this.handleMessageMarkAsRead}
          />
        );
      case "post":
        return (
          this.isoData.myUserInfo && (
            <PostListing
              postView={data}
              showCommunity
              showCrossPosts="show_separately"
              enableNsfw={enableNsfw(this.isoData.siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              allLanguages={[]}
              siteLanguages={[]}
              hideImage
              myUserInfo={this.isoData.myUserInfo}
              localSite={this.isoData.siteRes.site_view.local_site}
              admins={this.isoData.siteRes.admins}
              postListingMode="small_card"
              crossPosts={[]}
              showBody={"preview"}
              editLoading={false}
              viewOnly // TODO: comments do allow edits and moderation
              onPostEdit={() => EMPTY_REQUEST}
              onPostVote={() => EMPTY_REQUEST}
              onPostReport={() => {}}
              onBlockPerson={() => {}}
              onBlockCommunity={() => {}}
              onLockPost={() => {}}
              onDeletePost={() => {}}
              onRemovePost={() => {}}
              onSavePost={() => {}}
              onFeaturePost={() => {}}
              onPurgePerson={() => {}}
              onPurgePost={() => {}}
              onBanPersonFromCommunity={() => {}}
              onBanPerson={() => {}}
              onAddModToCommunity={() => {}}
              onAddAdmin={() => {}}
              onTransferCommunity={() => {}}
              onHidePost={() => {}}
              markable
              disableAutoMarkAsRead
              onMarkPostAsRead={this.handleMarkPostAsRead}
              onPersonNote={this.handlePersonNote}
              onScrollIntoCommentsClick={() => {}}
            />
          )
        );
      case "mod_action": {
        return (
          <NotificationModlogItem
            notification={item.notification}
            modlog_view={data}
            myUserInfo={this.isoData.myUserInfo}
            onMarkRead={this.handleMarkNotificationAsRead}
          />
        );
      }
    }
  }

  all(): InfernoNode {
    const { notifsRes } = this.state;
    if (notifsRes.state === "loading") {
      return <CommentsLoadingSkeleton />;
    } else {
      return (
        <div>
          {notifsRes.state === "success" &&
            notifsRes.data.notifications.map(r => this.renderItemType(r))}
        </div>
      );
    }
  }

  async handlePageChange(cursor?: DirectionalCursor) {
    this.setState({ cursor });
    await this.refetch();
  }

  async handleUnreadOrAllChange(i: Notifications, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), cursor: undefined });
    await i.refetch();
  }

  async handleMessageTypeChange(i: Notifications, val: string) {
    this.setState({
      messageType: val as NotificationDataType,
      cursor: undefined,
    });
    i.refetch();
  }

  static async fetchInitialData({
    headers,
    myUserInfo,
  }: InitialFetchRequest): Promise<NotificationsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    if (myUserInfo) {
      return {
        notifsRes: await client.listNotifications({
          type_: "all",
          unread_only: true,
          limit: fetchLimit,
        }),
      };
    } else {
      return { notifsRes: EMPTY_REQUEST };
    }
  }

  refetchToken?: symbol;
  async refetch() {
    const token = (this.refetchToken = Symbol());
    const unread_only = this.state.unreadOrAll === UnreadOrAll.Unread;
    const cursor = this.state.cursor;

    this.setState({
      notifsRes: LOADING_REQUEST,
    });
    await HttpService.client
      .listNotifications({
        type_: this.state.messageType,
        unread_only,
        ...cursorComponents(cursor),
        limit: fetchLimit,
      })
      .then(notifsRes => {
        if (token === this.refetchToken) {
          this.setState({
            notifsRes,
          });
        }
      });
    UnreadCounterService.Instance.updateUnreadCounts();
  }

  async handleMarkAllAsRead(i: Notifications) {
    i.setState({ markAllAsReadRes: LOADING_REQUEST });

    const markAllAsReadRes =
      await HttpService.client.markAllNotificationsAsRead();

    if (markAllAsReadRes.state === "success") {
      i.setState(s => {
        if (s.notifsRes.state === "success") {
          s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
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
        return { notifsRes: s.notifsRes, markAllAsReadRes };
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
      updatePersonBlock(
        blockPersonRes.data,
        form.block,
        this.isoData.myUserInfo,
      );
    }
  }

  async handleBlockCommunity(form: BlockCommunity) {
    const blockCommunityRes = await HttpService.client.blockCommunity(form);
    if (blockCommunityRes.state === "success") {
      updateCommunityBlock(
        blockCommunityRes.data,
        form.block,
        this.isoData.myUserInfo,
      );
    }
  }

  async handleCreateComment(form: CreateComment) {
    const res = await HttpService.client.createComment(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("reply_sent"));
      // The reply just disappears. Only replies to private messages appear in the notifs.
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
      toast(
        I18NextService.i18n.t(
          form.removed ? "removed_comment" : "restored_comment",
        ),
      );
      this.findAndUpdateComment(res);
    }
  }

  async handleLockComment(form: LockComment) {
    const res = await HttpService.client.lockComment(form);
    if (res.state === "success") {
      toast(I18NextService.i18n.t(form.locked ? "locked" : "unlocked"));
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
    if (this.state.notifsRes.state !== "success") return;
    const notification = this.state.notifsRes.data.notifications.find(
      n => n.data.type_ === "comment" && n.data.comment.id === comment_id,
    );
    if (notification) {
      await this.handleMarkNotificationAsRead({
        notification_id: notification.notification.id,
        read,
      });
    }
  }

  async handleMessageMarkAsRead(
    privateMessageId: PrivateMessageId,
    read: boolean,
  ) {
    if (this.state.notifsRes.state !== "success") return;
    const notification = this.state.notifsRes.data.notifications.find(
      n =>
        n.data.type_ === "private_message" &&
        n.data.private_message.id === privateMessageId,
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
    this.updateBanFromCommunity(banRes, form.community_id, form.ban);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes, form.ban);
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
      if (res.state === "success" && s.notifsRes.state === "success") {
        s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
          n => {
            if (n.notification.id !== form.notification_id) {
              return n;
            }
            const updated: NotificationView = {
              notification: { ...n.notification },
              data: { ...n.data },
            };
            setRead(updated, form.read);
            return updated;
          },
        );
      }
      return { notifsRes: s.notifsRes };
    });
  }

  async handleMessageReport(form: CreatePrivateMessageReport) {
    const res = await HttpService.client.createPrivateMessageReport(form);
    this.reportToast(res);
  }

  async handleCreateMessage(form: CreatePrivateMessage): Promise<boolean> {
    const res = await HttpService.client.createPrivateMessage(form);
    this.setState(s => {
      if (s.notifsRes.state === "success" && res.state === "success") {
        s.notifsRes.data.notifications.unshift({
          // FIXME: maybe just let it disappear, comments do too (own comments don't show in notifs)
          notification: {
            id: 0,
            recipient_id: 0,
            read: true,
            published_at: nowBoolean(true) ?? "",
            kind: "private_message",
          },
          data: {
            type_: "private_message",
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
      if (s.notifsRes.state === "success" && res.state === "success") {
        const notif = s.notifsRes.data.notifications.find(
          n =>
            n.data.type_ === "private_message" &&
            n.data.private_message.id ===
              res.data.private_message_view.private_message.id,
        );
        s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
          n => {
            if (n !== notif) {
              return n;
            }
            return {
              notification: { ...n.notification },
              data: {
                type_: "private_message",
                ...res.data.private_message_view,
              },
            };
          },
        );
      }
      return s;
    });
  }

  updateBanFromCommunity(
    banRes: RequestState<PersonResponse>,
    communityId: CommunityId,
    banned: boolean,
  ) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.notifsRes.state === "success") {
          s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
            c => {
              const notif: NotificationView = {
                notification: { ...c.notification },
                data: { ...c.data },
              };
              switch (notif.data.type_) {
                case "comment":
                case "post":
                  {
                    if (
                      notif.data.community.id === communityId &&
                      notif.data.creator.id ===
                        banRes.data.person_view.person.id
                    ) {
                      notif.data.creator_banned_from_community = banned;

                      break;
                    }
                  }
                  return notif;
              }
              return c;
            },
          );
        }
        return { notifsRes: s.notifsRes };
      });
    }
  }

  updateBan(banRes: RequestState<PersonResponse>, banned: boolean) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.setState(s => {
        if (s.notifsRes.state === "success") {
          s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
            c => {
              const notif: NotificationView = {
                notification: { ...c.notification },
                data: { ...c.data },
              };
              switch (notif.data.type_) {
                case "comment":
                case "post": {
                  notif.data.creator_banned = banned;
                  break;
                }
              }
              return notif;
            },
          );
        }
        return { notifsRes: s.notifsRes };
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
      if (s.notifsRes.state === "success" && res.state === "success") {
        const notif = s.notifsRes.data.notifications.find(
          n =>
            n.data.type_ === "comment" &&
            n.data.comment.id === res.data.comment_view.comment.id,
        );
        s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
          n => {
            if (n !== notif) {
              return n;
            }
            return {
              notification: { ...n.notification },
              data: { type_: "comment", ...res.data.comment_view },
            };
          },
        );
      }
      return s;
    });
  }

  async handleMarkPostAsRead(form: MarkPostAsRead) {
    if (this.state.notifsRes.state !== "success") return;
    const notification = this.state.notifsRes.data.notifications.find(
      n => n.data.type_ === "post" && n.data.post.id === form.post_id,
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
        if (s.notifsRes.state === "success") {
          s.notifsRes.data.notifications = s.notifsRes.data.notifications.map(
            c => {
              const notif: NotificationView = {
                notification: { ...c.notification },
                data: { ...c.data },
              };
              switch (notif.data.type_) {
                case "post":
                case "comment":
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
