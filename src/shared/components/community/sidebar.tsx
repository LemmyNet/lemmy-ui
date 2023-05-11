import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddModToCommunity,
  BlockCommunity,
  CommunityModeratorView,
  CommunityView,
  DeleteCommunity,
  FollowCommunity,
  Language,
  PersonView,
  PurgeCommunity,
  RemoveCommunity,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  amAdmin,
  amMod,
  amTopMod,
  getUnixTime,
  hostname,
  mdToHtml,
  myAuth,
  numToSI,
  wsClient,
} from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { CommunityForm } from "../community/community-form";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";

interface SidebarProps {
  community_view: CommunityView;
  moderators: CommunityModeratorView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  online: number;
  enableNsfw?: boolean;
  showIcon?: boolean;
  editable?: boolean;
}

interface SidebarState {
  removeReason?: string;
  removeExpires?: string;
  showEdit: boolean;
  showRemoveDialog: boolean;
  showPurgeDialog: boolean;
  purgeReason?: string;
  purgeLoading: boolean;
  showConfirmLeaveModTeam: boolean;
}

export class Sidebar extends Component<SidebarProps, SidebarState> {
  state: SidebarState = {
    showEdit: false,
    showRemoveDialog: false,
    showPurgeDialog: false,
    purgeLoading: false,
    showConfirmLeaveModTeam: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleEditCommunity = this.handleEditCommunity.bind(this);
    this.handleEditCancel = this.handleEditCancel.bind(this);
  }

  render() {
    return (
      <div>
        {!this.state.showEdit ? (
          this.sidebar()
        ) : (
          <CommunityForm
            community_view={this.props.community_view}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            communityLanguages={this.props.communityLanguages}
            onEdit={this.handleEditCommunity}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
          />
        )}
      </div>
    );
  }

  sidebar() {
    const myUSerInfo = UserService.Instance.myUserInfo;
    const { name, actor_id } = this.props.community_view.community;
    return (
      <div>
        <div className="card border-secondary mb-3">
          <div className="card-body">
            {this.communityTitle()}
            {this.props.editable && this.adminButtons()}
            {myUSerInfo && this.subscribe()}
            {this.canPost && this.createPost()}
            {myUSerInfo && this.blockCommunity()}
            {!myUSerInfo && (
              <div className="alert alert-info" role="alert">
                {i18n.t("community_not_logged_in_alert", {
                  community: name,
                  instance: hostname(actor_id),
                })}
              </div>
            )}
          </div>
        </div>
        <div className="card border-secondary mb-3">
          <div className="card-body">
            {this.description()}
            {this.badges()}
            {this.mods()}
          </div>
        </div>
      </div>
    );
  }

