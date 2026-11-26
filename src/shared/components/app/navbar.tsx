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
import { NavLink, RouterContext } from "inferno-router";
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
            <ul className="navbar-nav d-flex flex-row align-items-center gap-1 ms-auto me-2 d-lg-none">
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
            bodyClasses="pt-2 pt-lg-0 pb-3 pb-lg-0 px-3 px-lg-0"
            isAlwaysMounted
          >
            <ul id="navbarLinks" className="navbar-nav small">
              <li className="nav-item">
                <NavLink
                  to="/communities"
                  className="nav-link text-nowrap py-1 py-lg-2"
                  title={I18NextService.i18n.t("communities")}
                  onClick={() => handleSetMenuOpen(this, false)}
                >
                  {I18NextService.i18n.t("communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/multi_communities"
                  className="nav-link text-nowrap py-1 py-lg-2"
                  title={I18NextService.i18n.t("multi_communities")}
                  onClick={() => handleSetMenuOpen(this, false)}
                >
                  {I18NextService.i18n.t("multi_communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link d-inline-flex align-items-center text-nowrap py-1 py-lg-2"
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
              className="navbar-nav align-items-lg-center small my-1"
            >
              <li id="navSearch" className="nav-item">
                <NavLink
                  to="/search"
                  className="nav-link d-inline-flex align-items-center text-nowrap py-1 py-lg-2"
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
                    <ul
                      className="dropdown-menu dropdown-menu-end small"
                      style={{ "min-width": "fit-content" }}
                    >
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
                      className="nav-link text-nowrap py-1 py-lg-2"
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
                        className="nav-link text-nowrap py-1 py-lg-2"
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
    const itemClasses = classNames("nav-item", {
      "nav-item-icon": isMobileTopBar,
      "d-none d-lg-block": !isMobileTopBar,
    });
    const linkClasses = classNames(
      "nav-link d-inline-flex align-items-center",
      {
        "p-2 border-0": isMobileTopBar,
      },
    );

    const notifsLabel = unreadNotificationsCount(this.state.unreadNotifsCount);
    const reportsLabel = unreadReportsCount(this.state.unreadReportCount);
    const appsLabel = unreadApplicationCount(this.state.unreadApplicationCount);
    const followsLabel = pendingPrivateCommunityFollowsCount(
      this.state.unreadPendingFollowsCount,
    );

    return (
      <>
        <li
          id={isMobileTopBar ? undefined : "navMessages"}
          className={itemClasses}
        >
          <NavLink
            to="/notifications"
            className={classNames(linkClasses, {
              "nav-messages": isMobileTopBar,
            })}
            title={notifsLabel}
            aria-label={notifsLabel}
            onClick={() => handleSetMenuOpen(this, false)}
          >
            <Icon icon="bell" />
            {this.state.unreadNotifsCount > 0 && (
              <span className="ms-1 badge rounded-pill text-bg-danger">
                {numToSI(this.state.unreadNotifsCount)}
              </span>
            )}
          </NavLink>
        </li>

        {this.state.unreadReportCount > 0 &&
          moderatesSomething(this.props.myUserInfo) && (
            <li
              id={isMobileTopBar ? undefined : "navModeration"}
              className={itemClasses}
            >
              <NavLink
                to="/reports"
                className={linkClasses}
                title={reportsLabel}
                aria-label={reportsLabel}
                onClick={() => handleSetMenuOpen(this, false)}
              >
                <Icon icon="shield" />
                <span className="ms-1 badge rounded-pill text-bg-danger">
                  {numToSI(this.state.unreadReportCount)}
                </span>
              </NavLink>
            </li>
          )}

        {this.state.unreadApplicationCount > 0 &&
          amAdmin(this.props.myUserInfo) && (
            <li
              id={isMobileTopBar ? undefined : "navApplications"}
              className={itemClasses}
            >
              <NavLink
                to="/registration_applications"
                className={linkClasses}
                title={appsLabel}
                aria-label={appsLabel}
                onClick={() => handleSetMenuOpen(this, false)}
              >
                <Icon icon="clipboard" />
                <span className="ms-1 badge rounded-pill text-bg-danger">
                  {numToSI(this.state.unreadApplicationCount)}
                </span>
              </NavLink>
            </li>
          )}

        {this.state.unreadPendingFollowsCount > 0 &&
          moderatesPrivateCommunity(this.props.myUserInfo) && (
            <li
              id={isMobileTopBar ? undefined : "navPendingFollows"}
              className={itemClasses}
            >
              <NavLink
                to="/pending_follows"
                className={linkClasses}
                title={followsLabel}
                aria-label={followsLabel}
                onClick={() => handleSetMenuOpen(this, false)}
              >
                <Icon icon="lock" />
                <span className="ms-1 badge rounded-pill text-bg-danger">
                  {numToSI(this.state.unreadPendingFollowsCount)}
                </span>
              </NavLink>
            </li>
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
            <hr className="dropdown-divider" />
          </li>
        )}

        <li className={isDropdown ? undefined : "nav-item d-lg-none"}>
          <button
            type="button"
            className={
              isDropdown
                ? "dropdown-item btn btn-link px-2"
                : "nav-link d-flex align-items-center py-1 w-100 text-start border-0 bg-transparent"
            }
            onClick={() => handleLogOut(this)}
          >
            <Icon icon="log-out" classes={isDropdown ? "me-1" : "me-2"} />
            {I18NextService.i18n.t("logout")}
          </button>
        </li>
      </>
    );
  }

  get currentLocation() {
    const context = this.context as RouterContext;
    return context.router.history.location.pathname;
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
        className={
          isDropdown
            ? "dropdown-item px-2"
            : "nav-link d-flex align-items-center py-1"
        }
        title={I18NextService.i18n.t(label)}
        onClick={onClick}
      >
        <Icon icon={icon} classes={isDropdown ? "me-1" : "me-2"} />
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
