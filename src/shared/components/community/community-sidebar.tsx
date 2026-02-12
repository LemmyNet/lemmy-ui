import { getQueryString, hostname } from "@utils/helpers";
import { amAdmin, amMod } from "@utils/roles";
import { Component, FormEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  BlockCommunity,
  CommunityModeratorView,
  CommunityNotificationsMode,
  CommunityView,
  FollowCommunity,
  Language,
  MyUserInfo,
  PersonView,
  PurgeCommunity,
  RemoveCommunity,
  EditCommunityNotifications,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { HttpService, I18NextService } from "../../services";
import { CommunityBadges } from "../common/badges";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { SubscribeButton } from "../common/subscribe-button";
import { CommunityLink, CommunitySettingsLink } from "./community-link";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import CommunityReportModal from "@components/common/modal/community-report-modal";
import { CommunityNotificationsDropdown } from "@components/common/notifications-dropdown";
import { LanguageList } from "@components/common/language-list";
import { NoOptionI18nKeys } from "i18next";
import { canViewCommunity, reportToast } from "@utils/app";
import { CreatePostButton } from "@components/common/content-actions/create-item-buttons";
import ModActionFormModal from "@components/common/modal/mod-action-form-modal";
import { Link } from "inferno-router";

interface SidebarProps {
  communityView: CommunityView;
  moderators: CommunityModeratorView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  enableNsfw?: boolean;
  showIcon?: boolean;
  hideButtons?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onRemove(form: RemoveCommunity): void;
  onPurge(form: PurgeCommunity): void;
  onFollow(form: FollowCommunity): void;
  onBlock(form: BlockCommunity): void;
  onEditNotifs(form: EditCommunityNotifications): void;
  removeLoading: boolean;
  purgeLoading: boolean;
  followLoading: boolean;
}

interface SidebarState {
  showRemoveDialog: boolean;
  removeExpires?: string;
  showPurgeDialog: boolean;
  showReportModal: boolean;
  searchText: string;
  notifications: CommunityNotificationsMode;
}

@tippyMixin
export class CommunitySidebar extends Component<SidebarProps, SidebarState> {
  state: SidebarState = {
    showReportModal: false,
    searchText: "",
    notifications:
      this.props.communityView?.community_actions?.notifications ??
      "replies_and_mentions",
    showRemoveDialog: false,
    showPurgeDialog: false,
  };

  render() {
    const { communityView, myUserInfo } = this.props;
    const {
      community,
      community: {
        name,
        ap_id,
        summary,
        posting_restricted_to_mods,
        visibility,
      },
      community_actions: { received_ban_at } = {},
    } = communityView;

    const visibilityLabel = ("community_visibility_" +
      visibility) as NoOptionI18nKeys;
    const visibilityDescription = (visibilityLabel +
      "_desc") as NoOptionI18nKeys;
    const canViewCommunity_ = canViewCommunity(communityView);

    return (
      <div className="community-sidebar">
        <aside className="mb-3">
          <div id="sidebarContainer">
            {!this.props.hideButtons && (
              <section id="sidebarMain" className="card mb-3">
                <div className="card-body">
                  {this.communityTitle()}
                  {summary && <h6>{summary}</h6>}
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
                        followState={
                          communityView.community_actions?.follow_state
                        }
                        apId={community.ap_id}
                        onFollow={() => handleFollow(this, true)}
                        onUnFollow={() => handleFollow(this, false)}
                        loading={this.props.followLoading}
                        showRemoteFetch={!this.props.myUserInfo}
                      />
                      {this.canPost() && canViewCommunity_ && (
                        <CreatePostButton
                          communityView={communityView}
                          myUserInfo={myUserInfo}
                        />
                      )}
                    </>
                  )}
                  <button
                    className="btn btn-light border-light-subtle d-block mb-2 w-100"
                    onClick={() => handleShowReportModal(this)}
                  >
                    {I18NextService.i18n.t("create_report")}
                  </button>
                  <CommunityReportModal
                    onSubmit={reason => handleSubmitReport(this, reason)}
                    onCancel={() => handleHideReportModal(this)}
                    show={this.state.showReportModal}
                  />
                  <Link
                    className="btn btn-light border-light-subtle d-block mb-2 w-100"
                    to={`/modlog?communityId=${community.id}`}
                  >
                    {I18NextService.i18n.t("modlog")}
                  </Link>
                  {this.amModOrAdminAndLocal() && (
                    <CommunitySettingsLink community={community} />
                  )}
                  {amAdmin(myUserInfo) && (
                    <>
                      <button
                        className="btn btn-light border-light-subtle d-block mb-2 w-100"
                        onClick={() => handleShowRemoveDialog(this)}
                      >
                        {I18NextService.i18n.t(
                          !communityView.community.removed
                            ? "remove"
                            : "restore",
                        )}
                      </button>
                      <ModActionFormModal
                        onSubmit={reason => handleRemove(this, reason)}
                        modActionType="remove-community"
                        isRemoved={communityView.community.removed}
                        onCancel={() => handleHideRemoveDialog(this)}
                        show={this.state.showRemoveDialog}
                        loading={false}
                      />
                      <button
                        className="btn btn-light border-light-subtle d-block mb-2 w-100"
                        onClick={() => handleShowPurgeDialog(this)}
                        aria-label={I18NextService.i18n.t("purge_community")}
                      >
                        {I18NextService.i18n.t("purge_community")}
                      </button>
                      <ModActionFormModal
                        onSubmit={reason => handlePurge(this, reason)}
                        modActionType="purge-community"
                        community={communityView.community}
                        onCancel={() => handleHidePurgeDialog(this)}
                        show={this.state.showPurgeDialog}
                        loading={false}
                      />
                    </>
                  )}
                  <>
                    {this.props.myUserInfo && this.blockCommunity()}
                    {canViewCommunity_ && (
                      <>
                        <div className="d-block mb-2">
                          <CommunityNotificationsDropdown
                            currentOption={this.state.notifications}
                            onSelect={val =>
                              handleNotificationChange(this, val)
                            }
                            className="btn btn-light border-light-subtle d-block w-100 text-truncate"
                          />
                        </div>
                        <form
                          className="d-flex"
                          onSubmit={e => handleSearchSubmit(this, e)}
                        >
                          <input
                            name="q"
                            type="search"
                            className="form-control flex-initial"
                            placeholder={`${I18NextService.i18n.t("search")}...`}
                            aria-label={I18NextService.i18n.t("search")}
                            onInput={e => handleSearchChange(this, e)}
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
                <CommunityBadges community={communityView.community} />
                {this.mods()}
              </div>
            </section>
          </div>
        </aside>
      </div>
    );
  }

  communityTitle() {
    const community = this.props.communityView.community;

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
              banned={false}
              myUserInfo={this.props.myUserInfo}
            />
          </li>
        ))}
      </ul>
    );
  }

  blockCommunity() {
    const { community_actions: { follow_state: subscribed, blocked_at } = {} } =
      this.props.communityView;

    return (
      !subscribed && (
        <button
          className="btn btn-danger d-block mb-2 w-100"
          onClick={() => handleBlock(this)}
        >
          {I18NextService.i18n.t(
            blocked_at ? "unblock_community" : "block_community",
          )}
        </button>
      )
    );
  }

  sidebarMarkdown() {
    const { sidebar } = this.props.communityView.community;
    return (
      sidebar && (
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(sidebar, () => this.forceUpdate())}
        />
      )
    );
  }

  canPost(): boolean {
    return (
      !this.props.communityView.community.posting_restricted_to_mods ||
      this.amModOrAdmin()
    );
  }

  amModOrAdmin(): boolean {
    return amMod(this.props.communityView) || amAdmin(this.props.myUserInfo);
  }

  /**
   * Only allow viewing community sidebar if you're a mod, or you're an admin and its a local community
   **/
  amModOrAdminAndLocal(): boolean {
    return (
      amMod(this.props.communityView) ||
      (amAdmin(this.props.myUserInfo) &&
        this.props.communityView.community.local)
    );
  }
}

