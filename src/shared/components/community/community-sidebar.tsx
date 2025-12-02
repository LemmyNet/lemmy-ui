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
  UpdateCommunityNotifications,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { HttpService, I18NextService } from "../../services";
import { CommunityBadges } from "../common/badges";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { SubscribeButton } from "../common/subscribe-button";
import { CommunityLink } from "./community-link";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import CommunityReportModal from "@components/common/modal/community-report-modal";
import { CommunityNotificationSelect } from "@components/common/notification-select";
import { LanguageList } from "@components/common/language-list";
import { NoOptionI18nKeys } from "i18next";
import { canViewCommunity } from "@utils/app";
import { CreatePostButton } from "@components/common/content-actions/create-item-buttons";

interface SidebarProps {
  community_view: CommunityView;
  moderators: CommunityModeratorView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  enableNsfw?: boolean;
  showIcon?: boolean;
  hideButtons?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onFollowCommunity(form: FollowCommunity): void;
  onBlockCommunity(form: BlockCommunity): void;
  onUpdateCommunityNotifs(form: UpdateCommunityNotifications): void;
}

interface SidebarState {
  followCommunityLoading: boolean;
  showCommunityReportModal: boolean;
  renderCommunityReportModal: boolean;
  searchText: string;
  notifications: CommunityNotificationsMode;
}

@tippyMixin
export class CommunitySidebar extends Component<SidebarProps, SidebarState> {
  state: SidebarState = {
    followCommunityLoading: false,
    showCommunityReportModal: false,
    renderCommunityReportModal: false,
    searchText: "",
    notifications:
      this.props.community_view?.community_actions?.notifications ??
      "replies_and_mentions",
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const {
      community: {
        name,
        ap_id,
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
      <div className="community-sidebar">
        <aside className="mb-3">
          <div id="sidebarContainer">
            {!this.props.hideButtons && (
              <section id="sidebarMain" className="card mb-3">
                <div className="card-body">
                  {this.communityTitle()}
                  {description && <h6>{description}</h6>}
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
                          this.props.community_view.community_actions
                            ?.follow_state
                        }
                        apId={this.props.community_view.community.ap_id}
                        onFollow={() => handleFollowCommunity(this, true)}
                        onUnFollow={() => handleFollowCommunity(this, false)}
                        loading={this.state.followCommunityLoading}
                        showRemoteFetch={!this.props.myUserInfo}
                      />
                      {this.canPost && canViewCommunity_ && (
                        <CreatePostButton
                          communityView={this.props.community_view}
                        />
                      )}
                    </>
                  )}
                  <button
                    className="btn btn-secondary d-block mb-2 w-100"
                    onClick={() => handleShowCommunityReportModal(this)}
                  >
                    {I18NextService.i18n.t("create_report")}
                  </button>
                  {this.state.renderCommunityReportModal && (
                    <CommunityReportModal
                      onSubmit={reason =>
                        handleSubmitCommunityReport(this, reason)
                      }
                      onCancel={() => handleHideCommunityReportModal(this)}
                      show={this.state.showCommunityReportModal}
                    />
                  )}
                  <>
                    {this.props.myUserInfo && this.blockCommunity()}
                    {canViewCommunity_ && (
                      <>
                        <div className="mb-2 d-flex">
                          <CommunityNotificationSelect
                            current={this.state.notifications}
                            onChange={val =>
                              handleNotificationChange(this, val)
                            }
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
                <CommunityBadges
                  community={this.props.community_view.community}
                />
                {this.mods()}
              </div>
            </section>
          </div>
        </aside>
      </div>
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
      this.props.community_view;

    return (
      !subscribed && (
        <button
          className="btn btn-danger d-block mb-2 w-100"
          onClick={() => handleBlockCommunity(this)}
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

  get canPost(): boolean {
    return (
      !this.props.community_view.community.posting_restricted_to_mods ||
      amMod(this.props.community_view) ||
      amAdmin(this.props.myUserInfo)
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
    `/search${getQueryString({ q: searchParamEncoded, communityId: i.props.community_view.community.id.toString() })}`,
  );
}

function handleShowCommunityReportModal(i: CommunitySidebar) {
  i.setState({
    showCommunityReportModal: true,
    renderCommunityReportModal: true,
  });
}

async function handleSubmitCommunityReport(
  i: CommunitySidebar,
  reason: string,
) {
  const res = await HttpService.client.createCommunityReport({
    community_id: i.props.community_view.community.id,
    reason,
  });
  if (res.state === "success") {
    i.setState({ showCommunityReportModal: false });
  }
}

function handleHideCommunityReportModal(i: CommunitySidebar) {
  i.setState({ showCommunityReportModal: false });
}

function handleNotificationChange(
  i: CommunitySidebar,
  val: CommunityNotificationsMode,
) {
  i.setState({ notifications: val });
  const form = {
    community_id: i.props.community_view.community.id,
    mode: i.state.notifications,
  };
  i.props.onUpdateCommunityNotifs(form);
}

function handleFollowCommunity(i: CommunitySidebar, follow: boolean) {
  i.setState({ followCommunityLoading: true });
  i.props.onFollowCommunity({
    community_id: i.props.community_view.community.id,
    follow,
  });
}

function handleBlockCommunity(i: CommunitySidebar) {
  const { community, community_actions: { blocked_at } = {} } =
    i.props.community_view;

  i.props.onBlockCommunity({
    community_id: community.id,
    block: !blocked_at,
  });
}
