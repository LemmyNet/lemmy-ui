import { commentsToFlatNodes } from "@utils/app";
import { Component } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentId,
  CommentResponse,
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
  EditPost,
  FeaturePost,
  GetComments,
  GetPersonDetailsResponse,
  Language,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  MarkPostAsRead,
  PersonView,
  PostResponse,
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
import { setupTippy } from "../../tippy";
import { CommentNodes } from "../comment/comment-nodes";
import { Paginator } from "../common/paginator";
import { PostListing } from "../post/post-listing";
import { RequestState } from "shared/services/HttpService";

interface PersonDetailsProps {
  personRes: GetPersonDetailsResponse;
  finished: Map<CommentId, boolean | undefined>;
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
  onSaveComment(form: SaveComment): Promise<void>;
  onCommentReplyRead(form: MarkCommentReplyAsRead): void;
  onPersonMentionRead(form: MarkPersonMentionAsRead): void;
  onCreateComment(form: CreateComment): Promise<RequestState<CommentResponse>>;
  onEditComment(form: EditComment): Promise<RequestState<CommentResponse>>;
  onCommentVote(form: CreateCommentLike): Promise<void>;
  onBlockPerson(form: BlockPerson): Promise<void>;
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
  onMarkPostAsRead(form: MarkPostAsRead): void;
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

  render() {
    return (
      <div className="person-details">
        {this.viewSelector(this.props.view)}

        <Paginator
          page={this.props.page}
          onChange={this.handlePageChange}
          nextDisabled={
            (this.props.view === PersonDetailsView.Comments &&
              this.props.limit > this.props.personRes.comments.length) ||
            (this.props.view === PersonDetailsView.Posts &&
              this.props.limit > this.props.personRes.posts.length)
          }
        />
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
        const c = i.view as CommentView;
        return (
          <CommentNodes
            key={i.id}
            nodes={[{ comment_view: c, children: [], depth: 0 }]}
            viewType={CommentViewType.Flat}
            finished={this.props.finished}
            admins={this.props.admins}
            noBorder
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
          />
        );
      }
      case ItemEnum.Post: {
        const p = i.view as PostView;
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
            onPostEdit={this.props.onPostEdit}
            onPostVote={this.props.onPostVote}
            onPostReport={this.props.onPostReport}
            onBlockPerson={this.props.onBlockPerson}
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
            onMarkPostAsRead={this.props.onMarkPostAsRead}
          />
        );
      }
      default:
        return <div />;
    }
  }

  overview() {
    let id = 0;
    const comments: ItemType[] = this.props.personRes.comments.map(r => ({
      id: id++,
      type_: ItemEnum.Comment,
      view: r,
      published: r.comment.published,
      score: r.counts.score,
    }));
    const posts: ItemType[] = this.props.personRes.posts.map(r => ({
      id: id++,
      type_: ItemEnum.Post,
      view: r,
      published: r.post.published,
      score: r.counts.score,
    }));

    const combined = [...comments, ...posts];

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
          finished={this.props.finished}
          isTopLevel
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
              onPostEdit={this.props.onPostEdit}
              onPostVote={this.props.onPostVote}
              onPostReport={this.props.onPostReport}
              onBlockPerson={this.props.onBlockPerson}
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
              onMarkPostAsRead={this.props.onMarkPostAsRead}
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
