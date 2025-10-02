import { Component } from "inferno";
import { I18NextService } from "../../../services";
import { Icon } from "../icon";
import CrossPostButton from "./cross-post-button";
import {
  Community,
  CommunityModeratorView,
  MyUserInfo,
  NotePerson,
  PersonView,
  PostView,
} from "lemmy-js-client";
import { amAdmin, amCommunityCreator, amMod, canAdmin } from "@utils/roles";
import ActionButton from "./action-button";
import classNames from "classnames";
import { Link } from "inferno-router";
import ConfirmationModal from "../modal/confirmation-modal";
import ViewVotesModal from "../modal/view-votes-modal";
import ModActionFormModal, {
  BanUpdateForm,
} from "../modal/mod-action-form-modal";
import {
  BanType,
  CommentNodeView,
  CrossPostParams,
  PurgeType,
} from "@utils/types";
import { getApubName, hostname } from "@utils/helpers";
import { tippyMixin } from "../../mixins/tippy-mixin";
import PersonNoteModal from "../modal/person-note-modal";
import { userNotLoggedInOrBanned } from "@utils/app";

interface ContentActionDropdownPropsBase {
  onSave: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onReport: (reason: string) => Promise<void>;
  onBlock: () => Promise<void>;
  onRemove: (reason: string) => Promise<void>;
  onBanFromCommunity: (form: BanUpdateForm) => Promise<void>;
  onAppointCommunityMod: () => Promise<void>;
  onTransferCommunity: () => Promise<void>;
  onBanFromSite: (form: BanUpdateForm) => Promise<void>;
  onPurgeContent: (reason: string) => Promise<void>;
  onPurgeUser: (reason: string) => Promise<void>;
  onAppointAdmin: () => Promise<void>;
  onPersonNote: (form: NotePerson) => Promise<void>;
  onLock: (reason: string) => Promise<void>;
  moderators?: CommunityModeratorView[];
  admins: PersonView[];
  community: Community;
  myUserInfo: MyUserInfo | undefined;
}

export type ContentCommentProps = {
  type: "comment";
  commentView: CommentNodeView;
  onReply: () => void;
  onDistinguish: () => Promise<void>;
} & ContentActionDropdownPropsBase;

export type ContentPostProps = {
  type: "post";
  postView: PostView;
  crossPostParams: CrossPostParams;
  onFeatureLocal: () => Promise<void>;
  onFeatureCommunity: () => Promise<void>;
  onHidePost: () => Promise<void>;
} & ContentActionDropdownPropsBase;

type ContentActionDropdownProps = ContentCommentProps | ContentPostProps;

type DialogType =
  | "BanDialog"
  | "RemoveDialog"
  | "PurgeDialog"
  | "ReportDialog"
  | "TransferCommunityDialog"
  | "AppointModDialog"
  | "AppointAdminDialog"
  | "ViewVotesDialog"
  | "PersonNoteDialog"
  | "LockDialog";

type ActionTypeState = {
  banType?: BanType;
  purgeType?: PurgeType;
};

type ShowState = {
  [key in `show${DialogType}`]: boolean;
};

type RenderState = {
  [key in `render${DialogType}`]: boolean;
};

type DropdownState = { dropdownOpenedOnce: boolean };

type ContentActionDropdownState = ActionTypeState &
  ShowState &
  RenderState &
  DropdownState;

