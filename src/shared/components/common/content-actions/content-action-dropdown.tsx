import { Component } from "inferno";
import { I18NextService, UserService } from "shared/services";
import { Icon } from "../icon";
import { CrossPostParams } from "@utils/types";
import CrossPostButton from "./cross-post-button";
import { CommentView, CommunityModeratorView, PostView } from "lemmy-js-client";
import { amAdmin, amMod } from "@utils/roles";
import ActionButton from "./action-button";
import classNames from "classnames";

interface ContentActionDropdownPropsBase {
  saved: boolean;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
  moderators: CommunityModeratorView[];
}

type ContentCommentProps = {
  type: "comment";
  commentView: CommentView;
} & ContentActionDropdownPropsBase;

type ContentPostProps = {
  type: "post";
  postView: PostView;
  crossPostParams: CrossPostParams;
  onLock: () => void;
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
    const { onSave, type, onDelete, onBlock, onEdit, onReport } = this.props;
    const { id, saved, deleted, locked } = this.contentInfo;
    const dropdownId =
      type === "post"
        ? `post-actions-dropdown-${id}`
        : `comment-actions-dropdown-${id}`;

    return (
      <>
        <ActionButton
          onClick={onSave}
          inline
          icon="start"
          label={I18NextService.i18n.t(saved ? "unsave" : "save")}
          iconClass={classNames({ "text-warning": saved })}
        />
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
                <li>
                  <ActionButton
                    icon="edit"
                    label={I18NextService.i18n.t("edit")}
                    noLoading
                    onClick={onEdit}
                  />
                </li>
                <li>
                  <ActionButton
                    onClick={onDelete}
                    icon="trash"
                    label={I18NextService.i18n.t(
                      deleted ? "restore" : "delete",
                    )}
                    iconClass={classNames({ "text-danger": deleted })}
                  />
                </li>
              </>
            ) : (
              <>
                <li>
                  <ActionButton
                    icon="flag"
                    label={I18NextService.i18n.t("create_report")}
                    onClick={onReport}
                    noLoading
                  />
                </li>
                <li>
                  <ActionButton
                    icon="slash"
                    label={I18NextService.i18n.t("block_user")}
                    onClick={onBlock}
                  />
                </li>
              </>
            )}

            {(amMod(this.props.moderators) || amAdmin()) && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                {type === "post" && (
                  <>
                    <li>
                      <ActionButton
                        onClick={this.props.onLock}
                        label={I18NextService.i18n.t(
                          locked ? "unlock" : "lock",
                        )}
                        icon="lock"
                        iconClass={classNames({ "class-danger": locked })}
                      />
                    </li>
                  </>
                )}
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
        locked: this.props.postView.post.locked,
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
}
