import { Component } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentView,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  FeaturePost,
  GetComments,
  GetPersonDetailsResponse,
  Language,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  PersonView,
  PostView,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  SortType,
  TransferCommunity,
} from "lemmy-js-client";
import { CommentViewType, PersonDetailsView } from "../../interfaces";
import { commentsToFlatNodes, setupTippy } from "../../utils";
import { CommentNodes } from "../comment/comment-nodes";
import { Paginator } from "../common/paginator";
import { PostListing } from "../post/post-listing";

interface PersonDetailsProps {
  personRes: GetPersonDetailsResponse;
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  page: number;
  limit: number;
  sort: SortType;
  enableDownvotes: boolean;
  enableNsfw: boolean;
  view: PersonDetailsView;
  onPageChange(page: number): number | any;
  onSaveComment(form: SaveComment): void;
  onCommentReplyRead(form: MarkCommentReplyAsRead): void;
  onPersonMentionRead(form: MarkPersonMentionAsRead): void;
  onCreateComment(form: CreateComment): void;
  onEditComment(form: EditComment): void;
  onCommentVote(form: CreateCommentLike): void;
  onBlockPerson(form: BlockPerson): void;
  onDeleteComment(form: DeleteComment): void;
  onRemoveComment(form: RemoveComment): void;
  onDistinguishComment(form: DistinguishComment): void;
  onAddModToCommunity(form: AddModToCommunity): void;
  onAddAdmin(form: AddAdmin): void;
  onBanPersonFromCommunity(form: BanFromCommunity): void;
  onBanPerson(form: BanPerson): void;
  onTransferCommunity(form: TransferCommunity): void;
  onFetchChildren?(form: GetComments): void;
  onCommentReport(form: CreateCommentReport): void;
  onPurgePerson(form: PurgePerson): void;
  onPurgeComment(form: PurgeComment): void;
  onPostVote(form: CreatePostLike): void;
  onPostReport(form: CreatePostReport): void;
  onLockPost(form: LockPost): void;
  onDeletePost(form: DeletePost): void;
  onRemovePost(form: RemovePost): void;
  onSavePost(form: SavePost): void;
  onFeaturePostLocal(form: FeaturePost): void;
  onFeaturePostCommunity(form: FeaturePost): void;
  onPurgePost(form: PurgePost): void;
  createOrEditCommentLoading: boolean;
  upvoteCommentLoading: boolean;
  downvoteCommentLoading: boolean;
  saveCommentLoading: boolean;
  readCommentLoading: boolean;
  blockPersonLoading: boolean;
  deleteCommentLoading: boolean;
  removeCommentLoading: boolean;
  distinguishCommentLoading: boolean;
  banLoading: boolean;
  addModLoading: boolean;
  addAdminLoading: boolean;
  transferCommunityLoading: boolean;
  fetchChildrenLoading?: boolean;
  reportCommentLoading: boolean;
  purgeCommentLoading: boolean;
  purgePostLoading: boolean;
  upvotePostLoading: boolean;
  downvotePostLoading: boolean;
  reportPostLoading: boolean;
  lockPostLoading: boolean;
  deletePostLoading: boolean;
  removePostLoading: boolean;
  savePostLoading: boolean;
  featureCommunityLoading: boolean;
  featureLocalLoading: boolean;
}

enum ItemEnum {
  Comment,
  Post,
}
type ItemType = {
  id: number;
  type_: ItemEnum;
  view: CommentView | PostView;
  published: string;
  score: number;
};

