import {
  commentToFlatNode,
  enableNsfw,
  myAuth,
  notificationsRSSUrl,
  reportToast,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import { capitalizeFirstLetter, resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { ItemIdAndRes, itemLoading, RouteDataResponse } from "@utils/types";
import { Component, InfernoNode } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  PersonResponse,
  BlockCommunity,
  BlockPerson,
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
  NotificationTypeFilter,
  PagedResponse,
  LockComment,
  MarkNotificationAsRead,
  MarkPostAsRead,
  NotePerson,
  NotificationView,
  PrivateMessageId,
  PrivateMessageResponse,
  PurgeComment,
  PurgePerson,
  RemoveComment,
  SaveComment,
  SuccessResponse,
  TransferCommunity,
  PaginationCursor,
  MyUserInfo,
  CommentId,
  PostId,
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
import { getHttpBaseInternal } from "@utils/env";
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
  FilterChipDropdown,
  FilterOption,
} from "@components/common/filter-chip-dropdown";
import { ShowUnreadOnlyCheckbox } from "@components/common/show-unread-only-checkbox";

const messageTypeOptions: FilterOption<NotificationTypeFilter>[] = [
  { value: "all", i18n: "all" },
  { value: "reply", i18n: "replies" },
  { value: "mention", i18n: "mentions" },
  { value: "private_message", i18n: "messages" },
  { value: "mod_action", i18n: "modlog" },
];

type NotificationsData = RouteDataResponse<{
  notifsRes: PagedResponse<NotificationView>;
}>;

interface NotificationsState {
  showUnreadOnly: boolean;
  messageType: NotificationTypeFilter;
  notifsRes: RequestState<PagedResponse<NotificationView>>;
  markAllAsReadRes: RequestState<SuccessResponse>;
  privateMessageRes: ItemIdAndRes<PrivateMessageId, PrivateMessageResponse>;
  privateMessageDeleteRes: ItemIdAndRes<
    PrivateMessageId,
    PrivateMessageResponse
  >;
  privateMessageReadRes: ItemIdAndRes<PrivateMessageId, SuccessResponse>;
  createCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  editCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  markCommentReadLoadingRes: ItemIdAndRes<CommentId, SuccessResponse>;
  voteCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  markPostReadLoadingRes: ItemIdAndRes<PostId, SuccessResponse>;
  cursor?: PaginationCursor;
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
    showUnreadOnly: true,
    messageType: "all",
    siteRes: this.isoData.siteRes,
    notifsRes: EMPTY_REQUEST,
    markAllAsReadRes: EMPTY_REQUEST,
    privateMessageRes: { id: 0, res: EMPTY_REQUEST },
    privateMessageDeleteRes: { id: 0, res: EMPTY_REQUEST },
    privateMessageReadRes: { id: 0, res: EMPTY_REQUEST },
    createCommentRes: { id: 0, res: EMPTY_REQUEST },
    editCommentRes: { id: 0, res: EMPTY_REQUEST },
    voteCommentRes: { id: 0, res: EMPTY_REQUEST },
    markCommentReadLoadingRes: { id: 0, res: EMPTY_REQUEST },
    markPostReadLoadingRes: { id: 0, res: EMPTY_REQUEST },
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.notifsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

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
    if (this.state.showUnreadOnly) {
      const { notifsRes } = this.state;
      return notifsRes.state === "success" && notifsRes.data.items.length > 0;
    } else {
      return false;
    }
  }

  render() {
    const auth = myAuth();
    const notifsRss = auth ? notificationsRSSUrl(auth) : undefined;
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
            {this.selects()}
            {this.all()}
            <PaginatorCursor
              current={this.state.cursor}
              resource={this.state.notifsRes}
              onPageChange={form => handlePageChange(this, form)}
            />
          </div>
        </div>
      </div>
    );
  }

  messageTypeFilters() {
    return (
      <FilterChipDropdown
        label={"type"}
        allOptions={messageTypeOptions}
        currentOption={messageTypeOptions.find(
          t => t.value === this.state.messageType,
        )}
        onSelect={val => handleMessageTypeChange(this, val)}
      />
    );
  }

  selects() {
    return (
      <div className="row row-cols-auto align-items-center g-3 mb-2">
        <div className="col">
          <ShowUnreadOnlyCheckbox
            isChecked={this.state.showUnreadOnly}
            onCheck={val => handleShowUnreadOnlyChange(this, val)}
          />
        </div>
        <div className="col">{this.messageTypeFilters()}</div>
        {this.hasUnreads && (
          <div className="col">{this.markAllAsReadBtn()}</div>
        )}
      </div>
    );
  }

  markAllAsReadBtn() {
    return (
      <button
        className="btn btn-sm btn-light border-light-subtle"
        onClick={() => handleMarkAllAsRead(this)}
      >
        {this.state.markAllAsReadRes.state === "loading" ? (
          <Spinner />
        ) : (
          capitalizeFirstLetter(I18NextService.i18n.t("mark_all_as_read"))
        )}
      </button>
    );
  }

  // TODO the markable status of all these items should be moved externally from the item.
  // A NotificationWrapper should display a checkmark that exists outside the component.
  renderItemType(item: NotificationView) {
    const siteRes = this.state.siteRes;
    const data = item.data;
    const myUserInfo = this.isoData.myUserInfo;
    switch (data.type_) {
      case "comment":
        return (
          <CommentNode
            key={item.notification.id}
            node={commentToFlatNode(data)}
            createLoading={itemLoading(this.state.createCommentRes)}
            editLoading={itemLoading(this.state.editCommentRes)}
            voteLoading={itemLoading(this.state.voteCommentRes)}
            fetchChildrenLoading={undefined}
            viewType={"flat"}
            showCommunity
            showContext
            hideImages={false}
            read={item.notification.read}
            showMarkRead="main_bar"
            markReadLoading={itemLoading(this.state.markCommentReadLoadingRes)}
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            myUserInfo={myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
            onSaveComment={form => handleSaveComment(this, form)}
            onBlockPerson={form => handleBlockPerson(form, myUserInfo)}
            onBlockCommunity={form => handleBlockCommunity(form, myUserInfo)}
            onDeleteComment={form => handleDeleteComment(this, form)}
            onRemoveComment={form => handleRemoveComment(this, form)}
            onCommentVote={form => handleCommentVote(this, form)}
            onCommentReport={form => handleCommentReport(form)}
            onDistinguishComment={form => handleDistinguishComment(this, form)}
            onAddModToCommunity={form => handleAddModToCommunity(form)}
            onAddAdmin={form => handleAddAdmin(this, form)}
            onTransferCommunity={form => handleTransferCommunity(form)}
            onPurgeComment={form => handlePurgeComment(this, form)}
            onPurgePerson={form => handlePurgePerson(this, form)}
            onBanPersonFromCommunity={form =>
              handleBanFromCommunity(this, form)
            }
            onBanPerson={form => handleBanPerson(this, form)}
            onCreateComment={form => handleCreateComment(this, form)}
            onEditComment={form => handleEditComment(this, form)}
            onPersonNote={form => handlePersonNote(this, form)}
            onLockComment={form => handleLockComment(this, form)}
            onMarkRead={(id, read) => handleMarkCommentAsRead(this, id, read)}
            onFetchChildren={() => {}}
          />
        );
      case "private_message":
        return (
          <PrivateMessage
            key={item.notification.id}
            private_message_view={data}
            read={item.notification.read}
            myUserInfo={myUserInfo}
            onDelete={form => handleDeleteMessage(this, form)}
            onReport={form => handleMessageReport(form)}
            onCreate={form => handleCreateMessage(this, form)}
            onEdit={form => handleEditMessage(this, form)}
            onMarkRead={(id, read) => handleMarkMessageAsRead(this, id, read)}
            createOrEditLoading={
              itemLoading(this.state.privateMessageRes) ===
              data.private_message.id
            }
            deleteLoading={
              itemLoading(this.state.privateMessageDeleteRes) ===
              data.private_message.id
            }
            readLoading={
              itemLoading(this.state.privateMessageReadRes) ===
              data.private_message.id
            }
          />
        );
      case "post":
        return (
          myUserInfo && (
            <PostListing
              postView={data}
              notificationRead={item.notification.read}
              markReadLoading={
                itemLoading(this.state.markPostReadLoadingRes) === data.post.id
              }
              voteLoading={false}
              showCommunity
              showCrossPosts="show_separately"
              enableNsfw={enableNsfw(this.isoData.siteRes)}
              showAdultConsentModal={this.isoData.showAdultConsentModal}
              communityTags={[]}
              allLanguages={[]}
              siteLanguages={[]}
              hideImage
              myUserInfo={myUserInfo}
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
              showMarkRead="main_bar"
              disableAutoMarkAsRead
              onMarkPostAsRead={form => handleMarkPostAsRead(this, form)}
              onPersonNote={form => handlePersonNote(this, form)}
              onScrollIntoCommentsClick={() => {}}
            />
          )
        );
      case "mod_action": {
        return (
          <NotificationModlogItem
            notification={item.notification}
            modlog_view={data}
            myUserInfo={myUserInfo}
            onMarkRead={form => handleMarkNotificationAsRead(this, form)}
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
            notifsRes.data.items.map(r => this.renderItemType(r))}
        </div>
      );
    }
  }

  static fetchInitialData = async ({
    headers,
    myUserInfo,
  }: InitialFetchRequest): Promise<NotificationsData> => {
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
  };

  refetchToken?: symbol;
  async refetch() {
    const token = (this.refetchToken = Symbol());
    const cursor = this.state.cursor;

    this.setState({
      notifsRes: LOADING_REQUEST,
    });
    await HttpService.client
      .listNotifications({
        type_: this.state.messageType,
        unread_only: this.state.showUnreadOnly,
        page_cursor: cursor,
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

  findAndUpdateMessage(res: RequestState<PrivateMessageResponse>) {
    this.setState(s => {
      if (s.notifsRes.state === "success" && res.state === "success") {
        const notif = s.notifsRes.data.items.find(
          n =>
            n.data.type_ === "private_message" &&
            n.data.private_message.id ===
              res.data.private_message_view.private_message.id,
        );
        s.notifsRes.data.items = s.notifsRes.data.items.map(n => {
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
        });
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
          s.notifsRes.data.items = s.notifsRes.data.items.map(c => {
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
                    notif.data.creator.id === banRes.data.person_view.person.id
                  ) {
                    notif.data.creator_banned_from_community = banned;

                    break;
                  }
                }
                return notif;
            }
            return c;
          });
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
          s.notifsRes.data.items = s.notifsRes.data.items.map(c => {
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
          });
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

  // A weird case, since you have only replies and mentions, not comment responses
  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.notifsRes.state === "success" && res.state === "success") {
        const notif = s.notifsRes.data.items.find(
          n =>
            n.data.type_ === "comment" &&
            n.data.comment.id === res.data.comment_view.comment.id,
        );
        s.notifsRes.data.items = s.notifsRes.data.items.map(n => {
          if (n !== notif) {
            return n;
          }
          return {
            notification: { ...n.notification },
            data: { type_: "comment", ...res.data.comment_view },
          };
        });
      }
      return s;
    });
  }
}

