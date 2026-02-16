import { Component, InfernoNode } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditPost,
  FeaturePost,
  GetComments,
  Language,
  LockPost,
  MarkPostAsRead,
  PersonView,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  PostSortType,
  TransferCommunity,
  MyUserInfo,
  PostCommentCombinedView,
  LocalSite,
  NotePerson,
  LockComment,
  BlockCommunity,
  CommentId,
  PostId,
} from "lemmy-js-client";
import { CommentNodes } from "../comment/comment-nodes";
import { PostListing } from "../post/post-listing";
import { commentToFlatNode } from "@utils/app";

interface PersonDetailsProps {
  content: PostCommentCombinedView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  limit: number;
  sort: PostSortType;
  enableNsfw: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  createCommentLoading: CommentId | undefined;
  editCommentLoading: CommentId | undefined;
  voteCommentLoading: CommentId | undefined;
  votePostLoading: PostId | undefined;
  onSaveComment: (form: SaveComment) => void;
  onCreateComment: (form: CreateComment) => void;
  onEditComment: (form: EditComment) => void;
  onCommentVote: (form: CreateCommentLike) => void;
  onBlockPerson: (form: BlockPerson) => void;
  onBlockCommunity: (form: BlockCommunity) => void;
  onDeleteComment: (form: DeleteComment) => void;
  onRemoveComment: (form: RemoveComment) => void;
  onDistinguishComment: (form: DistinguishComment) => void;
  onAddModToCommunity: (form: AddModToCommunity) => void;
  onAddAdmin: (form: AddAdmin) => void;
  onBanPersonFromCommunity: (form: BanFromCommunity) => void;
  onBanPerson: (form: BanPerson) => void;
  onTransferCommunity: (form: TransferCommunity) => void;
  onFetchChildren: (form: GetComments) => void;
  onCommentReport: (form: CreateCommentReport) => void;
  onPurgePerson: (form: PurgePerson) => void;
  onPurgeComment: (form: PurgeComment) => void;
  onPostEdit: (form: EditPost) => void;
  onPostVote: (form: CreatePostLike) => void;
  onPostReport: (form: CreatePostReport) => void;
  onLockPost: (form: LockPost) => void;
  onDeletePost: (form: DeletePost) => void;
  onRemovePost: (form: RemovePost) => void;
  onSavePost: (form: SavePost) => void;
  onFeaturePost: (form: FeaturePost) => void;
  onPurgePost: (form: PurgePost) => void;
  onMarkPostAsRead: (form: MarkPostAsRead) => void;
  onPersonNote: (form: NotePerson) => void;
  onLockComment: (form: LockComment) => void;
}

export class PersonDetails extends Component<PersonDetailsProps, any> {
  renderItemType(i: PostCommentCombinedView): InfernoNode {
    switch (i.type_) {
      case "comment": {
        return (
          <CommentNodes
            key={i.comment.id}
            nodes={[commentToFlatNode(i)]}
            viewType={"flat"}
            admins={this.props.admins}
            noBorder
            showCommunity
            showContext
            showMarkRead={"hide"}
            markReadLoading={undefined}
            fetchChildrenLoading={undefined}
            createLoading={this.props.createCommentLoading}
            editLoading={this.props.editCommentLoading}
            voteLoading={this.props.voteCommentLoading}
            hideImages={false}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
            onCreateComment={this.props.onCreateComment}
            onEditComment={this.props.onEditComment}
            onCommentVote={this.props.onCommentVote}
            onBlockPerson={this.props.onBlockPerson}
            onBlockCommunity={this.props.onBlockCommunity}
            onSaveComment={this.props.onSaveComment}
            onDeleteComment={this.props.onDeleteComment}
            onRemoveComment={this.props.onRemoveComment}
            onDistinguishComment={this.props.onDistinguishComment}
            onAddModToCommunity={this.props.onAddModToCommunity}
            onAddAdmin={this.props.onAddAdmin}
            onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
            onBanPerson={this.props.onBanPerson}
            onTransferCommunity={this.props.onTransferCommunity}
            onFetchChildren={this.props.onFetchChildren}
            onCommentReport={this.props.onCommentReport}
            onPurgePerson={this.props.onPurgePerson}
            onPurgeComment={this.props.onPurgeComment}
            onPersonNote={this.props.onPersonNote}
            onLockComment={this.props.onLockComment}
            onMarkRead={async () => {}}
          />
        );
      }
      case "post": {
        return (
          <PostListing
            key={i.post.id}
            postView={i}
            showCrossPosts="show_separately"
            admins={this.props.admins}
            communityTags={[]}
            postListingMode="small_card"
            showCommunity
            crossPosts={[]}
            showBody={"preview"}
            hideImage={false}
            viewOnly={false}
            disableAutoMarkAsRead={false}
            editLoading={false}
            markReadLoading={false}
            voteLoading={this.props.votePostLoading === i.post.id}
            enableNsfw={this.props.enableNsfw}
            showAdultConsentModal={this.props.showAdultConsentModal}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            myUserInfo={this.props.myUserInfo}
            localSite={this.props.localSite}
            onPostEdit={this.props.onPostEdit}
            onPostVote={this.props.onPostVote}
            onPostReport={this.props.onPostReport}
            onBlockPerson={this.props.onBlockPerson}
            onBlockCommunity={this.props.onBlockCommunity}
            onLockPost={this.props.onLockPost}
            onDeletePost={this.props.onDeletePost}
            onRemovePost={this.props.onRemovePost}
            onSavePost={this.props.onSavePost}
            onFeaturePost={this.props.onFeaturePost}
            onPurgePerson={this.props.onPurgePerson}
            onPurgePost={this.props.onPurgePost}
            onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
            onBanPerson={this.props.onBanPerson}
            onAddModToCommunity={this.props.onAddModToCommunity}
            onAddAdmin={this.props.onAddAdmin}
            onTransferCommunity={this.props.onTransferCommunity}
            onHidePost={async () => {}}
            showMarkRead="dropdown"
            onMarkPostAsRead={this.props.onMarkPostAsRead}
            onPersonNote={this.props.onPersonNote}
            onScrollIntoCommentsClick={() => {}}
          />
        );
      }
    }
  }

  render(): InfernoNode {
    const combined: PostCommentCombinedView[] = this.props.content;

    return (
      <div>
        {combined.map(i => [
          this.renderItemType(i),
          <hr key={i.type_} className="my-3" />,
        ])}
      </div>
    );
  }
}
