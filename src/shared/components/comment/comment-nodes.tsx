import { Component } from "inferno";
import { CommunityModeratorView, PersonViewSafe } from "lemmy-js-client";
import { CommentNode as CommentNodeI } from "../../interfaces";
import { CommentNode } from "./comment-node";

interface CommentNodesProps {
  nodes: CommentNodeI[];
  moderators?: CommunityModeratorView[];
  admins?: PersonViewSafe[];
  postCreatorId?: number;
  noBorder?: boolean;
  noIndent?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  maxCommentsShown?: number;
  enableDownvotes: boolean;
}

export class CommentNodes extends Component<CommentNodesProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let maxComments = this.props.maxCommentsShown
      ? this.props.maxCommentsShown
      : this.props.nodes.length;

    return (
      <div className="comments">
        {this.props.nodes.slice(0, maxComments).map(node => (
          <CommentNode
            key={node.comment_view.comment.id}
            node={node}
            noBorder={this.props.noBorder}
            noIndent={this.props.noIndent}
            viewOnly={this.props.viewOnly}
            locked={this.props.locked}
            moderators={this.props.moderators}
            admins={this.props.admins}
            postCreatorId={this.props.postCreatorId}
            markable={this.props.markable}
            showContext={this.props.showContext}
            showCommunity={this.props.showCommunity}
            enableDownvotes={this.props.enableDownvotes}
          />
        ))}
      </div>
    );
  }
}
