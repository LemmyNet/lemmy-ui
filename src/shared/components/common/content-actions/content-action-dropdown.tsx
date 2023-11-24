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
  isBanned,
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
      creator_banned_from_community,
      creator,
      community,
      creator_is_admin,
      creator_is_moderator,
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
            {(amMod(community.id) || amAdmin()) && (
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
              !(creator_is_moderator && creator_banned_from_community) && (
                <>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  {!creator_is_moderator && (
                    <li>
                      <ActionButton
                        onClick={onBanFromCommunity}
                        label={I18NextService.i18n.t(
                          creator_banned_from_community
                            ? "unban"
                            : "ban_from_community",
                        )}
                        icon={creator_banned_from_community ? "unban" : "ban"}
                        noLoading={!creator_banned_from_community}
                        iconClass={`text-${
                          creator_banned_from_community ? "success" : "danger"
                        }`}
                      />
                    </li>
                  )}
                  {!creator_banned_from_community && (
                    <li>
                      <ActionButton
                        onClick={onAddCommunityMod}
                        label={I18NextService.i18n.t(
                          `${
                            creator_is_moderator ? "remove" : "appoint"
                          }_as_mod`,
                        )}
                        icon={creator_is_moderator ? "demote" : "promote"}
                        iconClass={`text-${
                          creator_is_moderator ? "danger" : "success"
                        }`}
                      />
                    </li>
                  )}
                </>
              )}
            {(amCommunityCreator(this.id, moderators) || this.canAdmin) &&
              creator_is_moderator && (
                <li>
                  <ActionButton
                    label={I18NextService.i18n.t("transfer_community")}
                    onClick={onTransferCommunity}
                    icon="transfer"
                    noLoading
                  />
                </li>
              )}

            {this.canAdmin && (showToggleAdmin || !creator_is_admin) && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                {!creator_is_admin && (
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
                        `${creator_is_admin ? "remove" : "appoint"}_as_admin`,
                      )}
                      onClick={onAddAdmin}
                      icon={creator_is_admin ? "demote" : "promote"}
                      iconClass={`text-${
                        creator_is_admin ? "danger" : "success"
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
      const {
        post: { id, deleted, locked, removed },
        saved,
        creator,
        creator_banned_from_community,
        community,
        creator_is_admin,
        creator_is_moderator,
      } = this.props.postView;

      return {
        id,
        saved,
        deleted,
        creator,
        locked,
        removed,
        creator_banned_from_community,
        community,
        creator_is_admin,
        creator_is_moderator,
      };
    } else {
      const {
        comment: { id, deleted, removed },
        saved,
        creator,
        creator_banned_from_community,
        community,
        creator_is_admin,
        creator_is_moderator,
      } = this.props.commentView;

      return {
        id,
        saved,
        deleted,
        creator,
        removed,
        creator_banned_from_community,
        community,
        creator_is_admin,
        creator_is_moderator,
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

  get id() {
    return this.props.type === "post"
      ? this.props.postView.creator.id
      : this.props.commentView.creator.id;
  }
}
