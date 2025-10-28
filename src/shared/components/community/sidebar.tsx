import { getQueryString, hostname } from "@utils/helpers";
import { amAdmin, amMod, amTopMod } from "@utils/roles";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddModToCommunity,
  BlockCommunity,
  CommunityModeratorView,
  CommunityNotificationsMode,
  CommunityView,
  DeleteCommunity,
  EditCommunity,
  FollowCommunity,
  Language,
  MyUserInfo,
  PersonView,
  PurgeCommunity,
  RemoveCommunity,
  UpdateCommunityNotifications,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { HttpService, I18NextService } from "../../services";
import { Badges } from "../common/badges";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { SubscribeButton } from "../common/subscribe-button";
import { CommunityForm } from "../community/community-form";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import CommunityReportModal from "@components/common/modal/community-report-modal";
import { CommunityNotificationSelect } from "@components/common/notification-select";
import { LanguageList } from "@components/common/language-list";
import { NoOptionI18nKeys } from "i18next";
import { canViewCommunity } from "@utils/app";

interface SidebarProps {
  community_view: CommunityView;
  moderators: CommunityModeratorView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  enableNsfw?: boolean;
  showIcon?: boolean;
  editable?: boolean;
  hideButtons?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onDeleteCommunity(form: DeleteCommunity): void;
  onRemoveCommunity(form: RemoveCommunity): void;
  onLeaveModTeam(form: AddModToCommunity): void;
  onFollowCommunity(form: FollowCommunity): void;
  onBlockCommunity(form: BlockCommunity): void;
  onPurgeCommunity(form: PurgeCommunity): void;
  onEditCommunity(form: EditCommunity): void;
  onUpdateCommunityNotifs(form: UpdateCommunityNotifications): void;
}

interface SidebarState {
  removeReason?: string;
  removeExpires?: string;
  showEdit: boolean;
  showRemoveDialog: boolean;
  showPurgeDialog: boolean;
  purgeReason?: string;
  showConfirmLeaveModTeam: boolean;
  deleteCommunityLoading: boolean;
  removeCommunityLoading: boolean;
  leaveModTeamLoading: boolean;
  followCommunityLoading: boolean;
  purgeCommunityLoading: boolean;
  showCommunityReportModal: boolean;
  renderCommunityReportModal: boolean;
  searchText: string;
  notifications: CommunityNotificationsMode;
}

@tippyMixin
export class Sidebar extends Component<SidebarProps, SidebarState> {
  state: SidebarState = {
    showEdit: false,
    showRemoveDialog: false,
    showPurgeDialog: false,
    showConfirmLeaveModTeam: false,
    deleteCommunityLoading: false,
    removeCommunityLoading: false,
    leaveModTeamLoading: false,
    followCommunityLoading: false,
    purgeCommunityLoading: false,
    showCommunityReportModal: false,
    renderCommunityReportModal: false,
    searchText: "",
    notifications: "replies_and_mentions",
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleEditCancel = this.handleEditCancel.bind(this);
    this.handleSubmitCommunityReport =
      this.handleSubmitCommunityReport.bind(this);
    this.handleHideCommunityReportModal =
      this.handleHideCommunityReportModal.bind(this);
    this.handleNotificationChange = this.handleNotificationChange.bind(this);
    this.state.notifications =
      this.props.community_view.community_actions?.notifications ??
      "replies_and_mentions";
  }

  unlisten = () => {};

  componentWillMount() {
    // Leave edit mode on navigation
    this.unlisten = this.context.router.history.listen(() => {
      if (this.state.showEdit) {
        this.setState({ showEdit: false });
      }
    });
  }

  componentWillUnmount(): void {
    this.unlisten();
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & SidebarProps>,
  ): void {
    if (this.props.moderators !== nextProps.moderators) {
      this.setState({
        showConfirmLeaveModTeam: false,
      });
    }

    if (this.props.community_view !== nextProps.community_view) {
      this.setState({
        showEdit: false,
        showPurgeDialog: false,
        showRemoveDialog: false,
        deleteCommunityLoading: false,
        removeCommunityLoading: false,
        leaveModTeamLoading: false,
        followCommunityLoading: false,
        purgeCommunityLoading: false,
      });
    }
  }

