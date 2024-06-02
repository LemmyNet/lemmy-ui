import { colorList } from "@utils/app";
import classNames from "classnames";
import { Component } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentResponse,
  CommunityModeratorView,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  DeleteComment,
  DistinguishComment,
  EditComment,
  GetComments,
  Language,
  LocalUserVoteDisplayMode,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  PersonView,
  PurgeComment,
  PurgePerson,
  RemoveComment,
  SaveComment,
  TransferCommunity,
} from "lemmy-js-client";
import { CommentNodeI, CommentViewType } from "../../interfaces";
import { CommentNode } from "./comment-node";
import { RequestState } from "../../services/HttpService";

interface CommentNodesProps {
  nodes: CommentNodeI[];
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
  maxCommentsShown?: number;
  noBorder?: boolean;
  isTopLevel?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  enableDownvotes?: boolean;
  voteDisplayMode: LocalUserVoteDisplayMode;
  viewType: CommentViewType;
  allLanguages: Language[];
  siteLanguages: number[];
  hideImages?: boolean;
  isChild?: boolean;
  depth?: number;
  onSaveComment(form: SaveComment): Promise<void>;
  onCommentReplyRead(form: MarkCommentReplyAsRead): void;
  onPersonMentionRead(form: MarkPersonMentionAsRead): void;
  onCreateComment(
    form: EditComment | CreateComment,
  ): Promise<RequestState<CommentResponse>>;
  onEditComment(
    form: EditComment | CreateComment,
  ): Promise<RequestState<CommentResponse>>;
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
}

export class CommentNodes extends Component<CommentNodesProps, any> {
  constructor(props: CommentNodesProps, context: any) {
    super(props, context);
  }

  render() {
    const maxComments = this.props.maxCommentsShown ?? this.props.nodes.length;

    const borderColor = this.props.depth
      ? colorList[(this.props.depth - 1) % colorList.length]
      : colorList[0];

    return (
      this.props.nodes.length > 0 && (
        <ul
          className={classNames("comments", {
            "ms-1": this.props.depth && this.props.depth > 1,
            "border-top border-light": !this.props.noBorder,
          })}
          style={
            this.props.isChild
              ? `border-left: 2px solid ${borderColor} !important;`
              : undefined
          }
        >
          {this.props.nodes.slice(0, maxComments).map(node => (
            <CommentNode
              key={node.comment_view.comment.id}
              node={node}
              noBorder={this.props.noBorder}
              isTopLevel={this.props.isTopLevel}
              viewOnly={this.props.viewOnly}
              locked={this.props.locked}
              moderators={this.props.moderators}
              admins={this.props.admins}
              markable={this.props.markable}
              showContext={this.props.showContext}
              showCommunity={this.props.showCommunity}
              enableDownvotes={this.props.enableDownvotes}
              voteDisplayMode={this.props.voteDisplayMode}
              viewType={this.props.viewType}
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
              hideImages={this.props.hideImages}
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
          ))}
        </ul>
      )
    );
  }
}
