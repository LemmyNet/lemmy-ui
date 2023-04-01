import {
  CommentNode as CommentNodeI,
  CommunityModeratorView,
  Language,
  PersonViewSafe,
} from "lemmy-js-client";
import { CommentViewType } from "../../interfaces";
import { CommentNode } from "./comment-node";

interface CommentNodesProps {
  nodes: CommentNodeI[];
  moderators?: CommunityModeratorView[];
  admins?: PersonViewSafe[];
  maxCommentsShown?: number;
  noBorder?: boolean;
  noIndent?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  enableDownvotes?: boolean;
  viewType: CommentViewType;
  allLanguages: Language[];
  siteLanguages: number[];
  hideImages?: boolean;
}

export const CommentNodes = ({
  allLanguages,
  nodes,
  siteLanguages,
  viewType,
  admins,
  enableDownvotes,
  hideImages,
  locked,
  markable,
  maxCommentsShown = nodes.length,
  moderators,
  noBorder,
  noIndent,
  showCommunity,
  showContext,
  viewOnly,
}: CommentNodesProps) =>
  nodes.length > 0 && (
    <div className="comments">
      {nodes.slice(0, maxCommentsShown).map(node => (
        <CommentNode
          key={node.comment_view.comment.id}
          node={node}
          noBorder={noBorder}
          noIndent={noIndent}
          viewOnly={viewOnly}
          locked={locked}
          moderators={moderators}
          admins={admins}
          markable={markable}
          showContext={showContext}
          showCommunity={showCommunity}
          enableDownvotes={enableDownvotes}
          viewType={viewType}
          allLanguages={allLanguages}
          siteLanguages={siteLanguages}
          hideImages={hideImages}
        />
      ))}
    </div>
  );