function handleSearchChange(
  i: CommunitySidebar,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ searchText: event.target.value });
}

function handleSearchSubmit(
  i: CommunitySidebar,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  const searchParamEncoded = i.state.searchText;
  i.context.router.history.push(
    `/search${getQueryString({ q: searchParamEncoded, communityId: i.props.communityView.community.id.toString() })}`,
  );
}

function handleShowReportModal(i: CommunitySidebar) {
  i.setState({ showReportModal: true });
}

function handleHideReportModal(i: CommunitySidebar) {
  i.setState({ showReportModal: false });
}

async function handleSubmitReport(i: CommunitySidebar, reason: string) {
  const res = await HttpService.client.createCommunityReport({
    community_id: i.props.communityView.community.id,
    reason,
  });
  reportToast(res);
}

function handleShowRemoveDialog(i: CommunitySidebar) {
  i.setState({ showRemoveDialog: true });
}

function handleHideRemoveDialog(i: CommunitySidebar) {
  i.setState({ showRemoveDialog: false });
}

function handleRemove(i: CommunitySidebar, reason: string) {
  i.setState({ showRemoveDialog: false });
  i.props.onRemove({
    community_id: i.props.communityView.community.id,
    removed: !i.props.communityView.community.removed,
    reason,
  });
}

function handleShowPurgeDialog(i: CommunitySidebar) {
  i.setState({ showPurgeDialog: true });
}

function handleHidePurgeDialog(i: CommunitySidebar) {
  i.setState({ showPurgeDialog: false });
}

function handlePurge(i: CommunitySidebar, reason: string) {
  i.props.onPurge({
    community_id: i.props.communityView.community.id,
    reason,
  });
  i.setState({ showPurgeDialog: false });
}

function handleNotificationChange(
  i: CommunitySidebar,
  val: CommunityNotificationsMode,
) {
  i.setState({ notifications: val });
  const form = {
    community_id: i.props.communityView.community.id,
    mode: i.state.notifications,
  };
  i.props.onEditNotifs(form);
}

function handleFollow(i: CommunitySidebar, follow: boolean) {
  i.props.onFollow({
    community_id: i.props.communityView.community.id,
    follow,
  });
}

function handleBlock(i: CommunitySidebar) {
  const { community, community_actions: { blocked_at } = {} } =
    i.props.communityView;

  i.props.onBlock({
    community_id: community.id,
    block: !blocked_at,
  });
}
