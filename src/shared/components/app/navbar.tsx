import { showAvatars, showMedia } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { numToSI } from "@utils/helpers";
import {
  amAdmin,
  moderatesPrivateCommunity,
  moderatesSomething,
} from "@utils/roles";
import classNames from "classnames";
import { Component } from "inferno";
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
import { Offcanvas } from "@components/common/offcanvas/offcanvas";
import { Subscription } from "rxjs";
import { tippyMixin } from "../mixins/tippy-mixin";
import { NoOptionI18nKeys } from "i18next";
import { Separator } from "@components/common/separators";

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
  showMobileMenu: boolean;
}

interface NotificationBadgeLinkProps {
  id?: string;
  to: string;
  icon: string;
  count: number;
  label: string;
  isMobileTopBar: boolean;
  onClick: () => void;
}

@tippyMixin
export class Navbar extends Component<NavbarProps, NavbarState> {
  unreadNotifsCountSubscription?: Subscription;
  unreadReportCountSubscription?: Subscription;
  unreadApplicationCountSubscription?: Subscription;
  unreadPendingFollowsSubscription?: Subscription;

  state: NavbarState = {
    unreadNotifsCount: 0,
    unreadReportCount: 0,
    unreadApplicationCount: 0,
    unreadPendingFollowsCount: 0,
    showMobileMenu: false,
  };

  componentWillMount() {
    if (isBrowser()) {
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
    }
  }

  componentWillUnmount() {
    this.unreadNotifsCountSubscription?.unsubscribe();
    this.unreadReportCountSubscription?.unsubscribe();
    this.unreadApplicationCountSubscription?.unsubscribe();
    this.unreadPendingFollowsSubscription?.unsubscribe();
  }

