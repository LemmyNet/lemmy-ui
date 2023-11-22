import { Component } from "inferno";
import { I18NextService, UserService } from "../../../services";
import { Icon } from "../icon";
import { CrossPostParams } from "@utils/types";
import CrossPostButton from "./cross-post-button";
import {
  CommentView,
  CommunityModeratorView,
  PersonView,
  PostView,
} from "lemmy-js-client";
import {
  amAdmin,
  amCommunityCreator,
  amMod,
  canAdmin,
  canMod,
  isAdmin,
  isBanned,
  isMod,
} from "@utils/roles";
import ActionButton from "./action-button";
import classNames from "classnames";

interface ContentActionDropdownPropsBase {
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
  onRemove: () => void;
  onBanFromCommunity: () => void;
  onAddCommunityMod: () => void;
  onTransferCommunity: () => void;
  onBanFromLocal: () => void;
  onPurgeContent: () => void;
  onPurgeUser: () => void;
  onAddAdmin: () => void;
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
}

export type ContentCommentProps = {
  type: "comment";
  commentView: CommentView;
} & ContentActionDropdownPropsBase;

export type ContentPostProps = {
  type: "post";
  postView: PostView;
  crossPostParams: CrossPostParams;
  onLock: () => void;
  onFeatureLocal: () => void;
  onFeatureCommunity: () => void;
} & ContentActionDropdownPropsBase;

type ContentActionDropdownProps = ContentCommentProps | ContentPostProps;

export default class ContentActionDropdown extends Component<
  ContentActionDropdownProps,
  any