export class PersonDetails extends Component<PersonDetailsProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
  }

  componentDidMount() {
    setupTippy();
  }

  // TODO wut?
  // componentDidUpdate(lastProps: UserDetailsProps) {
  //   for (const key of Object.keys(lastProps)) {
  //     if (lastProps[key] !== this.props[key]) {
  //       this.fetchUserData();
  //       break;
  //     }
  //   }
  // }

  render() {
    return (
      <div>
        {this.viewSelector(this.props.view)}

        <Paginator page={this.props.page} onChange={this.handlePageChange} />
      </div>
    );
  }

  viewSelector(view: PersonDetailsView) {
    if (
      view === PersonDetailsView.Overview ||
      view === PersonDetailsView.Saved
    ) {
      return this.overview();
    } else if (view === PersonDetailsView.Comments) {
      return this.comments();
    } else if (view === PersonDetailsView.Posts) {
      return this.posts();
    } else {
      return null;
    }
  }

  renderItemType(i: ItemType) {
    switch (i.type_) {
      case ItemEnum.Comment: {
        let c = i.view as CommentView;
        return (
          <CommentNodes
            key={i.id}
            nodes={[{ comment_view: c, children: [], depth: 0 }]}
            viewType={CommentViewType.Flat}
            admins={this.props.admins}
            noBorder
            noIndent
            showCommunity
            showContext
            enableDownvotes={this.props.enableDownvotes}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            onCommentReplyRead={this.props.onCommentReplyRead}
            onPersonMentionRead={this.props.onPersonMentionRead}
            onCreateComment={this.props.onCreateComment}
            onEditComment={this.props.onEditComment}
            onCommentVote={this.props.onCommentVote}
            onBlockPerson={this.props.onBlockPerson}
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
            createOrEditCommentLoading={this.props.createOrEditCommentLoading}
            upvoteLoading={this.props.upvoteCommentLoading}
            downvoteLoading={this.props.downvoteCommentLoading}
            saveLoading={this.props.saveCommentLoading}
            readLoading={this.props.readCommentLoading}
            blockPersonLoading={this.props.blockPersonLoading}
            deleteLoading={this.props.deleteCommentLoading}
            removeLoading={this.props.removeCommentLoading}
            distinguishLoading={this.props.distinguishCommentLoading}
            banLoading={this.props.banLoading}
            addModLoading={this.props.addModLoading}
            addAdminLoading={this.props.addAdminLoading}
            transferCommunityLoading={this.props.transferCommunityLoading}
            fetchChildrenLoading={this.props.fetchChildrenLoading}
            reportLoading={this.props.reportCommentLoading}
            purgeLoading={this.props.purgeCommentLoading}
          />
        );
      }
      case ItemEnum.Post: {
        let p = i.view as PostView;
        return (
          <PostListing
            key={i.id}
            post_view={p}
            admins={this.props.admins}
            showCommunity
            enableDownvotes={this.props.enableDownvotes}
            enableNsfw={this.props.enableNsfw}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            onPostVote={this.props.onPostVote}
            onPostReport={this.props.onPostReport}
            onBlockPerson={this.props.onBlockPerson}
            onLockPost={this.props.onLockPost}
            onDeletePost={this.props.onDeletePost}
            onRemovePost={this.props.onRemovePost}
            onSavePost={this.props.onSavePost}
            onFeaturePostLocal={this.props.onFeaturePostLocal}
            onFeaturePostCommunity={this.props.onFeaturePostCommunity}
            onPurgePerson={this.props.onPurgePerson}
            onPurgePost={this.props.onPurgePost}
            onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
            onBanPerson={this.props.onBanPerson}
            onAddModToCommunity={this.props.onAddModToCommunity}
            onAddAdmin={this.props.onAddAdmin}
            onTransferCommunity={this.props.onTransferCommunity}
            upvoteLoading={this.props.upvotePostLoading}
            downvoteLoading={this.props.downvotePostLoading}
            reportLoading={this.props.reportPostLoading}
            blockLoading={this.props.blockPersonLoading}
            lockLoading={this.props.lockPostLoading}
            deleteLoading={this.props.deletePostLoading}
            removeLoading={this.props.removePostLoading}
            saveLoading={this.props.savePostLoading}
            featureCommunityLoading={this.props.featureCommunityLoading}
            featureLocalLoading={this.props.featureLocalLoading}
            banLoading={this.props.banLoading}
            addModLoading={this.props.addModLoading}
            addAdminLoading={this.props.addAdminLoading}
            transferLoading={this.props.transferCommunityLoading}
            purgeLoading={this.props.purgePostLoading}
          />
        );
      }
      default:
        return <div />;
    }
  }

  overview() {
    let id = 0;
    let comments: ItemType[] = this.props.personRes.comments.map(r => ({
      id: id++,
      type_: ItemEnum.Comment,
      view: r,
      published: r.comment.published,
      score: r.counts.score,
    }));
    let posts: ItemType[] = this.props.personRes.posts.map(r => ({
      id: id++,
      type_: ItemEnum.Post,
      view: r,
      published: r.post.published,
      score: r.counts.score,
    }));

    let combined = [...comments, ...posts];

    // Sort it
    if (this.props.sort === "New") {
      combined.sort((a, b) => b.published.localeCompare(a.published));
    } else {
      combined.sort((a, b) => Number(b.score - a.score));
    }

    return (
      <div>
        {combined.map(i => [
          this.renderItemType(i),
          <hr key={i.type_} className="my-3" />,
        ])}
      </div>
    );
  }

  comments() {
    return (
      <div>
        <CommentNodes
          nodes={commentsToFlatNodes(this.props.personRes.comments)}
          viewType={CommentViewType.Flat}
          admins={this.props.admins}
          noIndent
          showCommunity
          showContext
          enableDownvotes={this.props.enableDownvotes}
          allLanguages={this.props.allLanguages}
          siteLanguages={this.props.siteLanguages}
          onCommentReplyRead={this.props.onCommentReplyRead}
          onPersonMentionRead={this.props.onPersonMentionRead}
          onCreateComment={this.props.onCreateComment}
          onEditComment={this.props.onEditComment}
          onCommentVote={this.props.onCommentVote}
          onBlockPerson={this.props.onBlockPerson}
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
          createOrEditCommentLoading={this.props.createOrEditCommentLoading}
          upvoteLoading={this.props.upvoteCommentLoading}
          downvoteLoading={this.props.downvoteCommentLoading}
          saveLoading={this.props.saveCommentLoading}
          readLoading={this.props.readCommentLoading}
          blockPersonLoading={this.props.blockPersonLoading}
          deleteLoading={this.props.deleteCommentLoading}
          removeLoading={this.props.removeCommentLoading}
          distinguishLoading={this.props.distinguishCommentLoading}
          banLoading={this.props.banLoading}
          addModLoading={this.props.addModLoading}
          addAdminLoading={this.props.addAdminLoading}
          transferCommunityLoading={this.props.transferCommunityLoading}
          fetchChildrenLoading={this.props.fetchChildrenLoading}
          reportLoading={this.props.reportCommentLoading}
          purgeLoading={this.props.purgeCommentLoading}
        />
      </div>
    );
  }

  posts() {
    return (
      <div>
        {this.props.personRes.posts.map(post => (
          <>
            <PostListing
              post_view={post}
              admins={this.props.admins}
              showCommunity
              enableDownvotes={this.props.enableDownvotes}
              enableNsfw={this.props.enableNsfw}
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
              onPostVote={this.props.onPostVote}
              onPostReport={this.props.onPostReport}
              onBlockPerson={this.props.onBlockPerson}
              onLockPost={this.props.onLockPost}
              onDeletePost={this.props.onDeletePost}
              onRemovePost={this.props.onRemovePost}
              onSavePost={this.props.onSavePost}
              onFeaturePostLocal={this.props.onFeaturePostLocal}
              onFeaturePostCommunity={this.props.onFeaturePostCommunity}
              onPurgePerson={this.props.onPurgePerson}
              onPurgePost={this.props.onPurgePost}
              onBanPersonFromCommunity={this.props.onBanPersonFromCommunity}
              onBanPerson={this.props.onBanPerson}
              onAddModToCommunity={this.props.onAddModToCommunity}
              onAddAdmin={this.props.onAddAdmin}
              onTransferCommunity={this.props.onTransferCommunity}
              upvoteLoading={this.props.upvotePostLoading}
              downvoteLoading={this.props.downvotePostLoading}
              reportLoading={this.props.reportPostLoading}
              blockLoading={this.props.blockPersonLoading}
              lockLoading={this.props.lockPostLoading}
              deleteLoading={this.props.deletePostLoading}
              removeLoading={this.props.removePostLoading}
              saveLoading={this.props.savePostLoading}
              featureCommunityLoading={this.props.featureCommunityLoading}
              featureLocalLoading={this.props.featureLocalLoading}
              banLoading={this.props.banLoading}
              addModLoading={this.props.addModLoading}
              addAdminLoading={this.props.addAdminLoading}
              transferLoading={this.props.transferCommunityLoading}
              purgeLoading={this.props.purgeCommentLoading}
            />
            <hr className="my-3" />
          </>
        ))}
      </div>
    );
  }

  handlePageChange(val: number) {
    this.props.onPageChange(val);
  }
}