  // TODO class active corresponding to current pages
  render() {
    const siteView = this.props.siteRes?.site_view;
    const person = this.props.myUserInfo?.local_user_view.person;
    const registrationClosed =
      siteView?.local_site.registration_mode === "closed";

    return (
      <div className="shadow-sm">
        <nav
          className="navbar navbar-expand-lg navbar-light p-0 px-3 container-lg"
          id="navbar"
        >
          <NavLink
            id="navTitle"
            to="/"
            title={siteView?.site.summary ?? siteView?.site.name}
            className="d-flex align-items-center navbar-brand me-lg-3"
            onClick={() => handleSetMenuOpen(this, false)}
          >
            {siteView?.site.icon &&
              showAvatars(this.props.myUserInfo) &&
              showMedia(this.props.myUserInfo) && (
                <PictrsImage src={siteView.site.icon} type="icon" />
              )}
            {siteView?.site.name}
          </NavLink>

          {person && (
            <ul className="navbar-nav d-flex flex-row align-items-center gap-2 ms-auto me-2 d-lg-none">
              {this.renderNotificationItems(true)}
            </ul>
          )}

          <button
            className="navbar-toggler border-0 p-2"
            type="button"
            aria-label={I18NextService.i18n.t("expand_here")}
            aria-controls="navbarOffcanvas"
            aria-expanded={this.state.showMobileMenu}
            onClick={() => handleSetMenuOpen(this, true)}
          >
            <Icon icon="menu" />
          </button>

          <Offcanvas
            id="navbarOffcanvas"
            show={this.state.showMobileMenu}
            onClose={() => handleSetMenuOpen(this, false)}
            title={siteView?.site.name}
            headerClasses="py-2 px-3 border-bottom"
            bodyClasses="pt-2 pt-lg-0 pb-3 pb-lg-0 px-2 px-lg-0 w-100"
            isAlwaysMounted
          >
            <ul
              id="navbarLinks"
              className="me-auto navbar-nav align-items-lg-center small"
            >
              <li className="nav-item">
                <NavLink
                  to="/communities"
                  activeClassName="active fw-semibold"
                  className="nav-link text-nowrap py-1 py-lg-2 px-2 rounded"
                  title={I18NextService.i18n.t("communities")}
                  onClick={() => handleSetMenuOpen(this, false)}
                >
                  {I18NextService.i18n.t("communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/multi_communities"
                  activeClassName="active fw-semibold"
                  className="nav-link text-nowrap py-1 py-lg-2 px-2 rounded"
                  title={I18NextService.i18n.t("multi_communities")}
                  onClick={() => handleSetMenuOpen(this, false)}
                >
                  {I18NextService.i18n.t("multi_communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link d-inline-flex align-items-center d-lg-inline-block text-nowrap py-1 py-lg-2 px-2 rounded"
                  title={I18NextService.i18n.t("support_lemmy")}
                  aria-label={I18NextService.i18n.t("support_lemmy")}
                  href={donateLemmyUrl}
                  onClick={() => handleSetMenuOpen(this, false)}
                >
                  <Icon icon="heart" classes="small" />
                  <span className="d-lg-none ms-2">
                    {I18NextService.i18n.t("support_lemmy")}
                  </span>
                </a>
              </li>
            </ul>

            <ul
              id="navbarIcons"
              className="navbar-nav align-items-lg-center gap-lg-1 small my-1 my-lg-0"
            >
              <li id="navSearch" className="nav-item">
                <NavLink
                  to="/search"
                  activeClassName="active fw-semibold"
                  className="nav-link d-inline-flex align-items-center d-lg-inline-block text-nowrap py-1 py-lg-2 px-2 rounded"
                  title={I18NextService.i18n.t("search")}
                  aria-label={I18NextService.i18n.t("search")}
                  onClick={() => handleSetMenuOpen(this, false)}
                >
                  <Icon icon="search" />
                  <span className="d-lg-none ms-2">
                    {I18NextService.i18n.t("search")}
                  </span>
                </NavLink>
              </li>

              {person ? (
                <>
                  {this.renderNotificationItems(false)}

                  <li
                    id="dropdownUser"
                    className="nav-item dropdown d-none d-lg-block"
                  >
                    <button
                      type="button"
                      className="btn btn-sm dropdown-toggle"
                      aria-expanded="false"
                      data-bs-toggle="dropdown"
                    >
                      {showAvatars(this.props.myUserInfo) &&
                        showMedia(this.props.myUserInfo) &&
                        person.avatar && (
                          <PictrsImage src={person.avatar} type="icon" />
                        )}
                      {person.display_name ?? person.name}
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end p-1">
                      {this.renderUserMenuItems(person.name, true)}
                    </ul>
                  </li>

                  <li className="d-lg-none" aria-hidden="true">
                    <Separator classes="my-2" />
                  </li>
                  {this.renderUserMenuItems(person.name, false)}
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <NavLink
                      to="/login"
                      className="nav-link text-nowrap py-1 py-lg-2 px-2 rounded"
                      title={I18NextService.i18n.t("login")}
                      onClick={() => handleSetMenuOpen(this, false)}
                    >
                      {I18NextService.i18n.t("login")}
                    </NavLink>
                  </li>
                  {!registrationClosed && (
                    <li className="nav-item">
                      <NavLink
                        to="/signup"
                        className="nav-link text-nowrap py-1 py-lg-2 px-2 rounded"
                        title={I18NextService.i18n.t("sign_up")}
                        onClick={() => handleSetMenuOpen(this, false)}
                      >
                        {I18NextService.i18n.t("sign_up")}
                      </NavLink>
                    </li>
                  )}
                </>
              )}
            </ul>
          </Offcanvas>
        </nav>
      </div>
    );
  }

  private renderNotificationItems(isMobileTopBar: boolean) {
    const closeMenu = () => handleSetMenuOpen(this, false);

    return (
      <>
        <NotificationBadgeLink
          id={isMobileTopBar ? undefined : "navMessages"}
          to="/notifications"
          icon="bell"
          count={this.state.unreadNotifsCount}
          label={unreadNotificationsCount(this.state.unreadNotifsCount)}
          isMobileTopBar={isMobileTopBar}
          onClick={closeMenu}
        />

        {this.state.unreadReportCount > 0 &&
          moderatesSomething(this.props.myUserInfo) && (
            <NotificationBadgeLink
              id={isMobileTopBar ? undefined : "navModeration"}
              to="/reports"
              icon="shield"
              count={this.state.unreadReportCount}
              label={unreadReportsCount(this.state.unreadReportCount)}
              isMobileTopBar={isMobileTopBar}
              onClick={closeMenu}
            />
          )}

        {this.state.unreadApplicationCount > 0 &&
          amAdmin(this.props.myUserInfo) && (
            <NotificationBadgeLink
              id={isMobileTopBar ? undefined : "navApplications"}
              to="/registration_applications"
              icon="clipboard"
              count={this.state.unreadApplicationCount}
              label={unreadApplicationCount(this.state.unreadApplicationCount)}
              isMobileTopBar={isMobileTopBar}
              onClick={closeMenu}
            />
          )}

        {this.state.unreadPendingFollowsCount > 0 &&
          moderatesPrivateCommunity(this.props.myUserInfo) && (
            <NotificationBadgeLink
              id={isMobileTopBar ? undefined : "navPendingFollows"}
              to="/pending_follows"
              icon="lock"
              count={this.state.unreadPendingFollowsCount}
              label={pendingPrivateCommunityFollowsCount(
                this.state.unreadPendingFollowsCount,
              )}
              isMobileTopBar={isMobileTopBar}
              onClick={closeMenu}
            />
          )}
      </>
    );
  }

  private renderUserMenuItems(personName: string, isDropdown: boolean) {
    const closeMenu = () => handleSetMenuOpen(this, false);

    return (
      <>
        <UserMenuLink
          onClick={closeMenu}
          to={`/u/${personName}`}
          icon="user"
          label="profile"
          isDropdown={isDropdown}
        />
        <UserMenuLink
          onClick={closeMenu}
          to="/settings"
          icon="settings"
          label="settings"
          isDropdown={isDropdown}
        />
        {moderatesSomething(this.props.myUserInfo) && (
          <UserMenuLink
            onClick={closeMenu}
            to="/reports"
            icon="shield"
            label="reports"
            isDropdown={isDropdown}
          />
        )}
        {amAdmin(this.props.myUserInfo) && (
          <UserMenuLink
            onClick={closeMenu}
            to="/registration_applications"
            icon="clipboard"
            label="registration_applications"
            isDropdown={isDropdown}
          />
        )}
        {moderatesPrivateCommunity(this.props.myUserInfo) && (
          <UserMenuLink
            onClick={closeMenu}
            to="/pending_follows"
            icon="lock"
            label="community_pending_follows"
            isDropdown={isDropdown}
          />
        )}
        {isDropdown && (
          <li aria-hidden="true">
            <hr className="dropdown-divider my-1" />
          </li>
        )}

        <li className={isDropdown ? undefined : "nav-item d-lg-none"}>
          <button
            type="button"
            className={classNames(
              "d-flex align-items-center py-1 px-2 rounded w-100 text-start",
              isDropdown
                ? "dropdown-item small"
                : "nav-link border-0 bg-transparent",
            )}
            onClick={() => handleLogOut(this)}
          >
            <Icon icon="log-out" classes="me-2" />
            {I18NextService.i18n.t("logout")}
          </button>
        </li>
      </>
    );
  }
}

function handleSetMenuOpen(i: Navbar, showMobileMenu: boolean) {
  if (i.state.showMobileMenu !== showMobileMenu) {
    i.setState({ showMobileMenu });
  }
}

async function handleLogOut(i: Navbar) {
  await UserService.Instance.logout();
  handleSetMenuOpen(i, false);
}

interface UserMenuLinkProps {
  onClick: () => void;
  to: string;
  icon: string;
  label: NoOptionI18nKeys;
  isDropdown: boolean;
}

function UserMenuLink({
  onClick,
  to,
  icon,
  label,
  isDropdown,
}: UserMenuLinkProps) {
  return (
    <li className={isDropdown ? undefined : "nav-item d-lg-none"}>
      <NavLink
        to={to}
        activeClassName="fw-semibold text-body-emphasis"
        className={classNames(
          "d-flex align-items-center py-1 px-2 rounded",
          isDropdown ? "dropdown-item small" : "nav-link",
        )}
        title={I18NextService.i18n.t(label)}
        onClick={onClick}
      >
        <Icon icon={icon} classes="me-2" />
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

function NotificationBadgeLink({
  id,
  to,
  icon,
  count,
  label,
  isMobileTopBar,
  onClick,
}: NotificationBadgeLinkProps) {
  const formattedNumber = numToSI(count);
  const characterLength = formattedNumber.length;
  return (
    <li
      id={id}
      className={classNames("nav-item", {
        "nav-item-icon": isMobileTopBar,
        "d-none d-lg-block": !isMobileTopBar,
        "me-1": characterLength === 3,
        "me-3": characterLength > 3,
      })}
    >
      <NavLink
        to={to}
        className={classNames("nav-link d-inline-flex align-items-center", {
          "p-2 border-0": isMobileTopBar,
        })}
        title={label}
        aria-label={label}
        onClick={onClick}
      >
        <span className="position-relative d-inline-flex">
          <Icon icon={icon} />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="position-absolute badge rounded-pill text-bg-danger lh-1 icon-badge"
            >
              {formattedNumber}
            </span>
          )}
        </span>
      </NavLink>
    </li>
  );
}
