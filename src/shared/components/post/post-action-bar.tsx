import PostActionDropdown from "@components/common/content-actions/post-action-dropdown";
import { Icon, Spinner } from "@components/common/icon";
import { BanUpdateForm } from "@components/common/modal/mod-action-form-modal";
import { VoteButtonsCompact } from "@components/common/vote-buttons";
import { I18NextService } from "@services/index";
import { postIsInteractable, userNotLoggedInOrBanned } from "@utils/app";
import { canShare, share } from "@utils/browser";
import { futureDaysToUnixTime } from "@utils/date";
import { getHttpBase } from "@utils/env";
import { unreadCommentsCount } from "@utils/helpers";
import { CrossPostParams, ShowBodyType, VoteContentType } from "@utils/types";
import classNames from "classnames";
import { Link } from "inferno-router";
import {
  PostView,
  PersonView,
  MyUserInfo,
  LocalSite,
  CreatePostLike,
  MarkPostAsRead,
  Post,
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  CreatePostReport,
  DeletePost,
  FeaturePost,
  HidePost,
  LockPost,
  NotePerson,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";

type PostActionBarProps = {
  postView: PostView;
  admins: PersonView[];
  showBody: ShowBodyType;
  markable: boolean;
  viewOnly: boolean;
  viewSource: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  readLoading: boolean;
  onPostVote(form: CreatePostLike): void;
  onScrollIntoCommentsClick(e: MouseEvent): void;
  onClickViewSource(): void;
  onMarkPostAsRead(form: MarkPostAsRead): void;
  onEditClick(): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onBlockPerson(form: BlockPerson): void;
  onBlockCommunity(form: BlockCommunity): void;
  onLockPost(form: LockPost): void;
  onDeletePost(form: DeletePost): void;
  onRemovePost(form: RemovePost): void;
  onSavePost(form: SavePost): void;
  onFeaturePost(form: FeaturePost): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgePost(form: PurgePost): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onTransferCommunity(form: TransferCommunity): void;
  onHidePost(form: HidePost): void;
  onPersonNote(form: NotePerson): void;
};

export function PostActionBar(props: PostActionBarProps) {
  const {
    postView,
    admins,
    showBody,
    onPostVote,
    onScrollIntoCommentsClick,
    viewOnly,
    viewSource,
    myUserInfo,
    localSite,
    onClickViewSource,
    readLoading,
    markable,
  } = props;
  const { ap_id, id, body } = postView.post;

  return (
    <div className="d-flex align-items-center justify-content-start flex-wrap text-muted">
      <CommentsButton
        postView={postView}
        type_="Icon"
        onScrollIntoCommentsClick={onScrollIntoCommentsClick}
      />
      {canShare() && (
        <button
          className="btn btn-link btn-animate text-muted py-0"
          onClick={() => handleShare(postView.post)}
          type="button"
        >
          <Icon icon="share" inline />
        </button>
      )}
      <Link
        className="btn btn-link btn-animate text-muted py-0"
        to={`/post/${id}`}
        title={I18NextService.i18n.t("link")}
      >
        <Icon icon="link" classes="icon-inline" />
      </Link>
      <a
        className="btn btn-link btn-animate text-muted py-0"
        title={I18NextService.i18n.t("fedilink")}
        href={ap_id}
      >
        <Icon icon="fedilink" inline />
      </a>
      {postIsInteractable(postView, viewOnly) && markable && myUserInfo && (
        <button
          type="button"
          className="btn btn-link btn-animate text-muted py-0"
          onClick={() => handleMarkPostAsRead(props)}
          data-tippy-content={
            postView.post_actions?.read_at
              ? I18NextService.i18n.t("mark_as_unread")
              : I18NextService.i18n.t("mark_as_read")
          }
          aria-label={
            postView.post_actions?.read_at
              ? I18NextService.i18n.t("mark_as_unread")
              : I18NextService.i18n.t("mark_as_read")
          }
        >
          {readLoading ? (
            <Spinner />
          ) : (
            <Icon
              icon="check"
              inline
              classes={`${postView.post_actions?.read_at && "text-success"}`}
            />
          )}
        </button>
      )}
      {postIsInteractable(postView, viewOnly) && (
        <VoteButtonsCompact
          voteContentType={VoteContentType.Post}
          id={id}
          onVote={onPostVote}
          subject={postView.post}
          myVote={postView.post_actions?.like_score}
          myUserInfo={myUserInfo}
          localSite={localSite}
          disabled={userNotLoggedInOrBanned(myUserInfo)}
        />
      )}

      {showBody === "Full" && body && (
        <ViewSourceButton
          viewSource={viewSource}
          onClickViewSource={onClickViewSource}
        />
      )}

      {myUserInfo && postIsInteractable(postView, viewOnly) && (
        <PostActionDropdown
          postView={postView}
          community={postView.community}
          admins={admins}
          crossPostParams={crossPostParams(postView.post)}
          myUserInfo={myUserInfo}
          onSave={() => handleSavePost(props)}
          onReport={reason => handleReport(props, reason)}
          onBlockPerson={() => handleBlockPerson(props)}
          onBlockCommunity={() => handleBlockCommunity(props)}
          onEdit={props.onEditClick}
          onDelete={() => handleDeletePost(props)}
          onLock={reason => handleModLock(props, reason)}
          onFeatureCommunity={() => handleModFeaturePostCommunity(props)}
          onFeatureLocal={() => handleModFeaturePostLocal(props)}
          onRemove={reason => handleRemove(props, reason)}
          onBanFromCommunity={form => handleModBanFromCommunity(props, form)}
          onAppointCommunityMod={() => handleAppointCommunityMod(props)}
          onTransferCommunity={() => handleTransferCommunity(props)}
          onBanFromSite={reason => handleModBanFromSite(props, reason)}
          onPurgeUser={reason => handlePurgePerson(props, reason)}
          onPurgeContent={reason => handlePurgePost(props, reason)}
          onAppointAdmin={() => handleAppointAdmin(props)}
          onHidePost={() => handleHidePost(props)}
          onPersonNote={props.onPersonNote}
        />
      )}
    </div>
  );
}

type CommentsButtonTextOrIcon = "Text" | "Icon";
type CommentsButtonProps = {
  postView: PostView;
  type_: CommentsButtonTextOrIcon;
  onScrollIntoCommentsClick(e: MouseEvent): void;
};
export function CommentsButton({
  postView,
  type_,
  onScrollIntoCommentsClick,
}: CommentsButtonProps) {
  const title = I18NextService.i18n.t("number_of_comments", {
    count: Number(postView.post.comments),
    formattedCount: Number(postView.post.comments),
  });

  const count = postView.post.comments;
  const unreadCount = unreadCommentsCount(postView);

  return (
    <Link
      className="btn btn-sm btn-link text-muted ps-0 py-0"
      title={title}
      to={`/post/${postView.post.id}?scrollToComments=true`}
      data-tippy-content={title}
      onClick={onScrollIntoCommentsClick}
    >
      {type_ === "Icon" && <Icon icon="message-square" classes="me-1" inline />}
      {count}
      {type_ === "Text" && <span> {I18NextService.i18n.t("comments")}</span>}
      {unreadCount && (
        <>
          {" "}
          <span className="fst-italic">
            ({unreadCount} {I18NextService.i18n.t("new")})
          </span>
        </>
      )}
    </Link>
  );
}

type ViewSourceButtonProps = {
  viewSource: boolean;
  onClickViewSource(): void;
};
function ViewSourceButton({
  viewSource,
  onClickViewSource,
}: ViewSourceButtonProps) {
  return (
    <button
      className="btn btn-link btn-animate text-muted py-0"
      onClick={onClickViewSource}
      data-tippy-content={I18NextService.i18n.t("view_source")}
      aria-label={I18NextService.i18n.t("view_source")}
    >
      <Icon
        icon="file-text"
        classes={classNames({ "text-success": viewSource })}
        inline
      />
    </button>
  );
}

function crossPostParams(post: Post): CrossPostParams {
  const { name, url, alt_text, nsfw, language_id, thumbnail_url } = post;
  const crossPostParams: CrossPostParams = { name };

  if (url) {
    crossPostParams.url = url;
  }

  const crossPostBody_ = crossPostBody(post);
  if (crossPostBody_) {
    crossPostParams.body = crossPostBody_;
  }

  if (alt_text) {
    crossPostParams.altText = alt_text;
  }

  if (nsfw) {
    crossPostParams.nsfw = nsfw ? "true" : "false";
  }

  if (language_id !== undefined) {
    crossPostParams.languageId = language_id;
  }

  if (thumbnail_url) {
    crossPostParams.customThumbnailUrl = thumbnail_url;
  }

  return crossPostParams;
}

function crossPostBody(post: Post): string | undefined {
  const body = post.body;

  return body
    ? `${I18NextService.i18n.t("cross_posted_from_url", { ap_id: post.ap_id })}
      \n\n${body.replace(/^/gm, "> ")}`
    : undefined;
}

function handleShare(post: Post) {
  const { name, body, id } = post;
  share({
    title: name,
    text: body?.slice(0, 50),
    url: `${getHttpBase()}/post/${id}`,
  });
}

// TODO All these handlers should not have to exist. The PostActionsDropdown should push up the forms directly
function handleMarkPostAsRead(props: PostActionBarProps) {
  if (!props.markable) return;

  // Toggle the read, based on the existence of read_at
  const read = !props.postView.post_actions?.read_at;

  props.onMarkPostAsRead?.({
    post_id: props.postView.post.id,
    read,
  });
}

function handleReport(i: PostActionBarProps, reason: string) {
  return i.onPostReport({
    post_id: i.postView.post.id,
    reason,
  });
}

function handleBlockPerson(i: PostActionBarProps) {
  return i.onBlockPerson({
    person_id: i.postView.creator.id,
    block: true,
  });
}

function handleBlockCommunity(i: PostActionBarProps) {
  return i.onBlockCommunity({
    community_id: i.postView.community.id,
    block: true,
  });
}

function handleDeletePost(i: PostActionBarProps) {
  return i.onDeletePost({
    post_id: i.postView.post.id,
    deleted: !i.postView.post.deleted,
  });
}

function handleSavePost(i: PostActionBarProps) {
  return i.onSavePost({
    post_id: i.postView.post.id,
    save: !i.postView.post_actions?.saved_at,
  });
}

function handleRemove(i: PostActionBarProps, reason: string) {
  return i.onRemovePost({
    post_id: i.postView.post.id,
    removed: !i.postView.post.removed,
    reason,
  });
}

function handleModLock(i: PostActionBarProps, reason: string) {
  return i.onLockPost({
    post_id: i.postView.post.id,
    locked: !i.postView.post.locked,
    reason,
  });
}

function handleModFeaturePostLocal(i: PostActionBarProps) {
  return i.onFeaturePost({
    post_id: i.postView.post.id,
    featured: !i.postView.post.featured_local,
    feature_type: "Local",
  });
}

function handleModFeaturePostCommunity(i: PostActionBarProps) {
  return i.onFeaturePost({
    post_id: i.postView.post.id,
    featured: !i.postView.post.featured_community,
    feature_type: "Community",
  });
}

function handlePurgePost(i: PostActionBarProps, reason: string) {
  return i.onPurgePost({
    post_id: i.postView.post.id,
    reason,
  });
}

function handlePurgePerson(i: PostActionBarProps, reason: string) {
  return i.onPurgePerson({
    person_id: i.postView.creator.id,
    reason,
  });
}

function handleHidePost(i: PostActionBarProps) {
  return i.onHidePost({
    hide: !i.postView.post_actions?.hidden_at,
    post_id: i.postView.post.id,
  });
}

function handleModBanFromCommunity(i: PostActionBarProps, form: BanUpdateForm) {
  const {
    creator: { id: person_id },
    creator_banned_from_community,
    community: { id: community_id },
  } = i.postView;
  const ban = !creator_banned_from_community;
  const expires_at = futureDaysToUnixTime(form.daysUntilExpires);

  // If its an unban, restore all their data
  const shouldRemoveOrRestoreData = ban ? form.shouldRemoveOrRestoreData : true;

  return i.onBanPersonFromCommunity({
    community_id,
    person_id,
    ban,
    remove_or_restore_data: shouldRemoveOrRestoreData,
    reason: form.reason,
    expires_at,
  });
}

function handleModBanFromSite(i: PostActionBarProps, form: BanUpdateForm) {
  const {
    creator: { id: person_id },
    creator_banned: banned,
  } = i.postView;
  const ban = !banned;

  // If its an unban, restore all their data
  const shouldRemoveOrRestoreData = ban ? form.shouldRemoveOrRestoreData : true;
  const expires_at = futureDaysToUnixTime(form.daysUntilExpires);

  return i.onBanPerson({
    person_id,
    ban,
    remove_or_restore_data: shouldRemoveOrRestoreData,
    reason: form.reason,
    expires_at,
  });
}

function handleAppointCommunityMod(i: PostActionBarProps) {
  return i.onAddModToCommunity({
    community_id: i.postView.community.id,
    person_id: i.postView.creator.id,
    added: !i.postView.creator_is_moderator,
  });
}

function handleAppointAdmin(i: PostActionBarProps) {
  return i.onAddAdmin({
    person_id: i.postView.creator.id,
    added: !i.postView.creator_is_admin,
  });
}

function handleTransferCommunity(i: PostActionBarProps) {
  return i.onTransferCommunity({
    community_id: i.postView.community.id,
    person_id: i.postView.creator.id,
  });
}