async function handlePageChange(i: Notifications, cursor?: PaginationCursor) {
  i.setState({ cursor });
  await i.refetch();
}

async function handleShowUnreadOnlyChange(
  i: Notifications,
  showUnreadOnly: boolean,
) {
  i.setState({ showUnreadOnly, cursor: undefined });
  await i.refetch();
}

async function handleMessageTypeChange(
  i: Notifications,
  val: NotificationTypeFilter,
) {
  i.setState({
    messageType: val,
    cursor: undefined,
  });
  await i.refetch();
}

async function handleMarkAllAsRead(i: Notifications) {
  i.setState({ markAllAsReadRes: LOADING_REQUEST });

  const markAllAsReadRes =
    await HttpService.client.markAllNotificationsAsRead();

  if (markAllAsReadRes.state === "success") {
    i.setState(s => {
      if (s.notifsRes.state === "success") {
        s.notifsRes.data.items = s.notifsRes.data.items.map(nv => {
          const a = {
            notification: { ...nv.notification },
            data: { ...nv.data },
          };
          setRead(a, true);
          return a;
        });
      }
      // Refetch to reload the data
      i.refetch();
      return { notifsRes: s.notifsRes, markAllAsReadRes };
    });
  } else {
    i.setState({ markAllAsReadRes });
  }
}