  communityTitle() {
    let community = this.props.community_view.community;
    let subscribed = this.props.community_view.subscribed;
    return (
      <div>
        <h5 className="mb-0">
          {this.props.showIcon && !community.removed && (
            <BannerIconHeader icon={community.icon} banner={community.banner} />
          )}
          <span className="mr-2">{community.title}</span>
          {subscribed === "Subscribed" && (
            <button
              className="btn btn-secondary btn-sm mr-2"
              onClick={linkEvent(this, this.handleUnsubscribe)}
            >
              <Icon icon="check" classes="icon-inline text-success mr-1" />
              {i18n.t("joined")}
            </button>
          )}
          {subscribed === "Pending" && (
            <button
              className="btn btn-warning mr-2"
              onClick={linkEvent(this, this.handleUnsubscribe)}
            >
              {i18n.t("subscribe_pending")}
            </button>
          )}
          {community.removed && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("removed")}
            </small>
          )}
          {community.deleted && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("deleted")}
            </small>
          )}
          {community.nsfw && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("nsfw")}
            </small>
          )}
        </h5>
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

  badges() {
    let community_view = this.props.community_view;
    let counts = community_view.counts;
    return (
      <ul className="my-1 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_online", {
            count: this.props.online,
            formattedCount: numToSI(BigInt(this.props.online)),
          })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_day", {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_week", {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_month", {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_six_months", {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          })}{" "}
          / {i18n.t("number_of_months", { count: 6, formattedCount: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_subscribers", {
            count: Number(counts.subscribers),
            formattedCount: numToSI(counts.subscribers),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: Number(counts.posts),
            formattedCount: numToSI(counts.posts),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: Number(counts.comments),
            formattedCount: numToSI(counts.comments),
          })}
        </li>
        <li className="list-inline-item">
          <Link
            className="badge badge-primary"
            to={`/modlog/${this.props.community_view.community.id}`}
          >
            {i18n.t("modlog")}
          </Link>
        </li>
      </ul>
    );
  }

  mods() {
    return (
      <ul className="list-inline small">
        <li className="list-inline-item">{i18n.t("mods")}: </li>
        {this.props.moderators.map(mod => (
          <li key={mod.moderator.id} className="list-inline-item">
            <PersonListing person={mod.moderator} />
          </li>
        ))}
      </ul>
    );
  }

  createPost() {
    let cv = this.props.community_view;
    return (
      <Link
        className={`btn btn-secondary btn-block mb-2 ${
          cv.community.deleted || cv.community.removed ? "no-click" : ""
        }`}
        to={`/create_post?communityId=${cv.community.id}`}
      >
        {i18n.t("create_a_post")}
      </Link>
    );
  }

  subscribe() {
    let community_view = this.props.community_view;
    return (
      <div className="mb-2">
        {community_view.subscribed == "NotSubscribed" && (
          <button
            className="btn btn-secondary btn-block"
            onClick={linkEvent(this, this.handleSubscribe)}
          >
            {i18n.t("subscribe")}
          </button>
        )}
      </div>
    );
  }

  blockCommunity() {
    let community_view = this.props.community_view;
    let blocked = this.props.community_view.blocked;

    return (
      <div className="mb-2">
        {community_view.subscribed == "NotSubscribed" &&
          (blocked ? (
            <button
              className="btn btn-danger btn-block"
              onClick={linkEvent(this, this.handleUnblock)}
            >
              {i18n.t("unblock_community")}
            </button>
          ) : (
            <button
              className="btn btn-danger btn-block"
              onClick={linkEvent(this, this.handleBlock)}
            >
              {i18n.t("block_community")}
            </button>
          ))}
      </div>
    );
  }

  description() {
    let desc = this.props.community_view.community.description;
    return (
      desc && (
        <div className="md-div" dangerouslySetInnerHTML={mdToHtml(desc)} />
      )
    );
  }

  adminButtons() {
    let community_view = this.props.community_view;
    return (
      <>
        <ul className="list-inline mb-1 text-muted font-weight-bold">
          {amMod(this.props.moderators) && (
            <>
              <li className="list-inline-item-action">
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleEditClick)}
                  data-tippy-content={i18n.t("edit")}
                  aria-label={i18n.t("edit")}
                >
                  <Icon icon="edit" classes="icon-inline" />
                </button>
              </li>
              {!amTopMod(this.props.moderators) &&
                (!this.state.showConfirmLeaveModTeam ? (
                  <li className="list-inline-item-action">
                    <button
                      className="btn btn-link text-muted d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleShowConfirmLeaveModTeamClick
                      )}
                    >
                      {i18n.t("leave_mod_team")}
                    </button>
                  </li>
                ) : (
                  <>
                    <li className="list-inline-item-action">
                      {i18n.t("are_you_sure")}
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(this, this.handleLeaveModTeamClick)}
                      >
                        {i18n.t("yes")}
                      </button>
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(
                          this,
                          this.handleCancelLeaveModTeamClick
                        )}
                      >
                        {i18n.t("no")}
                      </button>
                    </li>
                  </>
                ))}
              {amTopMod(this.props.moderators) && (
                <li className="list-inline-item-action">
                  <button
                    className="btn btn-link text-muted d-inline-block"
                    onClick={linkEvent(this, this.handleDeleteClick)}
                    data-tippy-content={
                      !community_view.community.deleted
                        ? i18n.t("delete")
                        : i18n.t("restore")
                    }
                    aria-label={
                      !community_view.community.deleted
                        ? i18n.t("delete")
                        : i18n.t("restore")
                    }
                  >
                    <Icon
                      icon="trash"
                      classes={`icon-inline ${
                        community_view.community.deleted && "text-danger"
                      }`}
                    />
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
                  {i18n.t("remove")}
                </button>
              ) : (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleModRemoveSubmit)}
                >
                  {i18n.t("restore")}
                </button>
              )}
              <button
                className="btn btn-link text-muted d-inline-block"
                onClick={linkEvent(this, this.handlePurgeCommunityShow)}
                aria-label={i18n.t("purge_community")}
              >
                {i18n.t("purge_community")}
              </button>
            </li>
          )}
        </ul>
        {this.state.showRemoveDialog && (
          <form onSubmit={linkEvent(this, this.handleModRemoveSubmit)}>
            <div className="form-group">
              <label className="col-form-label" htmlFor="remove-reason">
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="remove-reason"
                className="form-control mr-2"
                placeholder={i18n.t("optional")}
                value={this.state.removeReason}
                onInput={linkEvent(this, this.handleModRemoveReasonChange)}
              />
            </div>
            {/* TODO hold off on expires for now */}
            {/* <div class="form-group row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.removeExpires} onInput={linkEvent(this, this.handleModRemoveExpiresChange)} /> */}
            {/* </div> */}
            <div className="form-group">
              <button type="submit" className="btn btn-secondary">
                {i18n.t("remove_community")}
              </button>
            </div>
          </form>
        )}
        {this.state.showPurgeDialog && (
          <form onSubmit={linkEvent(this, this.handlePurgeSubmit)}>
            <div className="form-group">
              <PurgeWarning />
            </div>
            <div className="form-group">
              <label className="sr-only" htmlFor="purge-reason">
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="purge-reason"
                className="form-control mr-2"
                placeholder={i18n.t("reason")}
                value={this.state.purgeReason}
                onInput={linkEvent(this, this.handlePurgeReasonChange)}
              />
            </div>
            <div className="form-group">
              {this.state.purgeLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary"
                  aria-label={i18n.t("purge_community")}
                >
                  {i18n.t("purge_community")}
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

  handleEditCommunity() {
    this.setState({ showEdit: false });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  handleDeleteClick(i: Sidebar, event: any) {
    event.preventDefault();
    let auth = myAuth();
    if (auth) {
      let deleteForm: DeleteCommunity = {
        community_id: i.props.community_view.community.id,
        deleted: !i.props.community_view.community.deleted,
        auth,
      };
      WebSocketService.Instance.send(wsClient.deleteCommunity(deleteForm));
    }
  }

  handleShowConfirmLeaveModTeamClick(i: Sidebar) {
    i.setState({ showConfirmLeaveModTeam: true });
  }

  handleLeaveModTeamClick(i: Sidebar) {
    let mui = UserService.Instance.myUserInfo;
    let auth = myAuth();
    if (auth && mui) {
      let form: AddModToCommunity = {
        person_id: mui.local_user_view.person.id,
        community_id: i.props.community_view.community.id,
        added: false,
        auth,
      };
      WebSocketService.Instance.send(wsClient.addModToCommunity(form));
      i.setState({ showConfirmLeaveModTeam: false });
    }
  }

  handleCancelLeaveModTeamClick(i: Sidebar) {
    i.setState({ showConfirmLeaveModTeam: false });
  }

  handleUnsubscribe(i: Sidebar, event: any) {
    event.preventDefault();
    let community_id = i.props.community_view.community.id;
    let auth = myAuth();
    if (auth) {
      let form: FollowCommunity = {
        community_id,
        follow: false,
        auth,
      };
      WebSocketService.Instance.send(wsClient.followCommunity(form));
    }

    // Update myUserInfo
    let mui = UserService.Instance.myUserInfo;
    if (mui) {
      mui.follows = mui.follows.filter(i => i.community.id != community_id);
    }
  }

  handleSubscribe(i: Sidebar, event: any) {
    event.preventDefault();
    let community_id = i.props.community_view.community.id;
    let auth = myAuth();
    if (auth) {
      let form: FollowCommunity = {
        community_id,
        follow: true,
        auth,
      };
      WebSocketService.Instance.send(wsClient.followCommunity(form));
    }

    // Update myUserInfo
    let mui = UserService.Instance.myUserInfo;
    if (mui) {
      mui.follows.push({
        community: i.props.community_view.community,
        follower: mui.local_user_view.person,
      });
    }
  }

  get canPost(): boolean {
    return (
      !this.props.community_view.community.posting_restricted_to_mods ||
      amMod(this.props.moderators) ||
      amAdmin()
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

  handleModRemoveSubmit(i: Sidebar, event: any) {
    event.preventDefault();
    let auth = myAuth();
    if (auth) {
      let removeForm: RemoveCommunity = {
        community_id: i.props.community_view.community.id,
        removed: !i.props.community_view.community.removed,
        reason: i.state.removeReason,
        expires: getUnixTime(i.state.removeExpires),
        auth,
      };
      WebSocketService.Instance.send(wsClient.removeCommunity(removeForm));

      i.setState({ showRemoveDialog: false });
    }
  }

  handlePurgeCommunityShow(i: Sidebar) {
    i.setState({ showPurgeDialog: true, showRemoveDialog: false });
  }

  handlePurgeReasonChange(i: Sidebar, event: any) {
    i.setState({ purgeReason: event.target.value });
  }

  handlePurgeSubmit(i: Sidebar, event: any) {
    event.preventDefault();

    let auth = myAuth();
    if (auth) {
      let form: PurgeCommunity = {
        community_id: i.props.community_view.community.id,
        reason: i.state.purgeReason,
        auth,
      };
      WebSocketService.Instance.send(wsClient.purgeCommunity(form));
      i.setState({ purgeLoading: true });
    }
  }

  handleBlock(i: Sidebar, event: any) {
    event.preventDefault();
    let auth = myAuth();
    if (auth) {
      let blockCommunityForm: BlockCommunity = {
        community_id: i.props.community_view.community.id,
        block: true,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }

  handleUnblock(i: Sidebar, event: any) {
    event.preventDefault();
    let auth = myAuth();
    if (auth) {
      let blockCommunityForm: BlockCommunity = {
        community_id: i.props.community_view.community.id,
        block: false,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }
}
