import { colorList } from "@utils/app";
import classNames from "classnames";
import { Component } from "inferno";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockCommunity,
  BlockPerson,
  Community,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  DeleteComment,
  DistinguishComment,
  EditComment,
  GetComments,
  Language,
  LocalSite,
  LockComment,
  MyUserInfo,
  NotePerson,
  PersonId,
  PersonView,
  PurgeComment,
  PurgePerson,
  RemoveComment,
  SaveComment,
  TransferCommunity,
} from "lemmy-js-client";
import { CommentViewType, CommentNodeType } from "@utils/types";
import { CommentNode } from "./comment-node";

interface CommentNodesProps {
  nodes: CommentNodeType[];
  /**
   * Only use this for the CommentSlim variant.
   **/
  postCreatorId?: PersonId;
  /**
   * Only use this for the CommentSlim variant.
   **/
  community?: Community;
  admins: PersonView[];
  readCommentsAt?: string;
  maxCommentsShown?: number;
  noBorder?: boolean;
  isTopLevel?: boolean;
  viewOnly?: boolean;
  postLockedOrRemovedOrDeleted?: boolean;
  showContext: boolean;
  showCommunity: boolean;
  viewType: CommentViewType;
  allLanguages: Language[];
  siteLanguages: number[];
  hideImages: boolean;
  isChild?: boolean;
  depth?: number;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  onSaveComment(form: SaveComment): void;
  onCreateComment(form: CreateComment): void;
  onEditComment(form: EditComment): void;
  onCommentVote(form: CreateCommentLike): void;
  onBlockPerson(form: BlockPerson): void;
  onBlockCommunity(form: BlockCommunity): void;
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
  onPersonNote(form: NotePerson): void;
  onLockComment(form: LockComment): void;
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
              ? `border-left: var(--comment-border-width) solid ${borderColor} !important;`
              : undefined
          }
        >
          {this.props.nodes.slice(0, maxComments).map(node => (
            <CommentNode
              key={node.view.comment_view.comment.id}
              node={node}
              noBorder={this.props.noBorder}
              isTopLevel={this.props.isTopLevel}
              viewOnly={this.props.viewOnly}
              postLockedOrRemovedOrDeleted={
                this.props.postLockedOrRemovedOrDeleted
              }
              admins={this.props.admins}
              readCommentsAt={this.props.readCommentsAt}
              showContext={this.props.showContext}
              showCommunity={this.props.showCommunity}
              viewType={this.props.viewType}
              allLanguages={this.props.allLanguages}
              siteLanguages={this.props.siteLanguages}
              hideImages={this.props.hideImages}
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
          ))}
        </ul>
      )
    );
  }
}