async function handleAddModToCommunity(form: AddModToCommunity) {
  // TODO not sure what to do here
  await HttpService.client.addModToCommunity(form);
}

async function handlePurgePerson(i: Notifications, form: PurgePerson) {
  const purgePersonRes = await HttpService.client.purgePerson(form);
  i.purgeItem(purgePersonRes);
}

async function handlePurgeComment(i: Notifications, form: PurgeComment) {
  const purgeCommentRes = await HttpService.client.purgeComment(form);
  i.purgeItem(purgeCommentRes);
}

async function handleBlockPerson(
  form: BlockPerson,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockPersonRes = await HttpService.client.blockPerson(form);
  if (blockPersonRes.state === "success") {
    updatePersonBlock(blockPersonRes.data, form.block, myUserInfo);
  }
}

async function handleBlockCommunity(
  form: BlockCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockCommunityRes = await HttpService.client.blockCommunity(form);
  if (blockCommunityRes.state === "success") {
    updateCommunityBlock(blockCommunityRes.data, form.block, myUserInfo);
  }
}

async function handleCreateComment(i: Notifications, form: CreateComment) {
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res: LOADING_REQUEST,
    },
  });
  const res = await HttpService.client.createComment(form);
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res,
    },
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("reply_sent"));
    // The reply just disappears. Only replies to private messages appear in the notifs.
  }

  return res;
}