  render() {
    return (
      <div className="community-sidebar">
        {!this.state.showEdit ? (
          this.sidebar()
        ) : (
          <CommunityForm
            community_view={this.props.community_view}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            communityLanguages={this.props.communityLanguages}
            onUpsertCommunity={this.props.onEditCommunity}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
            myUserInfo={this.props.myUserInfo}
          />
        )}
      </div>
    );
  }

  sidebar() {
    const {
      community: {
        name,
        ap_id,
        id,
        description,
        posting_restricted_to_mods,
        visibility,
      },
      community_actions: { received_ban_at } = {},
    } = this.props.community_view;

    const visibilityLabel = ("community_visibility_" +
      visibility) as NoOptionI18nKeys;
    const visibilityDescription = (visibilityLabel +
      "_desc") as NoOptionI18nKeys;
    const canViewCommunity_ = canViewCommunity(this.props.community_view);
    return (
      <aside className="mb-3">
        <div id="sidebarContainer">
          {!this.props.hideButtons && (
            <section id="sidebarMain" className="card mb-3">
              <div className="card-body">
                {this.communityTitle()}
                {description && <h6>{description}</h6>}
                {this.props.editable && this.adminButtons()}
                {received_ban_at && (
                  <div
                    className="alert alert-danger text-sm-start text-xs-center mt-2"
                    role="alert"
                  >
                    <Icon
                      icon="ban"
                      inline
                      classes="me-sm-2 mx-auto d-sm-inline d-block"
                    />
                    <T
                      i18nKey="banned_from_community_blurb"
                      className="d-inline"
                    >
                      #<strong className="fw-bold">#</strong>#
                    </T>
                  </div>
                )}
                {!received_ban_at && (
                  <>
                    <SubscribeButton
                      communityView={this.props.community_view}
                      onFollow={linkEvent(this, this.handleFollowCommunity)}
                      onUnFollow={linkEvent(this, this.handleUnfollowCommunity)}
                      loading={this.state.followCommunityLoading}
                      showRemoteFetch={!this.props.myUserInfo}
                    />
                    {this.canPost && canViewCommunity_ && this.createPost()}
                  </>
                )}
                <>
                  {this.props.myUserInfo && this.blockCommunity()}
                  {canViewCommunity_ && (
                    <>
                      <div className="mb-2 d-flex">
                        <CommunityNotificationSelect
                          current={this.state.notifications}
                          onChange={this.handleNotificationChange}
                        />
                      </div>
                      <form
                        className="d-flex"
                        onSubmit={linkEvent(this, this.handleSearchSubmit)}
                      >
                        <input
                          name="q"
                          type="search"
                          className="form-control flex-initial"
                          placeholder={`${I18NextService.i18n.t("search")}...`}
                          aria-label={I18NextService.i18n.t("search")}
                          onInput={linkEvent(this, this.handleSearchChange)}
                          required
                          minLength={1}
                        />
                        <button
                          type="submit"
                          className="btn btn-outline-secondary ms-1"
                        >
                          <Icon icon="search" />
                        </button>
                      </form>
                    </>
                  )}
                </>
                {!this.props.myUserInfo && (
                  <div className="alert alert-info" role="alert">
                    <T
                      i18nKey="community_not_logged_in_alert"
                      interpolation={{
                        community: name,
                        instance: hostname(ap_id),
                      }}
                    >
                      #<code className="user-select-all">#</code>#
                    </T>
                  </div>
                )}
              </div>
            </section>
          )}
          <section id="sidebarInfo" className="card mb-3">
            <div className="card-body">
              {posting_restricted_to_mods && (
                <div
                  className="alert alert-warning text-sm-start text-xs-center"
                  role="alert"
                >
                  <Icon
                    icon="lock"
                    inline
                    classes="me-sm-2 mx-auto d-sm-inline d-block"
                  />
                  <T i18nKey="community_locked_message" className="d-inline">
                    #<strong className="fw-bold">#</strong>#
                  </T>
                </div>
              )}
              {this.sidebarMarkdown()}
              <div>
                <div className="fw-semibold mb-1">
                  <span className="align-middle">
                    {I18NextService.i18n.t("community_visibility")}:&nbsp;
                  </span>
                  <span className="fs-5 fw-medium align-middle">
                    {I18NextService.i18n.t(visibilityLabel)}
                  </span>
                </div>
                <p>{I18NextService.i18n.t(visibilityDescription)}</p>
              </div>
              <LanguageList
                allLanguages={this.props.allLanguages}
                languageIds={this.props.siteLanguages}
              />
              <Badges
                communityId={id}
                subject={this.props.community_view.community}
              />
              {this.mods()}
            </div>
          </section>
        </div>
      </aside>
    );
  }

