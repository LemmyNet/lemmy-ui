import { Component } from 'inferno';
import { CommentNode as CommentNodeI } from '../interfaces';
import { CommunityModeratorView, UserViewSafe } from 'lemmy-js-client';
import { CommentNode } from './comment-node';

interface CommentNodesProps {
  nodes: CommentNodeI[];
  moderators?: CommunityModeratorView[];
  admins?: UserViewSafe[];
  postCreatorId?: number;
  noBorder?: boolean;
  noIndent?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  enableDownvotes: boolean;
}

export class CommentNodes extends Component<
  CommentNodesProps,
  any
> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <div className="comments">
        {this.props.nodes.map(node => (
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