async function handleEditComment(i: Notifications, form: EditComment) {
  i.setState({
    editCommentRes: { id: form.comment_id, res: LOADING_REQUEST },
  });

  const res = await HttpService.client.editComment(form);
  i.setState({
    editCommentRes: { id: form.comment_id, res },
  });

  if (res.state === "success") {
    toast(I18NextService.i18n.t("edit"));
    i.findAndUpdateComment(res);
  } else if (res.state === "failed") {
    toast(res.err.name, "danger");
  }

  return res;
}

async function handleDeleteComment(i: Notifications, form: DeleteComment) {
  const res = await HttpService.client.deleteComment(form);
  if (res.state === "success") {
    toast(I18NextService.i18n.t("deleted"));
    i.findAndUpdateComment(res);
  }
}

async function handleRemoveComment(i: Notifications, form: RemoveComment) {
  const res = await HttpService.client.removeComment(form);
  if (res.state === "success") {
    toast(
      I18NextService.i18n.t(
        form.removed ? "removed_comment" : "restored_comment",
      ),
    );
    i.findAndUpdateComment(res);
  }
}

async function handleLockComment(i: Notifications, form: LockComment) {
  const res = await HttpService.client.lockComment(form);
  if (res.state === "success") {
    toast(I18NextService.i18n.t(form.locked ? "locked" : "unlocked"));
    i.findAndUpdateComment(res);
  }
}

async function handleSaveComment(i: Notifications, form: SaveComment) {
  const res = await HttpService.client.saveComment(form);
  i.findAndUpdateComment(res);
}

