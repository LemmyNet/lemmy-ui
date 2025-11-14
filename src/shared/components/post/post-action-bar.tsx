import { Icon } from "@components/common/icon";
import { VoteButtonsCompact } from "@components/common/vote-buttons";
import { I18NextService } from "@services/index";
import { postIsInteractable, userNotLoggedInOrBanned } from "@utils/app";
import { unreadCommentsCount } from "@utils/helpers";
import { PostActionDropdownWrapper } from "./post-action-dropdown-wrapper";
import { ShowBodyType } from "@utils/types";
import { Link } from "inferno-router";
import {
  PostView,
  PersonView,
  MyUserInfo,
  LocalSite,
  CreatePostLike,
  MarkPostAsRead,
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
  onPostVote(form: CreatePostLike): void;
  onScrollIntoCommentsClick(e: MouseEvent): void;
  onViewSource(): void;
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
    markable,
  } = props;
  const { id } = postView.post;

  return (
    <div className="row">
      <div className="col flex-grow-1 text-muted">
        <CommentsButton
          postView={postView}
          type_="icon"
          onScrollIntoCommentsClick={onScrollIntoCommentsClick}
        />
      </div>
      <div className="col-auto d-flex">
        {postIsInteractable(postView, viewOnly) && (
          <VoteButtonsCompact
            voteContentType={"post"}
            id={id}
            onVote={onPostVote}
            subject={postView.post}
            myVoteIsUpvote={postView.post_actions?.vote_is_upvote}
            myUserInfo={myUserInfo}
            localSite={localSite}
            disabled={userNotLoggedInOrBanned(myUserInfo)}
          />
        )}

        <PostActionDropdownWrapper
          postView={postView}
          admins={admins}
          showBody={showBody}
          markable={markable}
          viewOnly={viewOnly}
          viewSource={viewSource}
          myUserInfo={myUserInfo}
          onViewSource={props.onViewSource}
          onEditClick={props.onEditClick}
          onPostReport={props.onPostReport}
          onBlockPerson={props.onBlockPerson}
          onBlockCommunity={props.onBlockCommunity}
          onLockPost={props.onLockPost}
          onDeletePost={props.onDeletePost}
          onRemovePost={props.onRemovePost}
          onSavePost={props.onSavePost}
          onFeaturePost={props.onFeaturePost}
          onPurgePerson={props.onPurgePerson}
          onPurgePost={props.onPurgePost}
          onBanPersonFromCommunity={props.onBanPersonFromCommunity}
          onBanPerson={props.onBanPerson}
          onAddModToCommunity={props.onAddModToCommunity}
          onAddAdmin={props.onAddAdmin}
          onTransferCommunity={props.onTransferCommunity}
          onHidePost={props.onHidePost}
          onPersonNote={props.onPersonNote}
          onMarkPostAsRead={props.onMarkPostAsRead}
        />
      </div>
    </div>
  );
}

type CommentsButtonTextOrIcon = "text" | "icon";
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
      {type_ === "icon" && <Icon icon="message-square" classes="me-1" inline />}
      {count}
      {type_ === "text" && <span> {I18NextService.i18n.t("comments")}</span>}
      {unreadCount && type_ === "text" && (
        <span className="ms-2 fst-italic">
          ({unreadCount} {I18NextService.i18n.t("new")})
        </span>
      )}
      {unreadCount && type_ === "icon" && (
        <span className="ms-2 badge text-bg-light">+{unreadCount}</span>
      )}
    </Link>
  );
}
