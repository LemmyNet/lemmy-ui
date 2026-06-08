import { showAvatars } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { numToSI } from "@utils/helpers";
import {
  amAdmin,
  moderatesPrivateCommunity,
  moderatesSomething,
} from "@utils/roles";
import { Component, createRef } from "inferno";
import { NavLink } from "inferno-router";
import { GetSiteResponse, MyUserInfo } from "lemmy-js-client";
import { donateLemmyUrl } from "@utils/config";
import {
  I18NextService,
  UserService,
  UnreadCounterService,
} from "../../services";
import { Icon } from "../common/icon";
import { PictrsImage } from "../common/pictrs-image";
import { Subscription } from "rxjs";
import { tippyMixin } from "../mixins/tippy-mixin";
import { RouterContext } from "inferno-router";
import { NoOptionI18nKeys } from "i18next";

interface NavbarProps {
  siteRes?: GetSiteResponse;
  myUserInfo: MyUserInfo | undefined;
}

interface NavbarState {
  onSiteBanner?(url: string): unknown;
  unreadNotifsCount: number;
  unreadReportCount: number;
  unreadApplicationCount: number;
  unreadPendingFollowsCount: number;
}

@tippyMixin
export class Navbar extends Component<NavbarProps, NavbarState> {
  collapseButtonRef = createRef<HTMLButtonElement>();
  mobileMenuRef = createRef<HTMLDivElement>();
  unreadNotifsCountSubscription: Subscription;
  unreadReportCountSubscription: Subscription;
  unreadApplicationCountSubscription: Subscription;
  unreadPendingFollowsSubscription: Subscription;

  state: NavbarState = {
    unreadNotifsCount: 0,
    unreadReportCount: 0,
    unreadApplicationCount: 0,
    unreadPendingFollowsCount: 0,
  };

  componentWillMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      // On the first load, check the unreads
      UnreadCounterService.Instance.configure(this.props.myUserInfo);
      this.unreadNotifsCountSubscription =
        UnreadCounterService.Instance.notificationCount.subscribe(
          unreadNotifsCount => this.setState({ unreadNotifsCount }),
        );
      this.unreadReportCountSubscription =
        UnreadCounterService.Instance.unreadReportCount.subscribe(
          unreadReportCount => this.setState({ unreadReportCount }),
        );
      if (moderatesSomething(this.props.myUserInfo)) {
        this.unreadApplicationCountSubscription =
          UnreadCounterService.Instance.unreadApplicationCount.subscribe(
            unreadApplicationCount => this.setState({ unreadApplicationCount }),
          );
      }
      if (moderatesPrivateCommunity(this.props.myUserInfo)) {
        this.unreadPendingFollowsSubscription =
          UnreadCounterService.Instance.pendingFollowCount.subscribe(
            unreadPendingFollows =>
              this.setState({
                unreadPendingFollowsCount: unreadPendingFollows,
              }),
          );
      }

