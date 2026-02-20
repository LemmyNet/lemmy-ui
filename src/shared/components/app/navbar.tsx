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
import { RouterContext } from "inferno-router/dist/Router";

interface NavbarProps {
  siteRes?: GetSiteResponse;
  myUserInfo: MyUserInfo | undefined;
}

interface NavbarState {
  onSiteBanner?(url: string): any;
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

  async componentWillMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      // On the first load, check the unreads
      await UnreadCounterService.Instance.configure(this.props.myUserInfo);
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

      document.addEventListener("mouseup", e =>
        handleOutsideMenuClick(this, e),
      );
    }
  }

  componentWillUnmount() {
    document.removeEventListener("mouseup", e =>
      handleOutsideMenuClick(this, e),
    );
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
              <PictrsImage src={siteView.site.icon} icon />
            )}
            {siteView?.site.name}
          </NavLink>
          {person && (
            <ul className="navbar-nav d-flex flex-row ms-auto d-md-none">
              <li id="navMessages" className="nav-item nav-item-icon">
                <NavLink
                  to="/notifications"
                  className="p-1 nav-link border-0 nav-messages"
                  title={I18NextService.i18n.t("unread_messages", {
                    count: Number(this.state.unreadNotifsCount),
                    formattedCount: numToSI(this.state.unreadNotifsCount),
                  })}
                  onMouseUp={() => handleCollapseClick(this)}
                >
                  <Icon icon="bell" />
                  {this.state.unreadNotifsCount > 0 && (
                    <span className="mx-1 badge text-bg-light">
                      {numToSI(this.state.unreadNotifsCount)}
                    </span>
                  )}
                </NavLink>
              </li>
              {moderatesSomething(this.props.myUserInfo) && (
                <li className="nav-item nav-item-icon">
                  <NavLink
                    to="/reports"
                    className="p-1 nav-link border-0"
                    title={I18NextService.i18n.t("unread_reports", {
                      count: Number(this.state.unreadReportCount),
                      formattedCount: numToSI(this.state.unreadReportCount),
                    })}
                    onMouseUp={() => handleCollapseClick(this)}
                  >
                    <Icon icon="shield" />
                    {this.state.unreadReportCount > 0 && (
                      <span className="mx-1 badge text-bg-light">
                        {numToSI(this.state.unreadReportCount)}
                      </span>
                    )}
                  </NavLink>
                </li>
              )}
              {/* TODO: what is this section for and why does it duplicate everything? */}
              {amAdmin(this.props.myUserInfo) && (
                <li className="nav-item nav-item-icon">
                  <NavLink
                    to="/registration_applications"
                    className="p-1 nav-link border-0"
                    title={I18NextService.i18n.t(
                      "unread_registration_applications",
                      {
                        count: Number(this.state.unreadApplicationCount),
                        formattedCount: numToSI(
                          this.state.unreadApplicationCount,
                        ),
                      },
                    )}
                    onMouseUp={() => handleCollapseClick(this)}
                  >
                    <Icon icon="clipboard" />
                    {this.state.unreadApplicationCount > 0 && (
                      <span className="mx-1 badge text-bg-light">
                        {numToSI(this.state.unreadApplicationCount)}
                      </span>
                    )}
                  </NavLink>
                </li>
              )}
            </ul>
          )}
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
                      title={I18NextService.i18n.t("unread_messages", {
                        count: Number(this.state.unreadNotifsCount),
                        formattedCount: numToSI(this.state.unreadNotifsCount),
                      })}
                      onMouseUp={() => handleCollapseClick(this)}
                    >
                      <Icon icon="bell" />
                      <span className="badge text-bg-light d-inline ms-1 d-md-none ms-md-0">
                        {I18NextService.i18n.t("unread_messages", {
                          count: Number(this.state.unreadNotifsCount),
                          formattedCount: numToSI(this.state.unreadNotifsCount),
                        })}
                      </span>
                      {this.state.unreadNotifsCount > 0 && (
                        <span className="mx-1 badge text-bg-light">
                          {numToSI(this.state.unreadNotifsCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                  {moderatesSomething(this.props.myUserInfo) && (
                    <li id="navModeration" className="nav-item">
                      <NavLink
                        className="nav-link d-inline-flex align-items-center d-md-inline-block"
                        to="/reports"
                        title={I18NextService.i18n.t("unread_reports", {
                          count: Number(this.state.unreadReportCount),
                          formattedCount: numToSI(this.state.unreadReportCount),
                        })}
                        onMouseUp={() => handleCollapseClick(this)}
                      >
                        <Icon icon="shield" />
                        <span className="badge text-bg-light d-inline ms-1 d-md-none ms-md-0">
                          {I18NextService.i18n.t("unread_reports", {
                            count: Number(this.state.unreadReportCount),
                            formattedCount: numToSI(
                              this.state.unreadReportCount,
                            ),
                          })}
                        </span>
                        {this.state.unreadReportCount > 0 && (
                          <span className="mx-1 badge text-bg-light">
                            {numToSI(this.state.unreadReportCount)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )}
                  {amAdmin(this.props.myUserInfo) && (
                    <li id="navApplications" className="nav-item">
                      <NavLink
                        to="/registration_applications"
                        className="nav-link d-inline-flex align-items-center d-md-inline-block"
                        title={I18NextService.i18n.t(
                          "unread_registration_applications",
                          {
                            count: Number(this.state.unreadApplicationCount),
                            formattedCount: numToSI(
                              this.state.unreadApplicationCount,
                            ),
                          },
                        )}
                        onMouseUp={() => handleCollapseClick(this)}
                      >
                        <Icon icon="clipboard" />
                        <span className="badge text-bg-light d-inline ms-1 d-md-none ms-md-0">
                          {I18NextService.i18n.t(
                            "unread_registration_applications",
                            {
                              count: Number(this.state.unreadApplicationCount),
                              formattedCount: numToSI(
                                this.state.unreadApplicationCount,
                              ),
                            },
                          )}
                        </span>
                        {this.state.unreadApplicationCount > 0 && (
                          <span className="mx-1 badge text-bg-light">
                            {numToSI(this.state.unreadApplicationCount)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )}
                  {moderatesPrivateCommunity(this.props.myUserInfo) && (
                    <li id="navApplications" className="nav-item">
                      <NavLink
                        to="/pending_follows"
                        className="nav-link d-inline-flex align-items-center d-md-inline-block"
                        title={I18NextService.i18n.t(
                          "pending_private_community_follows",
                          {
                            count: Number(this.state.unreadPendingFollowsCount),
                            formattedCount: numToSI(
                              this.state.unreadPendingFollowsCount,
                            ),
                          },
                        )}
                        onMouseUp={() => handleCollapseClick(this)}
                      >
                        <Icon icon="lock" />
                        <span className="badge text-bg-light d-inline ms-1 d-md-none ms-md-0">
                          {I18NextService.i18n.t(
                            "pending_private_community_follows",
                            {
                              count: Number(
                                this.state.unreadPendingFollowsCount,
                              ),
                              formattedCount: numToSI(
                                this.state.unreadPendingFollowsCount,
                              ),
                            },
                          )}
                        </span>
                        {this.state.unreadPendingFollowsCount > 0 && (
                          <span className="mx-1 badge text-bg-light">
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
                            <PictrsImage src={person.avatar} icon />
                          )}
                        {person.display_name ?? person.name}
                      </button>
                      <ul
                        className="dropdown-menu"
                        style={{ "min-width": "fit-content" }}
                      >
                        <li>
                          <NavLink
                            to={`/u/${person.name}`}
                            className="dropdown-item px-2"
                            title={I18NextService.i18n.t("profile")}
                            onMouseUp={() => handleCollapseClick(this)}
                          >
                            <Icon icon="user" classes="me-1" />
                            {I18NextService.i18n.t("profile")}
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/settings"
                            className="dropdown-item px-2"
                            title={I18NextService.i18n.t("settings")}
                            onMouseUp={() => handleCollapseClick(this)}
                          >
                            <Icon icon="settings" classes="me-1" />
                            {I18NextService.i18n.t("settings")}
                          </NavLink>
                        </li>
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
    const context: RouterContext = this.context;
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

function handleOutsideMenuClick(i: Navbar, event: MouseEvent) {
  if (!i.mobileMenuRef.current?.contains(event.target as Node | null)) {
    handleCollapseClick(i);
  }
}
