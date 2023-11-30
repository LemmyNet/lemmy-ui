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
import { Link } from "inferno-router";
import ConfirmationModal from "../confirmation-modal";
import ModActionFormModal, { BanUpdateForm } from "../mod-action-form-modal";
import { BanType, PurgeType } from "../../../interfaces";

interface ContentActionDropdownPropsBase {
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: (reason: string) => void;
  onBlock: () => void;
  onRemove: (reason: string) => void;
  onBanFromCommunity: (form: BanUpdateForm) => void;
  onAppointCommunityMod: () => void;
  onTransferCommunity: () => void;
  onBanFromSite: (form: BanUpdateForm) => void;
  onPurgeContent: (reason: string) => void;
  onPurgeUser: (reason: string) => void;
  onAppointAdmin: () => void;
  moderators?: CommunityModeratorView[];
  admins?: PersonView[];
}

export type ContentCommentProps = {
  type: "comment";
  commentView: CommentView;
  onReply: () => void;
  onDistinguish: () => void;
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

const dialogTypes = [
  "showBanDialog",
  "showRemoveDialog",
  "showPurgeDialog",
  "showReportDialog",
  "showTransferCommunityDialog",
  "showAppointModDialog",
  "showAppointAdminDialog",
] as const;

type DialogType = (typeof dialogTypes)[number];

type ContentActionDropdownState = {
  banType?: BanType;
  purgeType?: PurgeType;
} & { [key in DialogType]: boolean };

export default class ContentActionDropdown extends Component<
  ContentActionDropdownProps,
  ContentActionDropdownState
> {
  state: ContentActionDropdownState = {
    showAppointAdminDialog: false,
    showAppointModDialog: false,
    showBanDialog: false,
    showPurgeDialog: false,
    showRemoveDialog: false,
    showReportDialog: false,
    showTransferCommunityDialog: false,
  };

  constructor(props: ContentActionDropdownProps, context: any) {
    super(props, context);

    this.toggleModDialogShow = this.toggleModDialogShow.bind(this);
    this.hideAllDialogs = this.hideAllDialogs.bind(this);
    this.toggleReportDialogShow = this.toggleReportDialogShow.bind(this);
    this.toggleRemoveShow = this.toggleRemoveShow.bind(this);
    this.toggleBanFromCommunityShow =
      this.toggleBanFromCommunityShow.bind(this);
    this.toggleBanFromSiteShow = this.toggleBanFromSiteShow.bind(this);
    this.togglePurgePersonShow = this.togglePurgePersonShow.bind(this);
    this.togglePurgeContentShow = this.togglePurgeContentShow.bind(this);
    this.toggleTransferCommunityShow =
      this.toggleTransferCommunityShow.bind(this);
    this.toggleAppointModShow = this.toggleAppointModShow.bind(this);
    this.toggleAppointAdminShow = this.toggleAppointAdminShow.bind(this);
    this.wrapHandler = this.wrapHandler.bind(this);
  }

  render() {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    const { onSave, type, onDelete, onBlock, onEdit, moderators } = this.props;
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
        {type === "comment" && (
          <ActionButton
            onClick={this.props.onReply}
            icon="reply1"
            inline
            label={I18NextService.i18n.t("reply")}
          />
        )}
        <ActionButton
          onClick={onSave}
          inline
          icon="star"
          label={I18NextService.i18n.t(saved ? "unsave" : "save")}
          iconClass={classNames({ "text-warning": saved })}
        />
        {type === "post" && (
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
                {type === "comment" && (
                  <li>
                    <Link
                      className="btn btn-link d-flex align-items-center rounded-0 dropdown-item"
                      to={`/create_private_message/${creator.id}`}
                      title={I18NextService.i18n.t("message")}
                      aria-label={I18NextService.i18n.t("message")}
                      data-tippy-content={I18NextService.i18n.t("message")}
                    >
                      <Icon icon="mail" inline classes="me-2" />
                      {I18NextService.i18n.t("message")}
                    </Link>
                  </li>
                )}
                <li>
                  <ActionButton
                    icon="flag"
                    label={I18NextService.i18n.t("create_report")}
                    onClick={this.toggleReportDialogShow}
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
                        icon={locked ? "unlock" : "lock"}
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
                        icon={
                          this.props.postView.post.featured_community
                            ? "pin-off"
                            : "pin"
                        }
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
                          icon={
                            this.props.postView.post.featured_local
                              ? "pin-off"
                              : "pin"
                          }
                        />
                      </li>
                    )}
                  </>
                )}
              </>
            )}
            {type === "comment" &&
              (this.canModOnSelf || this.canAdminOnSelf) && (
                <li>
                  <ActionButton
                    onClick={this.props.onDistinguish}
                    icon={
                      this.props.commentView.comment.distinguished
                        ? "shield-off"
                        : "shield"
                    }
                    label={I18NextService.i18n.t(
                      this.props.commentView.comment.distinguished
                        ? "undistinguish"
                        : "distinguish",
                    )}
                  />
                </li>
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
                  onClick={this.toggleRemoveShow}
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
                        onClick={this.toggleBanFromCommunityShow}
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
                        onClick={this.toggleAppointModShow}
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
                    onClick={this.toggleTransferCommunityShow}
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
                        onClick={this.toggleBanFromSiteShow}
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
                        onClick={this.togglePurgePersonShow}
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
                        onClick={this.togglePurgeContentShow}
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
                      onClick={this.toggleAppointAdminShow}
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
        {this.moderationDialogs}
      </>
    );
  }

  toggleModDialogShow(
    dialogType: DialogType,
    stateOverride: Partial<ContentActionDropdownState> = {},
  ) {
    this.setState(prev => ({
      ...prev,
      [dialogType]: !prev[dialogType],
      ...dialogTypes
        .filter(dt => dt !== dialogType)
        .reduce(
          (acc, dt) => ({
            ...acc,
            [dt]: false,
          }),
          {},
        ),
      ...stateOverride,
    }));
  }

  hideAllDialogs() {
    this.setState({
      showBanDialog: false,
      showPurgeDialog: false,
      showRemoveDialog: false,
      showReportDialog: false,
      showAppointAdminDialog: false,
      showAppointModDialog: false,
      showTransferCommunityDialog: false,
    });
  }

  toggleReportDialogShow() {
    this.toggleModDialogShow("showReportDialog");
  }

  toggleRemoveShow() {
    this.toggleModDialogShow("showRemoveDialog");
  }

  toggleBanFromCommunityShow() {
    this.toggleModDialogShow("showBanDialog", {
      banType: BanType.Community,
    });
  }

  toggleBanFromSiteShow() {
    this.toggleModDialogShow("showBanDialog", {
      banType: BanType.Site,
    });
  }

  togglePurgePersonShow() {
    this.toggleModDialogShow("showPurgeDialog", {
      purgeType: PurgeType.Person,
    });
  }

  togglePurgeContentShow() {
    this.toggleModDialogShow("showPurgeDialog", {
      purgeType:
        this.props.type === "post" ? PurgeType.Post : PurgeType.Comment,
    });
  }

  toggleTransferCommunityShow() {
    this.toggleModDialogShow("showTransferCommunityDialog");
  }

  toggleAppointModShow() {
    this.toggleModDialogShow("showAppointModDialog");
  }

  toggleAppointAdminShow() {
    this.toggleModDialogShow("showAppointAdminDialog");
  }

  get moderationDialogs() {
    const {
      showBanDialog,
      showPurgeDialog,
      showRemoveDialog,
      showReportDialog,
      banType,
      purgeType,
      showTransferCommunityDialog,
      showAppointModDialog,
      showAppointAdminDialog,
    } = this.state;
    const { removed, creator, creator_banned_from_community, community } =
      this.contentInfo;
    const {
      onReport,
      onRemove,
      onBanFromCommunity,
      onBanFromSite,
      onPurgeContent,
      onPurgeUser,
      onTransferCommunity,
      onAppointCommunityMod,
      onAppointAdmin,
      type,
    } = this.props;

    return (
      <>
        {showRemoveDialog && (
          <ModActionFormModal
            onSubmit={this.wrapHandler(onRemove)}
            modActionType={
              type === "comment" ? "remove-comment" : "remove-post"
            }
            isRemoved={removed}
            onCancel={this.hideAllDialogs}
            show={showRemoveDialog}
          />
        )}
        {showBanDialog && (
          <ModActionFormModal
            onSubmit={this.wrapHandler(
              banType === BanType.Community
                ? onBanFromCommunity
                : onBanFromSite,
            )}
            modActionType={
              banType === BanType.Community ? "community-ban" : "site-ban"
            }
            creator={creator}
            onCancel={this.hideAllDialogs}
            isBanned={
              banType === BanType.Community
                ? creator_banned_from_community
                : banType === BanType.Site
                  ? creator.banned
                  : false
            }
            community={community}
            show={showBanDialog}
          />
        )}
        {showReportDialog && (
          <ModActionFormModal
            onSubmit={this.wrapHandler(onReport)}
            modActionType={
              type === "comment" ? "report-comment" : "report-post"
            }
            onCancel={this.hideAllDialogs}
            show={showReportDialog}
          />
        )}
        {showPurgeDialog && (
          <ModActionFormModal
            onSubmit={this.wrapHandler(
              purgeType === PurgeType.Person ? onPurgeUser : onPurgeContent,
            )}
            modActionType={
              purgeType === PurgeType.Post
                ? "purge-post"
                : purgeType === PurgeType.Comment
                  ? "purge-comment"
                  : "purge-person"
            }
            creator={creator}
            onCancel={this.hideAllDialogs}
            show={showPurgeDialog}
          />
        )}
        {showTransferCommunityDialog && (
          <ConfirmationModal
            show={showTransferCommunityDialog}
            message="Are you sure you want to transfer the community x to y?"
            onNo={this.hideAllDialogs}
            onYes={this.wrapHandler(onTransferCommunity)}
          />
        )}
        {showAppointModDialog && (
          <ConfirmationModal
            show={showAppointModDialog}
            message="Are you sure you want to appoint x as a moderator for y??"
            onNo={this.hideAllDialogs}
            onYes={this.wrapHandler(onAppointCommunityMod)}
          />
        )}
        {showAppointAdminDialog && (
          <ConfirmationModal
            show={showAppointAdminDialog}
            message="Are you sure you want to appoint x as an admin for y??"
            onNo={this.hideAllDialogs}
            onYes={this.wrapHandler(onAppointAdmin)}
          />
        )}
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
    const { creator } = this.contentInfo;

    return (
      creator.id === UserService.Instance.myUserInfo?.local_user_view.person.id
    );
  }

  get canMod() {
    const { creator } = this.contentInfo;
    return canMod(creator.id, this.props.moderators, this.props.admins);
  }

  get canAdmin() {
    const { creator } = this.contentInfo;
    return canAdmin(creator.id, this.props.admins);
  }

  get canModOnSelf() {
    const { creator } = this.contentInfo;
    return canMod(
      creator.id,
      this.props.moderators,
      this.props.admins,
      UserService.Instance.myUserInfo,
      true,
    );
  }

  get canAdminOnSelf() {
    const { creator } = this.contentInfo;
    return canAdmin(
      creator.id,
      this.props.admins,
      UserService.Instance.myUserInfo,
      true,
    );
  }

  get id() {
    return this.props.type === "post"
      ? this.props.postView.creator.id
      : this.props.commentView.creator.id;
  }

  wrapHandler(handler: (arg?: any) => void) {
    return (arg?: any) => {
      handler(arg);
      this.hideAllDialogs();
    };
  }
}
