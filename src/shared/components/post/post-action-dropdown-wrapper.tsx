import PostActionDropdown from "@components/common/content-actions/post-action-dropdown";
import { BanUpdateForm } from "@components/common/modal/mod-action-form-modal";
import { share } from "@utils/browser";
import { futureDaysToUnixTime } from "@utils/date";
import { getHttpBase } from "@utils/env";
import { getCrossPostParams } from "@utils/post";
import { ShowBodyType } from "@utils/types";
import {
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
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PersonView,
  Post,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";

/**
 * Props for PostActionDropdownWrapper component
 * Subset of PostActionBar props needed for the dropdown
 */
export type PostActionDropdownWrapperProps = {
  postView: PostView;
  admins: PersonView[];
  showBody: ShowBodyType;
  markable: boolean;
  viewOnly: boolean;
  viewSource: boolean;
  myUserInfo: MyUserInfo | undefined;
  onViewSource(): void;
  onEditClick(): void;
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
  onMarkPostAsRead(form: MarkPostAsRead): void;
};

/**
 * Wrapper component that renders PostActionDropdown with all handlers
 * Reusable across different post listing layouts (card, list, etc.)
 */
export function PostActionDropdownWrapper(
  props: PostActionDropdownWrapperProps,
) {
  const {
    postView,
    admins,
    showBody,
    viewOnly,
    viewSource,
    myUserInfo,
    markable,
  } = props;

  return (
    <PostActionDropdown
      postView={postView}
      community={postView.community}
      admins={admins}
      crossPostParams={getCrossPostParams(postView.post)}
      myUserInfo={myUserInfo}
      viewSource={viewSource}
      showBody={showBody}
      viewOnly={viewOnly}
      markable={markable}
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
      onViewSource={props.onViewSource}
      onSharePost={() => handleShare(props.postView.post)}
      onMarkPostAsRead={() => handleMarkPostAsRead(props)}
    />
  );
}

// Handler functions

function handleSavePost(i: PostActionDropdownWrapperProps) {
  return i.onSavePost({
    post_id: i.postView.post.id,
    save: !i.postView.post_actions?.saved_at,
  });
}

function handleRemove(i: PostActionDropdownWrapperProps, reason: string) {
  return i.onRemovePost({
    post_id: i.postView.post.id,
    removed: !i.postView.post.removed,
    reason,
  });
}

function handleModLock(i: PostActionDropdownWrapperProps, reason: string) {
  return i.onLockPost({
    post_id: i.postView.post.id,
    locked: !i.postView.post.locked,
    reason,
  });
}

function handleModFeaturePostLocal(i: PostActionDropdownWrapperProps) {
  return i.onFeaturePost({
    post_id: i.postView.post.id,
    featured: !i.postView.post.featured_local,
    feature_type: "local",
  });
}

function handleModFeaturePostCommunity(i: PostActionDropdownWrapperProps) {
  return i.onFeaturePost({
    post_id: i.postView.post.id,
    featured: !i.postView.post.featured_community,
    feature_type: "community",
  });
}

function handlePurgePost(i: PostActionDropdownWrapperProps, reason: string) {
  return i.onPurgePost({
    post_id: i.postView.post.id,
    reason,
  });
}

function handlePurgePerson(i: PostActionDropdownWrapperProps, reason: string) {
  return i.onPurgePerson({
    person_id: i.postView.creator.id,
    reason,
  });
}

function handleHidePost(i: PostActionDropdownWrapperProps) {
  return i.onHidePost({
    hide: !i.postView.post_actions?.hidden_at,
    post_id: i.postView.post.id,
  });
}

function handleModBanFromCommunity(
  i: PostActionDropdownWrapperProps,
  form: BanUpdateForm,
) {
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

function handleModBanFromSite(
  i: PostActionDropdownWrapperProps,
  form: BanUpdateForm,
) {
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

function handleAppointCommunityMod(i: PostActionDropdownWrapperProps) {
  return i.onAddModToCommunity({
    community_id: i.postView.community.id,
    person_id: i.postView.creator.id,
    added: !i.postView.creator_is_moderator,
  });
}

function handleAppointAdmin(i: PostActionDropdownWrapperProps) {
  return i.onAddAdmin({
    person_id: i.postView.creator.id,
    added: !i.postView.creator_is_admin,
  });
}

function handleTransferCommunity(i: PostActionDropdownWrapperProps) {
  return i.onTransferCommunity({
    community_id: i.postView.community.id,
    person_id: i.postView.creator.id,
  });
}

function handleShare(post: Post) {
  const { name, body, id } = post;
  share({
    title: name,
    text: body?.slice(0, 50),
    url: `${getHttpBase()}/post/${id}`,
  });
}

function handleMarkPostAsRead(props: PostActionDropdownWrapperProps) {
  if (!props.markable) return;

  // Toggle the read, based on the existence of read_at
  const read = !props.postView.post_actions?.read_at;

  props.onMarkPostAsRead?.({
    post_id: props.postView.post.id,
    read,
  });
}

function handleDeletePost(i: PostActionDropdownWrapperProps) {
  return i.onDeletePost({
    post_id: i.postView.post.id,
    deleted: !i.postView.post.deleted,
  });
}

function handleReport(i: PostActionDropdownWrapperProps, reason: string) {
  return i.onPostReport({
    post_id: i.postView.post.id,
    reason,
  });
}

function handleBlockPerson(i: PostActionDropdownWrapperProps) {
  return i.onBlockPerson({
    person_id: i.postView.creator.id,
    block: true,
  });
}

function handleBlockCommunity(i: PostActionDropdownWrapperProps) {
  return i.onBlockCommunity({
    community_id: i.postView.community.id,
    block: true,
  });
}
