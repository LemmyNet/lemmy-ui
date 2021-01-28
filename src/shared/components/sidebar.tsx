import { Component, linkEvent } from 'inferno';
import { Link } from 'inferno-router';
import {
  CommunityView,
  CommunityModeratorView,
  FollowCommunity,
  DeleteCommunity,
  RemoveCommunity,
  UserViewSafe,
  AddModToCommunity,
  Category,
} from 'lemmy-js-client';
import { WebSocketService, UserService } from '../services';
import { mdToHtml, getUnixTime, wsClient, authField } from '../utils';
import { CommunityForm } from './community-form';
import { UserListing } from './user-listing';
import { CommunityLink } from './community-link';
import { BannerIconHeader } from './banner-icon-header';
import { i18n } from '../i18next';

interface SidebarProps {
  community_view: CommunityView;
  categories: Category[];
  moderators: CommunityModeratorView[];
  admins: UserViewSafe[];
  online: number;
  enableNsfw: boolean;
  showIcon?: boolean;
}

interface SidebarState {
  showEdit: boolean;
  showRemoveDialog: boolean;
  removeReason: string;
  removeExpires: string;
  showConfirmLeaveModTeam: boolean;
}

export class Sidebar extends Component<SidebarProps, SidebarState> {
  private emptyState: SidebarState = {
    showEdit: false,
    showRemoveDialog: false,
    removeReason: null,
    removeExpires: null,
    showConfirmLeaveModTeam: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
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
            categories={this.props.categories}
            community_view={this.props.community_view}
            onEdit={this.handleEditCommunity}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
          />
        )}
      </div>
    );
  }

  sidebar() {
    return (
      <div>
        <div class="card border-secondary mb-3">
          <div class="card-body">
            {this.communityTitle()}
            {this.adminButtons()}
            {this.subscribe()}
            {this.createPost()}
          </div>
        </div>
        <div class="card border-secondary mb-3">
          <div class="card-body">
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
          {this.props.showIcon && (
            <BannerIconHeader icon={community.icon} banner={community.banner} />
          )}
          <span class="mr-2">{community.title}</span>
          {subscribed && (
            <a
              class="btn btn-secondary btn-sm mr-2"
              href="#"
              onClick={linkEvent(community.id, this.handleUnsubscribe)}
            >
              <svg class="text-success mr-1 icon icon-inline">
                <use xlinkHref="#icon-check"></use>
              </svg>
              {i18n.t('joined')}
            </a>
          )}
          {community.removed && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t('removed')}
            </small>
          )}
          {community.deleted && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t('deleted')}
            </small>
          )}
          {community.nsfw && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t('nsfw')}
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
      <ul class="my-1 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_online', { count: this.props.online })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_users', {
            count: counts.users_active_day,
          })}{' '}
          / {i18n.t('day')}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_users', {
            count: counts.users_active_week,
          })}{' '}
          / {i18n.t('week')}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_users', {
            count: counts.users_active_month,
          })}{' '}
          / {i18n.t('month')}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_users', {
            count: counts.users_active_half_year,
          })}{' '}
          / {i18n.t('number_of_months', { count: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_subscribers', {
            count: counts.subscribers,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_posts', {
            count: counts.posts,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t('number_of_comments', {
            count: counts.comments,
          })}
        </li>
        <li className="list-inline-item">
          <Link className="badge badge-secondary" to="/communities">
            {community_view.category.name}
          </Link>
        </li>
        <li className="list-inline-item">
          <Link
            className="badge badge-secondary"
            to={`/modlog/community/${this.props.community_view.community.id}`}
          >
            {i18n.t('modlog')}
          </Link>
        </li>
      </ul>
    );
  }

  mods() {
    return (
      <ul class="list-inline small">
        <li class="list-inline-item">{i18n.t('mods')}: </li>
        {this.props.moderators.map(mod => (
          <li class="list-inline-item">
            <UserListing user={mod.moderator} />
          </li>
        ))}
      </ul>
    );
  }

  createPost() {
    let community_view = this.props.community_view;
    return (
      community_view.subscribed && (
        <Link
          className={`btn btn-secondary btn-block mb-2 ${
            community_view.community.deleted || community_view.community.removed
              ? 'no-click'
              : ''
          }`}
          to={`/create_post?community_id=${community_view.community.id}`}
        >
          {i18n.t('create_a_post')}
        </Link>
      )
    );
  }

  subscribe() {
    let community_view = this.props.community_view;
    return (
      <div class="mb-2">
        {!community_view.subscribed && (
          <a
            class="btn btn-secondary btn-block"
            href="#"
            onClick={linkEvent(
              community_view.community.id,
              this.handleSubscribe
            )}
          >
            {i18n.t('subscribe')}
          </a>
        )}
      </div>
    );
  }

  description() {
    let description = this.props.community_view.community.description;
    return (
      description && (
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(description)}
        />
      )
    );
  }

  adminButtons() {
    let community_view = this.props.community_view;
    return (
      <>
        <ul class="list-inline mb-1 text-muted font-weight-bold">
          {this.canMod && (
            <>
              <li className="list-inline-item-action">
                <span
                  class="pointer"
                  onClick={linkEvent(this, this.handleEditClick)}
                  data-tippy-content={i18n.t('edit')}
                >
                  <svg class="icon icon-inline">
                    <use xlinkHref="#icon-edit"></use>
                  </svg>
                </span>
              </li>
              {!this.amCreator &&
                (!this.state.showConfirmLeaveModTeam ? (
                  <li className="list-inline-item-action">
                    <span
                      class="pointer"
                      onClick={linkEvent(
                        this,
                        this.handleShowConfirmLeaveModTeamClick
                      )}
                    >
                      {i18n.t('leave_mod_team')}
                    </span>
                  </li>
                ) : (
                  <>
                    <li className="list-inline-item-action">
                      {i18n.t('are_you_sure')}
                    </li>
                    <li className="list-inline-item-action">
                      <span
                        class="pointer"
                        onClick={linkEvent(this, this.handleLeaveModTeamClick)}
                      >
                        {i18n.t('yes')}
                      </span>
                    </li>
                    <li className="list-inline-item-action">
                      <span
                        class="pointer"
                        onClick={linkEvent(
                          this,
                          this.handleCancelLeaveModTeamClick
                        )}
                      >
                        {i18n.t('no')}
                      </span>
                    </li>
                  </>
                ))}
              {this.amCreator && (
                <li className="list-inline-item-action">
                  <span
                    class="pointer"
                    onClick={linkEvent(this, this.handleDeleteClick)}
                    data-tippy-content={
                      !community_view.community.deleted
                        ? i18n.t('delete')
                        : i18n.t('restore')
                    }
                  >
                    <svg
                      class={`icon icon-inline ${
                        community_view.community.deleted && 'text-danger'
                      }`}
                    >
                      <use xlinkHref="#icon-trash"></use>
                    </svg>
                  </span>
                </li>
              )}
            </>
          )}
          {this.canAdmin && (
            <li className="list-inline-item">
              {!this.props.community_view.community.removed ? (
                <span
                  class="pointer"
                  onClick={linkEvent(this, this.handleModRemoveShow)}
                >
                  {i18n.t('remove')}
                </span>
              ) : (
                <span
                  class="pointer"
                  onClick={linkEvent(this, this.handleModRemoveSubmit)}
                >
                  {i18n.t('restore')}
                </span>
              )}
            </li>
          )}
        </ul>
        {this.state.showRemoveDialog && (
          <form onSubmit={linkEvent(this, this.handleModRemoveSubmit)}>
            <div class="form-group row">
              <label class="col-form-label" htmlFor="remove-reason">
                {i18n.t('reason')}
              </label>
              <input
                type="text"
                id="remove-reason"
                class="form-control mr-2"
                placeholder={i18n.t('optional')}
                value={this.state.removeReason}
                onInput={linkEvent(this, this.handleModRemoveReasonChange)}
              />
            </div>
            {/* TODO hold off on expires for now */}
            {/* <div class="form-group row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.removeExpires} onInput={linkEvent(this, this.handleModRemoveExpiresChange)} /> */}
            {/* </div> */}
            <div class="form-group row">
              <button type="submit" class="btn btn-secondary">
                {i18n.t('remove_community')}
              </button>
            </div>
          </form>
        )}
      </>
    );
  }

  handleEditClick(i: Sidebar) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleEditCommunity() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleEditCancel() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleDeleteClick(i: Sidebar, event: any) {
    event.preventDefault();
    let deleteForm: DeleteCommunity = {
      community_id: i.props.community_view.community.id,
      deleted: !i.props.community_view.community.deleted,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.deleteCommunity(deleteForm));
  }

  handleShowConfirmLeaveModTeamClick(i: Sidebar) {
    i.state.showConfirmLeaveModTeam = true;
    i.setState(i.state);
  }

  handleLeaveModTeamClick(i: Sidebar) {
    let form: AddModToCommunity = {
      user_id: UserService.Instance.user.id,
      community_id: i.props.community_view.community.id,
      added: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.state.showConfirmLeaveModTeam = false;
    i.setState(i.state);
  }

  handleCancelLeaveModTeamClick(i: Sidebar) {
    i.state.showConfirmLeaveModTeam = false;
    i.setState(i.state);
  }

  handleUnsubscribe(communityId: number, event: any) {
    event.preventDefault();
    let form: FollowCommunity = {
      community_id: communityId,
      follow: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.followCommunity(form));
  }

  handleSubscribe(communityId: number, event: any) {
    event.preventDefault();
    let form: FollowCommunity = {
      community_id: communityId,
      follow: true,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.followCommunity(form));
  }

  private get amCreator(): boolean {
    return this.props.community_view.creator.id == UserService.Instance.user.id;
  }

  get canMod(): boolean {
    return (
      UserService.Instance.user &&
      this.props.moderators
        .map(m => m.moderator.id)
        .includes(UserService.Instance.user.id)
    );
  }

  get canAdmin(): boolean {
    return (
      UserService.Instance.user &&
      this.props.admins
        .map(a => a.user.id)
        .includes(UserService.Instance.user.id)
    );
  }

  handleModRemoveShow(i: Sidebar) {
    i.state.showRemoveDialog = true;
    i.setState(i.state);
  }

  handleModRemoveReasonChange(i: Sidebar, event: any) {
    i.state.removeReason = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveExpiresChange(i: Sidebar, event: any) {
    console.log(event.target.value);
    i.state.removeExpires = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveSubmit(i: Sidebar, event: any) {
    event.preventDefault();
    let removeForm: RemoveCommunity = {
      community_id: i.props.community_view.community.id,
      removed: !i.props.community_view.community.removed,
      reason: i.state.removeReason,
      expires: getUnixTime(i.state.removeExpires),
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.removeCommunity(removeForm));

    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }
}