@tippyMixin
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
    showViewVotesDialog: false,
    showPersonNoteDialog: false,
    showLockDialog: false,
    renderAppointAdminDialog: false,
    renderAppointModDialog: false,
    renderBanDialog: false,
    renderPurgeDialog: false,
    renderRemoveDialog: false,
    renderReportDialog: false,
    renderTransferCommunityDialog: false,
    renderViewVotesDialog: false,
    renderPersonNoteDialog: false,
    renderLockDialog: false,
    dropdownOpenedOnce: false,
  };

  constructor(props: ContentActionDropdownProps, context: any) {
    super(props, context);

    this.toggleDialogShow = this.toggleDialogShow.bind(this);
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
    this.toggleViewVotesShow = this.toggleViewVotesShow.bind(this);
    this.togglePersonNoteShow = this.togglePersonNoteShow.bind(this);
    this.toggleLockShow = this.toggleLockShow.bind(this);
    this.wrapHandler = this.wrapHandler.bind(this);
    this.handleDropdownToggleClick = this.handleDropdownToggleClick.bind(this);
  }

  render() {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    const { onSave, type, onDelete, onBlock, onEdit, moderators } = this.props;
    const {
      id,
      saved_at,
      hidden_at,
      deleted,
      locked,
      removed,
      creator_banned_from_community,
      creator,
      creator_is_admin,
      creator_is_moderator,
      creator_banned,
    } = this.contentInfo;
    const dropdownId =
      type === "post"
        ? `post-actions-dropdown-${id}`
        : `comment-actions-dropdown-${id}`;
    const showToggleAdmin = !creator_banned && creator.local;
    const canAppointCommunityMod =
      (amMod(
        this.props.type === "comment"
          ? this.props.commentView
          : this.props.postView,
      ) ||
        (amAdmin(this.props.myUserInfo) && this.props.community.local)) &&
      !creator_banned_from_community;

    const modHistoryUserTranslation = I18NextService.i18n.t(
      "user_moderation_history",
      { user: creator.name },
    );

    // The link and translation string for the item
    const { modHistoryItemLink, modHistoryItemTranslation } =
      type === "post"
        ? {
            modHistoryItemLink: `/modlog?postId=${id}`,
            modHistoryItemTranslation: I18NextService.i18n.t(
              "post_moderation_history",
            ),
          }
        : {
            modHistoryItemLink: `/modlog?commentId=${id}`,
            modHistoryItemTranslation: I18NextService.i18n.t(
              "comment_moderation_history",
            ),
          };
    return (
      <>
        {type === "comment" && (
          <ActionButton
            onClick={this.props.onReply}
            icon="reply1"
            inline
            label={I18NextService.i18n.t("reply")}
            noLoading
            disabled={
              this.props.commentView.comment.deleted ||
              this.props.commentView.comment.removed ||
              this.props.commentView.comment.locked
            }
          />
        )}
        <ActionButton
          onClick={onSave}
          inline
          icon="bookmark"
          label={I18NextService.i18n.t(saved_at ? "unsave" : "save")}
          iconClass={classNames({ "text-warning": saved_at })}
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
            onClick={this.handleDropdownToggleClick}
          >
            <Icon icon="more-vertical" inline />
          </button>

          <ul className="dropdown-menu" id={dropdownId}>
            {this.state.dropdownOpenedOnce && (
              <>
                {type === "post" && (
                  <li>
                    <ActionButton
                      icon={hidden_at ? "eye" : "eye-slash"}
                      label={I18NextService.i18n.t(
                        hidden_at ? "unhide_post" : "hide_post",
                      )}
                      onClick={this.props.onHidePost}
                    />
                  </li>
                )}
                {this.amCreator &&
                !userNotLoggedInOrBanned(this.props.myUserInfo) ? (
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
                          className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
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
                        icon="edit"
                        label={I18NextService.i18n.t("create_user_note")}
                        onClick={this.togglePersonNoteShow}
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

                {(amMod(
                  this.props.type === "comment"
                    ? this.props.commentView
                    : this.props.postView,
                ) ||
                  amAdmin(this.props.myUserInfo)) && (
                  <>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <ActionButton
                        onClick={this.toggleViewVotesShow}
                        label={I18NextService.i18n.t("view_votes")}
                        icon={"arrow-up"}
                        noLoading
                      />
                    </li>
                    {type === "post" && (
                      <>
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
                        {amAdmin(this.props.myUserInfo) && (
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
                  this.amCreator &&
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
                <li>
                  <Link
                    className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
                    to={`/modlog?userId=${creator.id}`}
                    title={modHistoryUserTranslation}
                    aria-label={modHistoryUserTranslation}
                    data-tippy-content={modHistoryUserTranslation}
                  >
                    <Icon icon="history" inline classes="me-2" />
                    {modHistoryUserTranslation}
                  </Link>
                  <Link
                    className="btn btn-link btn-sm d-flex align-items-center rounded-0 dropdown-item"
                    to={modHistoryItemLink}
                    title={modHistoryItemTranslation}
                    aria-label={modHistoryItemTranslation}
                    data-tippy-content={modHistoryItemTranslation}
                  >
                    <Icon icon="history" inline classes="me-2" />
                    {modHistoryItemTranslation}
                  </Link>
                </li>
                {(this.canMod || this.canAdmin) && (
                  <>
                    <li>
                      <ActionButton
                        label={
                          removed
                            ? `${I18NextService.i18n.t(
                                type === "post"
                                  ? "restore_post"
                                  : "restore_comment",
                              )}`
                            : I18NextService.i18n.t(
                                type === "post"
                                  ? "remove_post"
                                  : "remove_comment",
                              )
                        }
                        icon={removed ? "restore" : "x"}
                        noLoading
                        onClick={this.toggleRemoveShow}
                        iconClass={`text-${removed ? "success" : "danger"}`}
                      />
                    </li>
                    <li>
                      <ActionButton
                        noLoading
                        onClick={this.toggleLockShow}
                        label={I18NextService.i18n.t(
                          locked
                            ? type === "post"
                              ? "unlock_post"
                              : "unlock_comment"
                            : type === "post"
                              ? "lock_post"
                              : "lock_comment",
                        )}
                        icon={locked ? "unlock" : "lock"}
                      />
                    </li>
                  </>
                )}
                {this.canMod &&
                  (!creator_is_moderator || canAppointCommunityMod) && (
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
                                ? "unban_from_community"
                                : "ban_from_community",
                            )}
                            icon={
                              creator_banned_from_community ? "unban" : "ban"
                            }
                            noLoading
                            iconClass={`text-${
                              creator_banned_from_community
                                ? "success"
                                : "danger"
                            }`}
                          />
                        </li>
                      )}
                      {canAppointCommunityMod && (
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
                            noLoading
                          />
                        </li>
                      )}
                    </>
                  )}
                {(amCommunityCreator(
                  creator.id,
                  moderators,
                  this.props.myUserInfo,
                ) ||
                  this.canAdmin) &&
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
                              creator_banned
                                ? "unban_from_site"
                                : "ban_from_site",
                            )}
                            onClick={this.toggleBanFromSiteShow}
                            icon={creator_banned ? "unban" : "ban"}
                            iconClass={`text-${
                              creator_banned ? "success" : "danger"
                            }`}
                            noLoading
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
                          noLoading
                        />
                      </li>
                    )}
                  </>
                )}
              </>
            )}
          </ul>
        </div>
        {this.allDialogs}
      </>
    );
  }

  handleDropdownToggleClick() {
    // This only renders the dropdown. Bootstrap handles the show/hide part.
    this.setState({ dropdownOpenedOnce: true });
  }

  toggleDialogShow(
    dialogType: DialogType,
    stateOverride: Partial<ActionTypeState> = {},
  ) {
    const showKey: keyof ShowState = `show${dialogType}`;
    const renderKey: keyof RenderState = `render${dialogType}`;
    this.setState<keyof ShowState>({
      showBanDialog: false,
      showRemoveDialog: false,
      showPurgeDialog: false,
      showReportDialog: false,
      showTransferCommunityDialog: false,
      showAppointModDialog: false,
      showAppointAdminDialog: false,
      showViewVotesDialog: false,
      showPersonNoteDialog: false,
      showLockDialog: false,
      [showKey]: !this.state[showKey],
      [renderKey]: true, // for fade out just keep rendering after show becomes false
      ...stateOverride,
    });
  }

  hideAllDialogs() {
    this.setState<keyof ShowState>({
      showBanDialog: false,
      showPurgeDialog: false,
      showRemoveDialog: false,
      showReportDialog: false,
      showAppointAdminDialog: false,
      showAppointModDialog: false,
      showTransferCommunityDialog: false,
      showViewVotesDialog: false,
      showPersonNoteDialog: false,
      showLockDialog: false,
    });
  }

  toggleReportDialogShow() {
    this.toggleDialogShow("ReportDialog");
  }

  toggleRemoveShow() {
    this.toggleDialogShow("RemoveDialog");
  }

  toggleBanFromCommunityShow() {
    this.toggleDialogShow("BanDialog", {
      banType: BanType.Community,
    });
  }

  toggleBanFromSiteShow() {
    this.toggleDialogShow("BanDialog", {
      banType: BanType.Site,
    });
  }

  togglePurgePersonShow() {
    this.toggleDialogShow("PurgeDialog", {
      purgeType: PurgeType.Person,
    });
  }

  togglePurgeContentShow() {
    this.toggleDialogShow("PurgeDialog", {
      purgeType:
        this.props.type === "post" ? PurgeType.Post : PurgeType.Comment,
    });
  }

  toggleTransferCommunityShow() {
    this.toggleDialogShow("TransferCommunityDialog");
  }

  toggleAppointModShow() {
    this.toggleDialogShow("AppointModDialog");
  }

  toggleAppointAdminShow() {
    this.toggleDialogShow("AppointAdminDialog");
  }

  toggleViewVotesShow() {
    this.toggleDialogShow("ViewVotesDialog");
  }

  togglePersonNoteShow() {
    this.toggleDialogShow("PersonNoteDialog");
  }

  toggleLockShow() {
    this.toggleDialogShow("LockDialog");
  }

  get allDialogs() {
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
      showViewVotesDialog,
      showPersonNoteDialog,
      showLockDialog,
      renderBanDialog,
      renderPurgeDialog,
      renderRemoveDialog,
      renderReportDialog,
      renderTransferCommunityDialog,
      renderAppointModDialog,
      renderAppointAdminDialog,
      renderViewVotesDialog,
      renderPersonNoteDialog,
      renderLockDialog,
    } = this.state;
    const {
      removed,
      locked,
      creator,
      creator_banned_from_community,
      creator_is_admin,
      creator_is_moderator,
      creator_banned,
      id,
      person_actions,
    } = this.contentInfo;
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
      onPersonNote,
      onLock,
      type,
      community,
    } = this.props;

    return (
      <>
        {renderRemoveDialog && (
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
        {renderBanDialog && (
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
                ? !!creator_banned_from_community
                : banType === BanType.Site
                  ? creator_banned
                  : false
            }
            community={community}
            show={showBanDialog}
          />
        )}
        {renderReportDialog && (
          <ModActionFormModal
            onSubmit={this.wrapHandler(onReport)}
            modActionType={
              type === "comment" ? "report-comment" : "report-post"
            }
            onCancel={this.hideAllDialogs}
            show={showReportDialog}
          />
        )}
        {renderPurgeDialog && (
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
        {renderTransferCommunityDialog && (
          <ConfirmationModal
            show={showTransferCommunityDialog}
            message={I18NextService.i18n.t("transfer_community_are_you_sure", {
              user: getApubName(creator),
              community: getApubName(community),
            })}
            loadingMessage={I18NextService.i18n.t("transferring_community")}
            onNo={this.hideAllDialogs}
            onYes={this.wrapHandler(onTransferCommunity)}
          />
        )}
        {renderAppointModDialog && (
          <ConfirmationModal
            show={showAppointModDialog}
            message={I18NextService.i18n.t(
              creator_is_moderator
                ? "remove_as_mod_are_you_sure"
                : "appoint_as_mod_are_you_sure",
              {
                user: getApubName(creator),
                community: getApubName(community),
              },
            )}
            loadingMessage={I18NextService.i18n.t(
              creator_is_moderator ? "removing_mod" : "appointing_mod",
            )}
            onNo={this.hideAllDialogs}
            onYes={this.wrapHandler(onAppointCommunityMod)}
          />
        )}
        {renderAppointAdminDialog && (
          <ConfirmationModal
            show={showAppointAdminDialog}
            message={I18NextService.i18n.t(
              creator_is_admin
                ? "remove_as_admin_are_you_sure"
                : "appoint_as_admin_are_you_sure",
              {
                user: getApubName(creator),
                instance: hostname(creator.ap_id),
              },
            )}
            loadingMessage={I18NextService.i18n.t(
              creator_is_admin ? "removing_admin" : "appointing_admin",
            )}
            onNo={this.hideAllDialogs}
            onYes={this.wrapHandler(onAppointAdmin)}
          />
        )}
        {renderViewVotesDialog && (
          <ViewVotesModal
            type={type}
            id={id}
            show={showViewVotesDialog}
            onCancel={this.hideAllDialogs}
            myUserInfo={this.props.myUserInfo}
          />
        )}
        {renderPersonNoteDialog && (
          <PersonNoteModal
            note={person_actions?.note}
            personId={creator.id}
            show={showPersonNoteDialog}
            onSubmit={this.wrapHandler(onPersonNote)}
            onCancel={this.hideAllDialogs}
          />
        )}
        {renderLockDialog && (
          <ModActionFormModal
            onSubmit={this.wrapHandler(onLock)}
            modActionType={type === "post" ? "lock-post" : "lock-comment"}
            onCancel={this.hideAllDialogs}
            show={showLockDialog}
            isLocked={locked}
          />
        )}
      </>
    );
  }

  get contentInfo() {
    if (this.props.type === "post") {
      const {
        post: { id, deleted, locked, removed },
        post_actions: { saved_at, hidden_at } = {},
        creator,
        creator_banned_from_community,
        creator_is_moderator,
        community,
        creator_is_admin,
        creator_banned,
        person_actions,
      } = this.props.postView;

      return {
        id,
        saved_at,
        hidden_at,
        deleted,
        creator,
        locked,
        removed,
        creator_banned_from_community,
        community,
        creator_is_admin,
        creator_is_moderator,
        creator_banned,
        person_actions,
      };
    } else {
      const {
        comment: { id, deleted, removed, locked },
        comment_actions: { saved_at } = {},
        creator,
        creator_banned_from_community,
        creator_is_moderator,
        creator_is_admin,
        creator_banned,
        person_actions,
      } = this.props.commentView;

      return {
        id,
        saved_at,
        deleted,
        creator,
        locked,
        removed,
        creator_banned_from_community,
        creator_is_admin,
        creator_is_moderator,
        creator_banned,
        person_actions,
      };
    }
  }

  get amCreator() {
    const { creator } = this.contentInfo;

    return creator.id === this.props.myUserInfo?.local_user_view.person.id;
  }

  get canMod() {
    const { creator } = this.contentInfo;
    if (canAdmin(creator.id, this.props.admins, this.props.myUserInfo)) {
      return true;
    }
    if (this.props.type === "comment") {
      return this.props.commentView.can_mod;
    }
    return this.props.postView.can_mod;
  }

  get canAdmin() {
    const { creator } = this.contentInfo;
    return canAdmin(creator.id, this.props.admins, this.props.myUserInfo);
  }

  get canModOnSelf() {
    const { creator } = this.contentInfo;
    if (this.props.myUserInfo?.local_user_view.person.id !== creator.id) {
      return false;
    }
    return this.canMod;
  }

  get canAdminOnSelf() {
    const { creator } = this.contentInfo;
    return canAdmin(creator.id, this.props.admins, this.props.myUserInfo, true);
  }

  wrapHandler(handler: (arg?: any) => Promise<void>) {
    return async (arg?: any) => {
      await handler(arg);
      this.hideAllDialogs();
    };
  }
}