> {
  constructor(props: ContentActionDropdownProps, context: any) {
    super(props, context);
  }

  render() {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    const {
      onSave,
      type,
      onDelete,
      onBlock,
      onEdit,
      onReport,
      onRemove,
      onBanFromCommunity,
      onAddCommunityMod,
      moderators,
      onTransferCommunity,
      onBanFromLocal,
      onPurgeContent,
      onPurgeUser,
      onAddAdmin,
    } = this.props;
    const {
      id,
      saved,
      deleted,
      locked,
      removed,
      creatorBannedFromCommunity,
      creator,
    } = this.contentInfo;
    const dropdownId =
      type === "post"
        ? `post-actions-dropdown-${id}`
        : `comment-actions-dropdown-${id}`;
    const creatorBannedFromLocal = isBanned(creator);
    const showToggleAdmin = !creatorBannedFromLocal && creator.local;

    return (
      <>
        <ActionButton
          onClick={onSave}
          inline
          icon="star"
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
                    icon={deleted ? "undo-trash" : "trash"}
                    label={I18NextService.i18n.t(
                      deleted ? "undelete" : "delete",
                    )}
                    iconClass={`text-${deleted ? "success" : "danger"}`}
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
                      />
                    </li>
                    <li>
                      <ActionButton
                        onClick={this.props.onFeatureCommunity}
                        label={I18NextService.i18n.t(
                          this.props.postView.post.featured_community
                            ? "unfeature_from_community"
                            : "feature_in_community",
                        )}
                        icon="pin"
                        iconClass={classNames({
                          "text-success":
                            this.props.postView.post.featured_community,
                        })}
                      />
                    </li>
                    {amAdmin() && (
                      <li>
                        <ActionButton
                          onClick={this.props.onFeatureLocal}
                          label={I18NextService.i18n.t(
                            this.props.postView.post.featured_local
                              ? "unfeature_from_local"
                              : "feature_in_local",
                          )}
                          icon="pin"
                          iconClass={classNames({
                            "text-success":
                              this.props.postView.post.featured_local,
                          })}
                        />
                      </li>
                    )}
                  </>
                )}
              </>
            )}
            {(this.canMod || this.canAdmin) && (
              <li>
                <ActionButton
                  label={
                    removed
                      ? `${I18NextService.i18n.t(
                          "restore",
                        )} ${I18NextService.i18n.t(
                          type === "post" ? "post" : "comment",
                        )}`
                      : I18NextService.i18n.t(
                          type === "post" ? "remove_post" : "remove_comment",
                        )
                  }
                  icon={removed ? "restore" : "x"}
                  noLoading
                  onClick={onRemove}
                  iconClass={`text-${removed ? "success" : "danger"}`}
                />
              </li>
            )}
            {this.canMod &&
              !(this.creatorIsMod && creatorBannedFromCommunity) && (
                <>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  {!this.creatorIsMod && (
                    <li>
                      <ActionButton
                        onClick={onBanFromCommunity}
                        label={I18NextService.i18n.t(
                          creatorBannedFromCommunity
                            ? "unban"
                            : "ban_from_community",
                        )}
                        icon={creatorBannedFromCommunity ? "unban" : "ban"}
                        noLoading={!creatorBannedFromCommunity}
                        iconClass={`text-${
                          creatorBannedFromCommunity ? "success" : "danger"
                        }`}
                      />
                    </li>
                  )}
                  {!creatorBannedFromCommunity && (
                    <li>
                      <ActionButton
                        onClick={onAddCommunityMod}
                        label={I18NextService.i18n.t(
                          `${this.creatorIsMod ? "remove" : "appoint"}_as_mod`,
                        )}
                        icon={this.creatorIsMod ? "demote" : "promote"}
                        iconClass={`text-${
                          this.creatorIsMod ? "danger" : "success"
                        }`}
                      />
                    </li>
                  )}
                </>
              )}
            {(amCommunityCreator(this.id, moderators) || this.canAdmin) &&
              this.creatorIsMod && (
                <li>
                  <ActionButton
                    label={I18NextService.i18n.t("transfer_community")}
                    onClick={onTransferCommunity}
                    icon="transfer"
                    noLoading
                  />
                </li>
              )}

            {this.canAdmin && (showToggleAdmin || !this.creatorIsAdmin) && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                {!this.creatorIsAdmin && (
                  <>
                    <li>
                      <ActionButton
                        label={I18NextService.i18n.t(
                          creatorBannedFromLocal
                            ? "unban_from_site"
                            : "ban_from_site",
                        )}
                        onClick={onBanFromLocal}
                        icon={creatorBannedFromLocal ? "unban" : "ban"}
                        iconClass={`text-${
                          creatorBannedFromLocal ? "success" : "danger"
                        }`}
                        noLoading={creatorBannedFromLocal}
                      />
                    </li>
                    <li>
                      <ActionButton
                        label={I18NextService.i18n.t("purge_user")}
                        onClick={onPurgeUser}
                        icon="purge"
                        noLoading
                        iconClass="text-danger"
                      />
                    </li>
                    <li>
                      <ActionButton
                        label={I18NextService.i18n.t(
                          `purge_${type === "post" ? "post" : "comment"}`,
                        )}
                        onClick={onPurgeContent}
                        icon="purge"
                        noLoading
                        iconClass="text-danger"
                      />
                    </li>
                  </>
                )}
                {showToggleAdmin && (
                  <li>
                    <ActionButton
                      label={I18NextService.i18n.t(
                        `${
                          this.creatorIsAdmin ? "remove" : "appoint"
                        }_as_admin`,
                      )}
                      onClick={onAddAdmin}
                      icon={this.creatorIsAdmin ? "demote" : "promote"}
                      iconClass={`text-${
                        this.creatorIsAdmin ? "danger" : "success"
                      }`}
                    />
                  </li>
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
        saved: this.props.postView.saved,
        deleted: this.props.postView.post.deleted,
        creator: this.props.postView.creator,
        locked: this.props.postView.post.locked,
        removed: this.props.postView.post.removed,
        creatorBannedFromCommunity:
          this.props.postView.creator_banned_from_community,
      };
    } else {
      return {
        id: this.props.commentView.comment.id,
        saved: this.props.commentView.saved,
        deleted: this.props.commentView.comment.deleted,
        creator: this.props.commentView.creator,
        removed: this.props.commentView.comment.removed,
        creatorBannedFromCommunity:
          this.props.commentView.creator_banned_from_community,
      };
    }
  }

  get amCreator() {
    const {
      creator: { id },
    } = this.contentInfo;

    return id === UserService.Instance.myUserInfo?.local_user_view.person.id;
  }

  get canMod() {
    const { creator } = this.contentInfo;
    return canMod(creator.id, this.props.moderators, this.props.admins);
  }

  get canAdmin() {
    const { creator } = this.contentInfo;
    return canAdmin(creator.id, this.props.admins);
  }

  get creatorIsMod() {
    const { creator } = this.contentInfo;
    return isMod(creator.id, this.props.moderators);
  }

  get creatorIsAdmin(): boolean {
    const { creator } = this.contentInfo;
    return isAdmin(creator.id, this.props.admins);
  }

  get id() {
    return this.props.type === "post"
      ? this.props.postView.creator.id
      : this.props.commentView.creator.id;
  }
}
