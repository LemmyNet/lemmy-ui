import classNames from "classnames";
import { Component } from "inferno";
import { CommunityModeratorView, Language, PersonView } from "lemmy-js-client";
import { CommentNodeI, CommentViewType } from "../../interfaces";
import { colorList } from "../../utils";
import { CommentNode } from "./comment-node";

interface CommentNodesProps {
  nodes: CommentNodeI[];
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
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
  isChild?: boolean;
  depth?: number;
}

export class CommentNodes extends Component<CommentNodesProps, any> {
  constructor(props: CommentNodesProps, context: any) {
    super(props, context);
  }

  render() {
    const maxComments = this.props.maxCommentsShown ?? this.props.nodes.length;

    const borderColor = this.props.depth
      ? colorList[this.props.depth % colorList.length]
      : colorList[0];

    return this.props.nodes.length > 0 ? (
      <ul
        className={classNames("comments", {
          "ms-1": !!this.props.isChild,
          "border-top border-light": !this.props.noBorder,
        })}
        style={`border-left: 2px solid ${borderColor} !important;`}
      >
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
            markable={this.props.markable}
            showContext={this.props.showContext}
            showCommunity={this.props.showCommunity}
            enableDownvotes={this.props.enableDownvotes}
            viewType={this.props.viewType}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            hideImages={this.props.hideImages}
          />
        ))}
      </ul>
    ) : null;
  }
}
