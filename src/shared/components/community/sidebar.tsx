import { hostname } from "@utils/helpers";
import { amAdmin, amMod, amTopMod } from "@utils/roles";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import {
  AddModToCommunity,
  BlockCommunity,
  CommunityModeratorView,
  CommunityView,
  DeleteCommunity,
  EditCommunity,
  FollowCommunity,
  Language,
  MyUserInfo,
  PersonView,
  PurgeCommunity,
  RemoveCommunity,
} from "lemmy-js-client";
import { mdToHtml } from "../../markdown";
import { I18NextService } from "../../services";
import { Badges } from "../common/badges";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { SubscribeButton } from "../common/subscribe-button";
import { CommunityForm } from "../community/community-form";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";

interface SidebarProps {
  community_view: CommunityView;
  myUserInfo?: MyUserInfo;
  moderators: CommunityModeratorView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  enableNsfw?: boolean;
  showIcon?: boolean;
  editable?: boolean;
  onDeleteCommunity(form: DeleteCommunity): void;
  onRemoveCommunity(form: RemoveCommunity): void;
  onLeaveModTeam(form: AddModToCommunity): void;
  onFollowCommunity(form: FollowCommunity): void;
  onBlockCommunity(form: BlockCommunity): void;
  onPurgeCommunity(form: PurgeCommunity): void;
  onEditCommunity(form: EditCommunity): void;
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
}

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
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleEditCancel = this.handleEditCancel.bind(this);
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
          />
        )}
      </div>
    );
  }

  sidebar() {
    const myUserInfo = this.props.myUserInfo;
    const {
      community: { name, actor_id },
    } = this.props.community_view;
    return (
      <aside className="mb-3">
        <div id="sidebarContainer">
          <section id="sidebarMain" className="card border-secondary mb-3">
            <div className="card-body">
              {this.communityTitle()}
              {this.props.editable && this.adminButtons()}
              <SubscribeButton
                communityView={this.props.community_view}
                onFollow={linkEvent(this, this.handleFollowCommunity)}
                onUnFollow={linkEvent(this, this.handleUnfollowCommunity)}
                loading={this.state.followCommunityLoading}
              />
              {this.canPost && this.createPost()}
              {myUserInfo && this.blockCommunity()}
              {!myUserInfo && (
                <div className="alert alert-info" role="alert">
                  <T
                    i18nKey="community_not_logged_in_alert"
                    interpolation={{
                      community: name,
                      instance: hostname(actor_id),
                    }}
                  >
                    #<code className="user-select-all">#</code>#
                  </T>
                </div>
              )}
            </div>
          </section>
          <section id="sidebarInfo" className="card border-secondary mb-3">
            <div className="card-body">
              {this.description()}
              <Badges
                communityId={this.props.community_view.community.id}
                counts={this.props.community_view.counts}
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
            <CommunityLink community={community} hideAvatar />
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
        />
      </div>
    );
  }

  mods() {
    return (
      <ul className="list-inline small">
        <li className="list-inline-item">{I18NextService.i18n.t("mods")}: </li>
        {this.props.moderators.map(mod => (
          <li key={mod.moderator.id} className="list-inline-item">
            <PersonListing person={mod.moderator} />
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
        to={`/create_post?communityId=${cv.community.id}`}
      >
        {I18NextService.i18n.t("create_a_post")}
      </Link>
    );
  }

  blockCommunity() {
    const { subscribed, blocked } = this.props.community_view;

    return (
      subscribed === "NotSubscribed" && (
        <button
          className="btn btn-danger d-block mb-2 w-100"
          onClick={linkEvent(this, this.handleBlockCommunity)}
        >
          {I18NextService.i18n.t(
            blocked ? "unblock_community" : "block_community",
          )}
        </button>
      )
    );
  }

  description() {
    const desc = this.props.community_view.community.description;
    return (
      desc && (
        <div className="md-div" dangerouslySetInnerHTML={mdToHtml(desc)} />
      )
    );
  }

  adminButtons() {
    const community_view = this.props.community_view;
    return (
      <>
        <ul className="list-inline mb-1 text-muted fw-bold">
          {amMod(
            this.props.community_view.community.id,
            this.props.myUserInfo,
          ) && (
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
          {amAdmin() && (
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

  get canPost(): boolean {
    return (
      !this.props.community_view.community.posting_restricted_to_mods ||
      amMod(this.props.community_view.community.id, this.props.myUserInfo) ||
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
    const { community, blocked } = i.props.community_view;

    i.props.onBlockCommunity({
      community_id: community.id,
      block: !blocked,
    });
  }

  handleLeaveModTeam(i: Sidebar) {
    const myId = this.props.myUserInfo?.local_user_view.person.id;
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
      reason: i.state.removeReason,
    });
  }

  handlePurgeCommunity(i: Sidebar, event: any) {
    event.preventDefault();
    i.setState({ purgeCommunityLoading: true });
    i.props.onPurgeCommunity({
      community_id: i.props.community_view.community.id,
      reason: i.state.purgeReason,
    });
  }
}
