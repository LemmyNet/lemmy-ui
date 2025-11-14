import { ShowBodyType, ShowCrossPostsType } from "@utils/types";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  FeaturePost,
  HidePost,
  Language,
  LocalSite,
  LockPost,
  MarkPostAsRead,
  MyUserInfo,
  NotePerson,
  PersonView,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  TransferCommunity,
} from "lemmy-js-client";
import { VoteButtons } from "@components/common/vote-buttons";
import { postIsInteractable, userNotLoggedInOrBanned } from "@utils/app";
import { PostThumbnail } from "./post-thumbnail";
import { PostCreatedLine, PostName } from "./common";
import { CrossPosts } from "./cross-posts";
import { CommentsButton } from "./post-action-bar";
import { PostActionDropdownWrapper } from "./post-action-dropdown-wrapper";
import { mdToHtml } from "@utils/markdown";

type Props = {
  postView: PostView;
  crossPosts: PostView[];
  admins: PersonView[];
  allLanguages: Language[];
  showCommunity: boolean;
  showBody: ShowBodyType;
  hideImage: boolean;
  viewOnly: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  showCrossPosts: ShowCrossPostsType;
  markable: boolean;
  imageExpanded?: boolean;
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
  onScrollIntoCommentsClick(e: MouseEvent): void;
  onMarkPostAsRead(form: MarkPostAsRead): void;
};

export function PostListingList({
  postView,
  crossPosts,
  admins,
  allLanguages,
  showCommunity,
  showBody,
  hideImage,
  viewOnly,
  showAdultConsentModal,
  myUserInfo,
  localSite,
  showCrossPosts,
  markable,
  imageExpanded,
  onEditClick,
  onPostVote,
  onPostReport,
  onBlockPerson,
  onBlockCommunity,
  onLockPost,
  onDeletePost,
  onRemovePost,
  onSavePost,
  onFeaturePost,
  onPurgePerson,
  onPurgePost,
  onBanPersonFromCommunity,
  onBanPerson,
  onAddModToCommunity,
  onAddAdmin,
  onTransferCommunity,
  onHidePost,
  onPersonNote,
  onScrollIntoCommentsClick,
  onMarkPostAsRead,
}: Props) {
  return (
    <div>
      <article className="row post-container">
        {postIsInteractable(postView, viewOnly) && (
          <div className="col-auto px-0">
            <VoteButtons
              voteContentType={"post"}
              id={postView.post.id}
              onVote={onPostVote}
              myUserInfo={myUserInfo}
              localSite={localSite}
              subject={postView.post}
              myVoteIsUpvote={postView.post_actions?.vote_is_upvote}
              disabled={userNotLoggedInOrBanned(myUserInfo)}
            />
          </div>
        )}
        <div className="col flex-grow-1">
          <PostName post={postView.post} showBody={showBody} />
          <PostCreatedLine
            postView={postView}
            showCommunity={showCommunity}
            showPublishedTime
            showUrlLine
            showPostBadges
            allLanguages={allLanguages}
            myUserInfo={myUserInfo}
          />
          <div className="d-flex align-items-center gap-2">
            <CommentsButton
              postView={postView}
              type_="text"
              onScrollIntoCommentsClick={onScrollIntoCommentsClick}
            />
            <PostActionDropdownWrapper
              postView={postView}
              admins={admins}
              showBody={showBody}
              markable={markable}
              viewOnly={viewOnly}
              viewSource={false}
              myUserInfo={myUserInfo}
              onViewSource={() => {}}
              onEditClick={onEditClick}
              onPostReport={onPostReport}
              onBlockPerson={onBlockPerson}
              onBlockCommunity={onBlockCommunity}
              onLockPost={onLockPost}
              onDeletePost={onDeletePost}
              onRemovePost={onRemovePost}
              onSavePost={onSavePost}
              onFeaturePost={onFeaturePost}
              onPurgePerson={onPurgePerson}
              onPurgePost={onPurgePost}
              onBanPersonFromCommunity={onBanPersonFromCommunity}
              onBanPerson={onBanPerson}
              onAddModToCommunity={onAddModToCommunity}
              onAddAdmin={onAddAdmin}
              onTransferCommunity={onTransferCommunity}
              onHidePost={onHidePost}
              onPersonNote={onPersonNote}
              onMarkPostAsRead={onMarkPostAsRead}
            />
          </div>
          {postView.post.body && showBody === "full" && (
            <PostBody body={postView.post.body} />
          )}
        </div>
        <div className="col-auto">
          <PostThumbnail
            postView={postView}
            hideImage={hideImage}
            myUserInfo={myUserInfo}
            imageExpanded={imageExpanded}
            showAdultConsentModal={showAdultConsentModal}
          />
        </div>
      </article>
      <CrossPosts
        crossPosts={crossPosts}
        type_={showCrossPosts}
        myUserInfo={myUserInfo}
        localSite={localSite}
      />
    </div>
  );
}

type PostBodyProps = {
  body: string;
};

function PostBody({ body }: PostBodyProps) {
  return (
    <article id="postContent" className="my-2">
      <div className="col-12 card card-body">
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(body, () => {})}
        />
      </div>
    </article>
  );
}