  communityTitle() {
    const community = this.props.community_view.community;

    return (
      <div>
        <h2 className="h5 mb-0">
          {this.props.showIcon && !community.removed && (
            <BannerIconHeader icon={community.icon} banner={community.banner} />
          )}
          <span className="me-2">
            <CommunityLink
              community={community}
              hideAvatar
              myUserInfo={this.props.myUserInfo}
            />
          </span>
          {community.removed && (
            <small className="me-2 text-muted fst-italic">
              {I18NextService.i18n.t("removed")}
            </small>
          )}
          {community.deleted && (
            <small className="me-2 text-muted fst-italic">
              {I18NextService.i18n.t("deleted")}
            </small>
          )}
          {community.nsfw && (
            <small className="me-2 text-muted fst-italic">
              {I18NextService.i18n.t("nsfw")}
            </small>
          )}
        </h2>
        <CommunityLink
          community={community}
          realLink
          useApubName
          muted
          hideAvatar
          myUserInfo={this.props.myUserInfo}
        />
      </div>
    );
  }

  mods() {
    if (!this.props.moderators.length) {
      return;
    }

    return (
      <ul className="list-inline small">
        <li className="list-inline-item">{I18NextService.i18n.t("mods")}: </li>
        {this.props.moderators.map(mod => (
          <li key={mod.moderator.id} className="list-inline-item">
            <PersonListing
              person={mod.moderator}
              myUserInfo={this.props.myUserInfo}
            />
          </li>
        ))}
      </ul>
    );
  }

  createPost() {
    const cv = this.props.community_view;
    return (
      <Link
        className={`btn btn-secondary d-block mb-2 w-100 ${
          cv.community.deleted || cv.community.removed ? "no-click" : ""
        }`}
        to={
          "/create_post" +
          getQueryString({ communityId: cv.community.id.toString() })
        }
      >
        {I18NextService.i18n.t("create_a_post")}
      </Link>
    );
  }

  blockCommunity() {
    const { community_actions: { follow_state: subscribed, blocked_at } = {} } =
      this.props.community_view;

    return (
      !subscribed && (
        <button
          className="btn btn-danger d-block mb-2 w-100"
          onClick={linkEvent(this, this.handleBlockCommunity)}
        >
          {I18NextService.i18n.t(
            blocked_at ? "unblock_community" : "block_community",
          )}
        </button>
      )
    );
  }