      document.addEventListener("mouseup", this.outsideMenuClickHandler);
    }
  }

  outsideMenuClickHandler = (e: MouseEvent) => {
    if (!this.mobileMenuRef.current?.contains(e.target as Node | null)) {
      handleCollapseClick(this);
    }
  };

  componentWillUnmount() {
    document.removeEventListener("mouseup", this.outsideMenuClickHandler);
    this.unreadNotifsCountSubscription.unsubscribe();
    this.unreadReportCountSubscription.unsubscribe();
    if (moderatesSomething(this.props.myUserInfo)) {
      this.unreadApplicationCountSubscription.unsubscribe();
    }
    if (moderatesPrivateCommunity(this.props.myUserInfo)) {
      this.unreadPendingFollowsSubscription.unsubscribe();
    }
  }

  // TODO class active corresponding to current pages
  render() {
    const siteView = this.props.siteRes?.site_view;
    const person = this.props.myUserInfo?.local_user_view.person;
    const registrationClosed =
      siteView?.local_site.registration_mode === "closed";

    return (
      <div className="shadow-sm">
        {/* The mobile navbar */}
        <nav
          className="navbar navbar-expand-md navbar-light p-0 px-3 container-lg"
          id="navbar"
        >
          <NavLink
            id="navTitle"
            to="/"
            title={siteView?.site.summary ?? siteView?.site.name}
            className="d-flex align-items-center navbar-brand me-md-3"
            onMouseUp={() => handleCollapseClick(this)}
          >
            {siteView?.site.icon && showAvatars(this.props.myUserInfo) && (
              <PictrsImage src={siteView.site.icon} type="icon" />
            )}
            {siteView?.site.name}
          </NavLink>
          {person && (
            <ul className="navbar-nav d-flex flex-row ms-auto d-md-none">
              {/* Always show the notif button on mobile, but hide the others if the counts are 0. */}
              <li id="navMessages" className="nav-item nav-item-icon">
                <NavLink
                  to="/notifications"
                  className="p-1 nav-link border-0 nav-messages"
                  title={unreadNotificationsCount(this.state.unreadNotifsCount)}
                  onMouseUp={() => handleCollapseClick(this)}
                >
                  <Icon icon="bell" />
                  {this.state.unreadNotifsCount > 0 && (
                    <span className="mx-1 badge rounded-pill text-bg-danger">
                      {numToSI(this.state.unreadNotifsCount)}
                    </span>
                  )}
                </NavLink>
              </li>
              {this.state.unreadReportCount > 0 &&
                moderatesSomething(this.props.myUserInfo) && (
                  <li className="nav-item nav-item-icon">
                    <NavLink
                      to="/reports"
                      className="p-1 nav-link border-0"
                      title={unreadReportsCount(this.state.unreadReportCount)}
                      onMouseUp={() => handleCollapseClick(this)}
                    >
                      <Icon icon="shield" />
                      <span className="mx-1 badge rounded-pill text-bg-danger">
                        {numToSI(this.state.unreadReportCount)}
                      </span>
                    </NavLink>
                  </li>
                )}
              {this.state.unreadApplicationCount > 0 &&
                amAdmin(this.props.myUserInfo) && (
                  <li className="nav-item nav-item-icon">
                    <NavLink
                      to="/registration_applications"
                      className="p-1 nav-link border-0"
                      title={unreadApplicationCount(
                        this.state.unreadApplicationCount,
                      )}
                      onMouseUp={() => handleCollapseClick(this)}
                    >
                      <Icon icon="clipboard" />
                      <span className="mx-1 badge rounded-pill text-bg-danger">
                        {numToSI(this.state.unreadApplicationCount)}
                      </span>
                    </NavLink>
                  </li>
                )}
              {this.state.unreadPendingFollowsCount > 0 &&
                moderatesPrivateCommunity(this.props.myUserInfo) && (
                  <li className="nav-item nav-item-icon">
                    <NavLink
                      to="/pending_follows"
                      className="p-1 nav-link border-0"
                      title={pendingPrivateCommunityFollowsCount(
                        this.state.unreadPendingFollowsCount,
                      )}
                      onMouseUp={() => handleCollapseClick(this)}
                    >
                      <Icon icon="lock" />
                      <span className="mx-1 badge rounded-pill text-bg-danger">
                        {numToSI(this.state.unreadPendingFollowsCount)}
                      </span>
                    </NavLink>
                  </li>
                )}
            </ul>
          )}
          {/* The wide-screen navbar */}
          <button
            className="navbar-toggler border-0 p-1"
            type="button"
            aria-label="menu"
            data-tippy-content={I18NextService.i18n.t("expand_here")}
            data-bs-toggle="collapse"
            data-bs-target="#navbarDropdown"
            aria-controls="navbarDropdown"
            aria-expanded="false"
            ref={this.collapseButtonRef}
          >
            <Icon icon="menu" />
          </button>
          <div
            className="collapse navbar-collapse my-2"
            id="navbarDropdown"
            ref={this.mobileMenuRef}
          >
            <ul id="navbarLinks" className="me-auto navbar-nav">
              <li className="nav-item">
                <NavLink
                  to="/communities"
                  className="nav-link"
                  title={I18NextService.i18n.t("communities")}
                  onMouseUp={() => handleCollapseClick(this)}
                >
                  {I18NextService.i18n.t("communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/multi_communities"
                  className="nav-link"
                  title={I18NextService.i18n.t("multi_communities")}
                  onMouseUp={() => handleCollapseClick(this)}
                >
                  {I18NextService.i18n.t("multi_communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link d-inline-flex align-items-center d-md-inline-block"
                  title={I18NextService.i18n.t("support_lemmy")}
                  href={donateLemmyUrl}
                >
                  <Icon icon="heart" classes="small" />
                  <span className="d-inline ms-1 d-md-none ms-md-0">
                    {I18NextService.i18n.t("support_lemmy")}
                  </span>
                </a>
              </li>
            </ul>
            <ul id="navbarIcons" className="navbar-nav">
              <li id="navSearch" className="nav-item">
                <NavLink
                  to="/search"
                  className="nav-link d-inline-flex align-items-center d-md-inline-block"
                  title={I18NextService.i18n.t("search")}
                  onMouseUp={() => handleCollapseClick(this)}
                >
                  <Icon icon="search" />
                  <span className="d-inline ms-1 d-md-none ms-md-0">
                    {I18NextService.i18n.t("search")}
                  </span>
                </NavLink>
              </li>
              {person ? (
                <>
                  <li id="navMessages" className="nav-item">
                    <NavLink
                      className="nav-link d-inline-flex align-items-center d-md-inline-block"
                      to="/notifications"
                      title={unreadNotificationsCount(
                        this.state.unreadNotifsCount,
                      )}
                      onMouseUp={() => handleCollapseClick(this)}
                    >
                      <Icon icon="bell" />
                      <span className="badge rounded-pill text-bg-danger d-inline ms-1 d-md-none ms-md-0">
                        {unreadNotificationsCount(this.state.unreadNotifsCount)}
                      </span>
                      {this.state.unreadNotifsCount > 0 && (
                        <span className="mx-1 badge rounded-pill text-bg-danger">
                          {numToSI(this.state.unreadNotifsCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                  {moderatesSomething(this.props.myUserInfo) &&
                    this.state.unreadReportCount > 0 && (
                      <li id="navModeration" className="nav-item">
                        <NavLink
                          className="nav-link d-inline-flex align-items-center d-md-inline-block"
                          to="/reports"
                          title={unreadReportsCount(
                            this.state.unreadReportCount,
                          )}
                          onMouseUp={() => handleCollapseClick(this)}
                        >
                          <Icon icon="shield" />
                          <span className="badge rounded-pill text-bg-danger d-inline ms-1 d-md-none ms-md-0">
                            {pendingPrivateCommunityFollowsCount(
                              this.state.unreadPendingFollowsCount,
                            )}
                          </span>
                          {this.state.unreadReportCount > 0 && (
                            <span className="mx-1 badge rounded-pill text-bg-danger">
                              {numToSI(this.state.unreadReportCount)}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    )}
                  {amAdmin(this.props.myUserInfo) &&
                    this.state.unreadApplicationCount > 0 && (
                      <li id="navApplications" className="nav-item">
                        <NavLink
                          to="/registration_applications"
                          className="nav-link d-inline-flex align-items-center d-md-inline-block"
                          title={unreadApplicationCount(
                            this.state.unreadApplicationCount,
                          )}
                          onMouseUp={() => handleCollapseClick(this)}
                        >
                          <Icon icon="clipboard" />
                          <span className="badge rounded-pill text-bg-danger d-inline ms-1 d-md-none ms-md-0">
                            {unreadApplicationCount(
                              this.state.unreadApplicationCount,
                            )}
                          </span>
                          {this.state.unreadApplicationCount > 0 && (
                            <span className="mx-1 badge rounded-pill text-bg-danger">
                              {numToSI(this.state.unreadApplicationCount)}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    )}
                  {moderatesPrivateCommunity(this.props.myUserInfo) &&
                    this.state.unreadPendingFollowsCount > 0 && (
                      <li id="navApplications" className="nav-item">
                        <NavLink
                          to="/pending_follows"
                          className="nav-link d-inline-flex align-items-center d-md-inline-block"
                          title={pendingPrivateCommunityFollowsCount(
                            this.state.unreadPendingFollowsCount,
                          )}
                          onMouseUp={() => handleCollapseClick(this)}
                        >
                          <Icon icon="lock" />
                          <span className="badge rounded-pill text-bg-danger d-inline ms-1 d-md-none ms-md-0">
                            {pendingPrivateCommunityFollowsCount(
                              this.state.unreadPendingFollowsCount,
                            )}
                          </span>
                          {this.state.unreadPendingFollowsCount > 0 && (
                            <span className="mx-1 badge rounded-pill text-bg-danger">
                              {numToSI(this.state.unreadPendingFollowsCount)}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    )}
                  {person && (
                    <li id="dropdownUser" className="dropdown">
                      <button
                        type="button"
                        className="btn dropdown-toggle"
                        aria-expanded="false"
                        data-bs-toggle="dropdown"
                      >
                        {showAvatars(this.props.myUserInfo) &&
                          person.avatar && (
                            <PictrsImage src={person.avatar} type="icon" />
                          )}
                        {person.display_name ?? person.name}
                      </button>
                      <ul
                        className="dropdown-menu dropdown-menu-end"
                        style={{ "min-width": "fit-content" }}
                      >
                        <MyNavLink
                          onClick={() => handleCollapseClick(this)}
                          to={`/u/${person.name}`}
                          icon="user"
                          label="profile"
                        />
                        <MyNavLink
                          onClick={() => handleCollapseClick(this)}
                          to="/settings"
                          icon="settings"
                          label="settings"
                        />
                        {moderatesSomething(this.props.myUserInfo) && (
                          <MyNavLink
                            onClick={() => handleCollapseClick(this)}
                            to="/reports"
                            icon="shield"
                            label="reports"
                          />
                        )}
                        {amAdmin(this.props.myUserInfo) && (
                          <MyNavLink
                            onClick={() => handleCollapseClick(this)}
                            to="/registration_applications"
                            icon="clipboard"
                            label="registration_applications"
                          />
                        )}
                        {moderatesPrivateCommunity(this.props.myUserInfo) && (
                          <MyNavLink
                            onClick={() => handleCollapseClick(this)}
                            to="/pending_follows"
                            icon="lock"
                            label="community_pending_follows"
                          />
                        )}
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <button
                            className="dropdown-item btn btn-link px-2"
                            onClick={() => handleLogOut(this)}
                          >
                            <Icon icon="log-out" classes="me-1" />
                            {I18NextService.i18n.t("logout")}
                          </button>
                        </li>
                      </ul>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <NavLink
                      to="/login"
                      className="nav-link"
                      title={I18NextService.i18n.t("login")}
                      onMouseUp={() => handleCollapseClick(this)}
                    >
                      {I18NextService.i18n.t("login")}
                    </NavLink>
                  </li>
                  {!registrationClosed && (
                    <li className="nav-item">
                      <NavLink
                        to="/signup"
                        className="nav-link"
                        title={I18NextService.i18n.t("sign_up")}
                        onMouseUp={() => handleCollapseClick(this)}
                      >
                        {I18NextService.i18n.t("sign_up")}
                      </NavLink>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </nav>
      </div>
    );
  }

  get currentLocation() {
    const context = this.context as RouterContext;
    return context.router.history.location.pathname;
  }
}

function handleCollapseClick(i: Navbar) {
  if (
    i.collapseButtonRef.current?.attributes &&
    i.collapseButtonRef.current?.attributes.getNamedItem("aria-expanded")
      ?.value === "true"
  ) {
    i.collapseButtonRef.current?.click();
  }
}

async function handleLogOut(i: Navbar) {
  await UserService.Instance.logout();
  handleCollapseClick(i);
}

interface MyNavLinkProps {
  onClick: () => void;
  to: string;
  icon: string;
  label: NoOptionI18nKeys;
}

function MyNavLink({ onClick, to, icon, label }: MyNavLinkProps) {
  return (
    <li>
      <NavLink
        to={to}
        className="dropdown-item px-2"
        title={I18NextService.i18n.t(label)}
        onClick={onClick}
      >
        <Icon icon={icon} classes="me-1" />
        {I18NextService.i18n.t(label)}
      </NavLink>
    </li>
  );
}

function unreadReportsCount(unreadReportCount: number) {
  return I18NextService.i18n.t("unread_reports", {
    count: Number(unreadReportCount),
    formattedCount: numToSI(unreadReportCount),
  });
}

function unreadApplicationCount(unreadApplicationCount: number) {
  return I18NextService.i18n.t("unread_registration_applications", {
    count: Number(unreadApplicationCount),
    formattedCount: numToSI(unreadApplicationCount),
  });
}

function pendingPrivateCommunityFollowsCount(
  unreadPendingFollowsCount: number,
) {
  return I18NextService.i18n.t("pending_private_community_follows", {
    count: Number(unreadPendingFollowsCount),
    formattedCount: numToSI(unreadPendingFollowsCount),
  });
}

function unreadNotificationsCount(unreadNotifsCount: number) {
  return I18NextService.i18n.t("unread_messages", {
    count: Number(unreadNotifsCount),
    formattedCount: numToSI(unreadNotifsCount),
  });
}
