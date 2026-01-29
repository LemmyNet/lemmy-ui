import { Component, InfernoNode } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentResponse,
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
  PostResponse,
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
} from "lemmy-js-client";
import { CommentNodes } from "../comment/comment-nodes";
import { PostListing } from "../post/post-listing";
import { RequestState } from "../../services/HttpService";
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
  createLoading: CommentId | undefined;
  editLoading: CommentId | undefined;
  onSaveComment(form: SaveComment): Promise<void>;
  onCreateComment(form: CreateComment): Promise<RequestState<CommentResponse>>;
  onEditComment(form: EditComment): Promise<RequestState<CommentResponse>>;
  onCommentVote(form: CreateCommentLike): Promise<void>;
  onBlockPerson(form: BlockPerson): Promise<void>;
  onBlockCommunity(form: BlockCommunity): Promise<void>;
  onDeleteComment(form: DeleteComment): Promise<void>;
  onRemoveComment(form: RemoveComment): Promise<void>;
  onDistinguishComment(form: DistinguishComment): Promise<void>;
  onAddModToCommunity(form: AddModToCommunity): Promise<void>;
  onAddAdmin(form: AddAdmin): Promise<void>;
  onBanPersonFromCommunity(form: BanFromCommunity): Promise<void>;
  onBanPerson(form: BanPerson): Promise<void>;
  onTransferCommunity(form: TransferCommunity): Promise<void>;
  onFetchChildren?(form: GetComments): void;
  onCommentReport(form: CreateCommentReport): Promise<void>;
  onPurgePerson(form: PurgePerson): Promise<void>;
  onPurgeComment(form: PurgeComment): Promise<void>;
  onPostEdit(form: EditPost): Promise<RequestState<PostResponse>>;
  onPostVote(form: CreatePostLike): Promise<RequestState<PostResponse>>;
  onPostReport(form: CreatePostReport): Promise<void>;
  onLockPost(form: LockPost): Promise<void>;
  onDeletePost(form: DeletePost): Promise<void>;
  onRemovePost(form: RemovePost): Promise<void>;
  onSavePost(form: SavePost): Promise<void>;
  onFeaturePost(form: FeaturePost): Promise<void>;
  onPurgePost(form: PurgePost): Promise<void>;
  onMarkPostAsRead(form: MarkPostAsRead): Promise<void>;
  onPersonNote(form: NotePerson): Promise<void>;
  onLockComment(form: LockComment): Promise<void>;
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
            createLoading={this.props.createLoading}
            editLoading={this.props.editLoading}
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
            markable
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