  sidebarMarkdown() {
    const { sidebar } = this.props.community_view.community;
    return (
      sidebar && (
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(sidebar, () => this.forceUpdate())}
        />
      )
    );
  }

  adminButtons() {
    const community_view = this.props.community_view;
    return (
      <>
        <ul className="list-inline mb-1 text-muted fw-bold">
          {amMod(this.props.community_view) && (
            <>
              <li className="list-inline-item-action">
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleEditClick)}
                  data-tippy-content={I18NextService.i18n.t("edit")}
                  aria-label={I18NextService.i18n.t("edit")}
                >
                  <Icon icon="edit" classes="icon-inline" />
                </button>
              </li>
              {!amTopMod(this.props.moderators, this.props.myUserInfo) &&
                (!this.state.showConfirmLeaveModTeam ? (
                  <li className="list-inline-item-action">
                    <button
                      className="btn btn-link text-muted d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleShowConfirmLeaveModTeamClick,
                      )}
                    >
                      {I18NextService.i18n.t("leave_mod_team")}
                    </button>
                  </li>
                ) : (
                  <>
                    <li className="list-inline-item-action">
                      {I18NextService.i18n.t("are_you_sure")}
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(this, this.handleLeaveModTeam)}
                      >
                        {I18NextService.i18n.t("yes")}
                      </button>
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(
                          this,
                          this.handleCancelLeaveModTeamClick,
                        )}
                      >
                        {I18NextService.i18n.t("no")}
                      </button>
                    </li>
                  </>
                ))}
              {amTopMod(this.props.moderators, this.props.myUserInfo) && (
                <li className="list-inline-item-action">
                  <button
                    className="btn btn-link text-muted d-inline-block"
                    onClick={linkEvent(this, this.handleDeleteCommunity)}
                    data-tippy-content={
                      !community_view.community.deleted
                        ? I18NextService.i18n.t("delete")
                        : I18NextService.i18n.t("restore")
                    }
                    aria-label={
                      !community_view.community.deleted
                        ? I18NextService.i18n.t("delete")
                        : I18NextService.i18n.t("restore")
                    }
                  >
                    {this.state.deleteCommunityLoading ? (
                      <Spinner />
                    ) : (
                      <Icon
                        icon="trash"
                        classes={`icon-inline ${
                          community_view.community.deleted && "text-danger"
                        }`}
                      />
                    )}{" "}
                  </button>
                </li>
              )}
            </>
          )}
          {amAdmin(this.props.myUserInfo) && (
            <li className="list-inline-item">
              {!this.props.community_view.community.removed ? (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleModRemoveShow)}
                >
                  {I18NextService.i18n.t("remove")}
                </button>
              ) : (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleRemoveCommunity)}
                >
                  {this.state.removeCommunityLoading ? (
                    <Spinner />
                  ) : (
                    I18NextService.i18n.t("restore")
                  )}
                </button>
              )}
              <button
                className="btn btn-link text-muted d-inline-block"
                onClick={linkEvent(this, this.handlePurgeCommunityShow)}
                aria-label={I18NextService.i18n.t("purge_community")}
              >
                {I18NextService.i18n.t("purge_community")}
              </button>
            </li>
          )}
          <li className="list-inline-item-action">
            <button
              className="btn btn-link text-muted d-inline-block"
              onClick={linkEvent(this, this.handleShowCommunityReportModal)}
            >
              {I18NextService.i18n.t("create_report")}
            </button>
            {this.state.renderCommunityReportModal && (
              <CommunityReportModal
                onSubmit={this.handleSubmitCommunityReport}
                onCancel={this.handleHideCommunityReportModal}
                show={this.state.showCommunityReportModal}
              />
            )}
          </li>
        </ul>
        {this.state.showRemoveDialog && (
          <form onSubmit={linkEvent(this, this.handleRemoveCommunity)}>
            <div className="input-group mb-3">
              <label className="col-form-label" htmlFor="remove-reason">
                {I18NextService.i18n.t("reason")}
              </label>
              <input
                type="text"
                id="remove-reason"
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("optional")}
                value={this.state.removeReason}
                onInput={linkEvent(this, this.handleModRemoveReasonChange)}
              />
            </div>
            {/* TODO hold off on expires for now */}
            {/* <div class="mb-3 row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control me-2" placeholder={I18NextService.i18n.t('expires')} value={this.state.removeExpires} onInput={linkEvent(this, this.handleModRemoveExpiresChange)} /> */}
            {/* </div> */}
            <div className="input-group mb-3">
              <button type="submit" className="btn btn-secondary">
                {this.state.removeCommunityLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t("remove_community")
                )}
              </button>
            </div>
          </form>
        )}
        {this.state.showPurgeDialog && (
          <form onSubmit={linkEvent(this, this.handlePurgeCommunity)}>
            <div className="input-group mb-3">
              <PurgeWarning />
            </div>
            <div className="input-group mb-3">
              <label className="visually-hidden" htmlFor="purge-reason">
                {I18NextService.i18n.t("reason")}
              </label>
              <input
                type="text"
                id="purge-reason"
                className="form-control me-2"
                placeholder={I18NextService.i18n.t("reason")}
                value={this.state.purgeReason}
                onInput={linkEvent(this, this.handlePurgeReasonChange)}
              />
            </div>
            <div className="input-group mb-3">
              {this.state.purgeCommunityLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary"
                  aria-label={I18NextService.i18n.t("purge_community")}
                >
                  {I18NextService.i18n.t("purge_community")}
                </button>
              )}
            </div>
          </form>
        )}
      </>
    );
  }

  handleEditClick(i: Sidebar) {
    i.setState({ showEdit: true });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  handleShowConfirmLeaveModTeamClick(i: Sidebar) {
    i.setState({ showConfirmLeaveModTeam: true });
  }

  handleCancelLeaveModTeamClick(i: Sidebar) {
    i.setState({ showConfirmLeaveModTeam: false });
  }

  handleShowCommunityReportModal(i: Sidebar) {
    i.setState({
      showCommunityReportModal: true,
      renderCommunityReportModal: true,
    });
  }

  async handleSubmitCommunityReport(reason: string) {
    const res = await HttpService.client.createCommunityReport({
      community_id: this.props.community_view.community.id,
      reason,
    });
    if (res.state === "success") {
      this.setState({ showCommunityReportModal: false });
    }
  }

  handleHideCommunityReportModal() {
    this.setState({ showCommunityReportModal: false });
  }

  get canPost(): boolean {
    return (
      !this.props.community_view.community.posting_restricted_to_mods ||
      amMod(this.props.community_view) ||
      amAdmin(this.props.myUserInfo)
    );
  }

  handleModRemoveShow(i: Sidebar) {
    i.setState({ showRemoveDialog: true });
  }

  handleModRemoveReasonChange(i: Sidebar, event: any) {
    i.setState({ removeReason: event.target.value });
  }

  handleModRemoveExpiresChange(i: Sidebar, event: any) {
    i.setState({ removeExpires: event.target.value });
  }

  handlePurgeCommunityShow(i: Sidebar) {
    i.setState({ showPurgeDialog: true, showRemoveDialog: false });
  }

  handlePurgeReasonChange(i: Sidebar, event: any) {
    i.setState({ purgeReason: event.target.value });
  }

  async handleNotificationChange(val: CommunityNotificationsMode) {
    this.setState({ notifications: val });
    const form = {
      community_id: this.props.community_view.community.id,
      mode: this.state.notifications,
    };
    this.props.onUpdateCommunityNotifs(form);
  }

  // TODO Do we need two of these?
  handleUnfollowCommunity(i: Sidebar) {
    i.setState({ followCommunityLoading: true });
    i.props.onFollowCommunity({
      community_id: i.props.community_view.community.id,
      follow: false,
    });
  }

  handleFollowCommunity(i: Sidebar) {
    i.setState({ followCommunityLoading: true });
    i.props.onFollowCommunity({
      community_id: i.props.community_view.community.id,
      follow: true,
    });
  }

  handleBlockCommunity(i: Sidebar) {
    const { community, community_actions: { blocked_at } = {} } =
      i.props.community_view;

    i.props.onBlockCommunity({
      community_id: community.id,
      block: !blocked_at,
    });
  }

  handleLeaveModTeam(i: Sidebar) {
    const myId = i.props.myUserInfo?.local_user_view.person.id;
    if (myId) {
      i.setState({ leaveModTeamLoading: true });
      i.props.onLeaveModTeam({
        community_id: i.props.community_view.community.id,
        person_id: myId,
        added: false,
      });
    }
  }

  handleDeleteCommunity(i: Sidebar) {
    i.setState({ deleteCommunityLoading: true });
    i.props.onDeleteCommunity({
      community_id: i.props.community_view.community.id,
      deleted: !i.props.community_view.community.deleted,
    });
  }

  handleRemoveCommunity(i: Sidebar, event: any) {
    event.preventDefault();
    i.setState({ removeCommunityLoading: true });
    i.props.onRemoveCommunity({
      community_id: i.props.community_view.community.id,
      removed: !i.props.community_view.community.removed,
      reason: i.state.removeReason ?? "",
    });
  }

  handlePurgeCommunity(i: Sidebar, event: any) {
    event.preventDefault();
    i.setState({ purgeCommunityLoading: true });
    i.props.onPurgeCommunity({
      community_id: i.props.community_view.community.id,
      reason: i.state.purgeReason ?? "",
    });
  }

  handleSearchChange(i: Sidebar, event: any) {
    i.setState({ searchText: event.target.value });
  }

  handleSearchSubmit(i: Sidebar, event: any) {
    event.preventDefault();
    const searchParamEncoded = i.state.searchText;
    i.context.router.history.push(
      `/search${getQueryString({ q: searchParamEncoded, communityId: i.props.community_view.community.id.toString() })}`,
    );
  }
}