async function handleCommentVote(i: Notifications, form: CreateCommentLike) {
  i.setState({ voteCommentRes: { id: form.comment_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.likeComment(form);
  i.setState({ voteCommentRes: { id: form.comment_id, res } });
  i.findAndUpdateComment(res);
}

async function handleCommentReport(form: CreateCommentReport) {
  const reportRes = await HttpService.client.createCommentReport(form);
  reportToast(reportRes);
}

async function handleDistinguishComment(
  i: Notifications,
  form: DistinguishComment,
) {
  const res = await HttpService.client.distinguishComment(form);
  i.findAndUpdateComment(res);
}

async function handleAddAdmin(i: Notifications, form: AddAdmin) {
  const addAdminRes = await HttpService.client.addAdmin(form);

  if (addAdminRes.state === "success") {
    i.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
  }
}

async function handleTransferCommunity(form: TransferCommunity) {
  await HttpService.client.transferCommunity(form);
  toast(I18NextService.i18n.t("transfer_community"));
}

async function handleMarkCommentAsRead(
  i: Notifications,
  commentId: CommentId,
  read: boolean,
) {
  if (i.state.notifsRes.state !== "success") return;
  const notification = i.state.notifsRes.data.items.find(
    n => n.data.type_ === "comment" && n.data.comment.id === commentId,
  );
  if (notification) {
    i.setState({
      markCommentReadLoadingRes: { id: commentId, res: LOADING_REQUEST },
    });
    const res = await handleMarkNotificationAsRead(i, {
      notification_id: notification.notification.id,
      read,
    });
    i.setState({ markCommentReadLoadingRes: { id: commentId, res } });
  }
}

async function handleMarkMessageAsRead(
  i: Notifications,
  privateMessageId: PrivateMessageId,
  read: boolean,
) {
  const notification =
    i.state.notifsRes.state === "success" &&
    i.state.notifsRes.data.items.find(
      n =>
        n.data.type_ === "private_message" &&
        n.data.private_message.id === privateMessageId,
    );

  if (notification) {
    i.setState({
      privateMessageReadRes: { id: privateMessageId, res: LOADING_REQUEST },
    });
    const res = await handleMarkNotificationAsRead(i, {
      notification_id: notification.notification.id,
      read,
    });
    i.setState({ privateMessageReadRes: { id: privateMessageId, res } });
  }
}

async function handleBanFromCommunity(
  i: Notifications,
  form: BanFromCommunity,
) {
  const banRes = await HttpService.client.banFromCommunity(form);
  i.updateBanFromCommunity(banRes, form.community_id, form.ban);
}

async function handleBanPerson(i: Notifications, form: BanPerson) {
  const banRes = await HttpService.client.banPerson(form);
  i.updateBan(banRes, form.ban);
}

async function handleDeleteMessage(
  i: Notifications,
  form: DeletePrivateMessage,
) {
  i.setState({
    privateMessageDeleteRes: {
      id: form.private_message_id,
      res: LOADING_REQUEST,
    },
  });
  const res = await HttpService.client.deletePrivateMessage(form);
  i.setState({ privateMessageDeleteRes: { id: form.private_message_id, res } });
  i.findAndUpdateMessage(res);
}

async function handleEditMessage(
  i: Notifications,
  form: EditPrivateMessage,
): Promise<boolean> {
  i.setState({
    privateMessageRes: { id: form.private_message_id, res: LOADING_REQUEST },
  });
  const res = await HttpService.client.editPrivateMessage(form);
  i.setState({ privateMessageRes: { id: form.private_message_id, res } });

  i.findAndUpdateMessage(res);
  if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }
  return res.state !== "failed";
}

async function handleMarkNotificationAsRead(
  i: Notifications,
  form: MarkNotificationAsRead,
) {
  const res = await HttpService.client.markNotificationAsRead(form);
  i.setState(s => {
    if (res.state === "success" && s.notifsRes.state === "success") {
      s.notifsRes.data.items = s.notifsRes.data.items.map(n => {
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
    return { notifsRes: s.notifsRes };
  });
  return res;
}

async function handleMessageReport(form: CreatePrivateMessageReport) {
  const res = await HttpService.client.createPrivateMessageReport(form);
  reportToast(res);
}

async function handleCreateMessage(
  i: Notifications,
  form: CreatePrivateMessage,
): Promise<boolean> {
  i.setState({ privateMessageRes: { id: 0, res: LOADING_REQUEST } });
  const res = await HttpService.client.createPrivateMessage(form);
  i.setState({ privateMessageRes: { id: 0, res } });

  i.setState(s => {
    if (s.notifsRes.state === "success" && res.state === "success") {
      s.notifsRes.data.items.unshift({
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

async function handleMarkPostAsRead(i: Notifications, form: MarkPostAsRead) {
  if (i.state.notifsRes.state !== "success") return;
  const notification = i.state.notifsRes.data.items.find(
    n => n.data.type_ === "post" && n.data.post.id === form.post_id,
  );
  if (notification) {
    i.setState({
      markPostReadLoadingRes: { id: form.post_id, res: LOADING_REQUEST },
    });
    const res = await handleMarkNotificationAsRead(i, {
      notification_id: notification.notification.id,
      read: form.read,
    });
    i.setState({
      markPostReadLoadingRes: { id: form.post_id, res },
    });
  }
}

async function handlePersonNote(i: Notifications, form: NotePerson) {
  const res = await HttpService.client.notePerson(form);

  if (res.state === "success") {
    // Update the content lists
    i.setState(s => {
      if (s.notifsRes.state === "success") {
        s.notifsRes.data.items = s.notifsRes.data.items.map(c => {
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
        });
      }
      toast(I18NextService.i18n.t(form.note ? "note_created" : "note_deleted"));
    });
  }
}
