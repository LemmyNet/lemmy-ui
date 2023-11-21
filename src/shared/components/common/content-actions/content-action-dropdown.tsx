import { Component, linkEvent } from "inferno";
import { I18NextService, UserService } from "shared/services";
import { Icon } from "../icon";
import SaveButton from "./save-button";
import { CrossPostParams } from "@utils/types";
import CrossPostButton from "./cross-post-button";
import { CommentView, PostView } from "lemmy-js-client";
import DeleteButton from "./delete-button";
import BlockButton from "./block-button";

interface ContentActionDropdownPropsBase {
  saved: boolean;
  onSave: (saved: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
}

type ContentCommentProps = {
  type: "comment";
  commentView: CommentView;
} & ContentActionDropdownPropsBase;

type ContentPostProps = {
  type: "post";
  postView: PostView;
  crossPostParams: CrossPostParams;
} & ContentActionDropdownPropsBase;

type ContentActionDropdownProps = ContentCommentProps | ContentPostProps;

/* type PostActionDropdownProps = Omit<
 *   ContentPostProps,
 *   "type" | "postView" | "commentView"
 * > & {
 *   content: PostView;
 * };
 *
 * type CommentActionDropdownProps = Omit<
 *   ContentCommentProps,
 *   "type" | "postView" | "commentView"
 * > & {
 *   content: CommentView;
 * }; */

export default class ContentActionDropdown extends Component<
  ContentActionDropdownProps,
  any
> {
  constructor(props: ContentActionDropdownProps, context: any) {
    super(props, context);
  }

  render() {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    // Possible enhancement: Make each button a component.
    const { onSave, type, onDelete, onBlock } = this.props;
    const { id, saved, deleted } = this.contentInfo;
    const dropdownId =
      type === "post"
        ? `post-actions-dropdown-${id}`
        : `comment-actions-dropdown-${id}`;

    return (
      <>
        <SaveButton saved={saved} onSave={onSave} />
        {this.props.type === "post" && (
          <CrossPostButton {...this.props.crossPostParams!} />
        )}

        <div className="dropdown">
          <button
            className="btn btn-sm btn-link btn-animate text-muted py-0 dropdown-toggle"
            data-tippy-content={I18NextService.i18n.t("more")}
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-controls={dropdownId}
            aria-label={I18NextService.i18n.t("more")}
          >
            <Icon icon="more-vertical" inline />
          </button>

          <ul className="dropdown-menu" id={dropdownId}>
            {this.amCreator ? (
              <>
                <li>{this.editButton}</li>
                <li>
                  <DeleteButton deleted={deleted} onClick={onDelete} />
                </li>
              </>
            ) : (
              <>
                <li>{this.reportButton}</li>
                <li>
                  <BlockButton onClick={onBlock} />
                </li>
              </>
            )}
          </ul>
        </div>
      </>
    );
  }

  get contentInfo() {
    if (this.props.type === "post") {
      return {
        id: this.props.postView.post.id,
        saved: this.props.saved,
        deleted: this.props.postView.post.deleted,
        creator: this.props.postView.creator,
      };
    } else {
      return {
        id: this.props.commentView.comment.id,
        saved: this.props.saved,
        deleted: this.props.commentView.comment.deleted,
        creator: this.props.commentView.creator,
      };
    }
  }

  get amCreator() {
    const {
      creator: { id },
    } = this.contentInfo;

    return id === UserService.Instance.myUserInfo?.local_user_view.person.id;
  }

  get editButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={this.props.onEdit}
        aria-label={I18NextService.i18n.t("edit")}
      >
        <Icon classes="me-1" icon="edit" inline />
        {I18NextService.i18n.t("edit")}
      </button>
    );
  }

  get reportButton() {
    return (
      <button
        className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
        onClick={linkEvent(this, this.props.onReport)}
        aria-label={I18NextService.i18n.t("show_report_dialog")}
      >
        <Icon classes="me-1" icon="flag" inline />
        {I18NextService.i18n.t("create_report")}
      </button>
    );
  }
}
