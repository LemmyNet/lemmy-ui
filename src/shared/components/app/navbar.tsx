import { Component, createRef, linkEvent } from "inferno";
import { NavLink } from "inferno-router";
import {
  GetReportCountResponse,
  GetSiteResponse,
  GetUnreadCountResponse,
  GetUnreadRegistrationApplicationCountResponse,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import {
  HttpService,
  RequestState,
  apiWrapper,
} from "../../services/HttpService";
import {
  amAdmin,
  canCreateCommunity,
  donateLemmyUrl,
  isBrowser,
  myAuth,
  numToSI,
  showAvatars,
  toast,
} from "../../utils";
import { Icon } from "../common/icon";
import { PictrsImage } from "../common/pictrs-image";

interface NavbarProps {
  siteRes?: GetSiteResponse;
}

interface NavbarState {
  unreadInboxCountRes: RequestState<GetUnreadCountResponse>;
  unreadReportCountRes: RequestState<GetReportCountResponse>;
  unreadApplicationCountRes: RequestState<GetUnreadRegistrationApplicationCountResponse>;
  expanded: boolean;
  showDropdown: boolean;
  onSiteBanner?(url: string): any;
}

function handleCollapseClick(i: Navbar) {
  if (i.collapseButtonRef.current?.ariaExpanded === "true") {
    i.collapseButtonRef.current?.click();
  }
}

function handleLogOut() {
  UserService.Instance.logout();
}

export class Navbar extends Component<NavbarProps, NavbarState> {
  state: NavbarState = {
    unreadInboxCountRes: { state: "empty" },
    unreadReportCountRes: { state: "empty" },
    unreadApplicationCountRes: { state: "empty" },
    expanded: false,
    showDropdown: false,
  };
  subscription: any;
  collapseButtonRef = createRef<HTMLButtonElement>();

  constructor(props: any, context: any) {
    super(props, context);
  }

  async componentDidMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      // On the first load, check the unreads
      this.requestNotificationPermission();
      await this.fetchUnreads();
      this.requestNotificationPermission();
    }
  }

  render() {
    return this.navbar();
  }

  // TODO class active corresponding to current page
  navbar() {
    const siteView = this.props.siteRes?.site_view;
    const person = UserService.Instance.myUserInfo?.local_user_view.person;
    return (
      <nav className="navbar navbar-expand-md navbar-light shadow-sm p-0 px-3 container-lg">
        <NavLink
          to="/"
          title={siteView?.site.description ?? siteView?.site.name}
          className="d-flex align-items-center navbar-brand mr-md-3"
          onMouseUp={linkEvent(this, handleCollapseClick)}
        >
          {siteView?.site.icon && showAvatars() && (
            <PictrsImage src={siteView.site.icon} icon />
          )}
          {siteView?.site.name}
        </NavLink>
        {person && (
          <ul className="navbar-nav d-flex flex-row ml-auto d-md-none">
            <li className="nav-item">
              <NavLink
                to="/inbox"
                className="p-1 nav-link border-0"
                title={i18n.t("unread_messages", {
                  count: Number(this.state.unreadApplicationCountRes.state),
                  formattedCount: numToSI(this.unreadInboxCount),
                })}
                onMouseUp={linkEvent(this, handleCollapseClick)}
              >
                <Icon icon="bell" />
                {this.unreadInboxCount > 0 && (
                  <span className="mx-1 badge badge-light">
                    {numToSI(this.unreadInboxCount)}
                  </span>
                )}
              </NavLink>
            </li>
            {this.moderatesSomething && (
              <li className="nav-item">
                <NavLink
                  to="/reports"
                  className="p-1 nav-link border-0"
                  title={i18n.t("unread_reports", {
                    count: Number(this.unreadReportCount),
                    formattedCount: numToSI(this.unreadReportCount),
                  })}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="shield" />
                  {this.unreadReportCount > 0 && (
                    <span className="mx-1 badge badge-light">
                      {numToSI(this.unreadReportCount)}
                    </span>
                  )}
                </NavLink>
              </li>
            )}
            {amAdmin() && (
              <li className="nav-item">
                <NavLink
                  to="/registration_applications"
                  className="p-1 nav-link border-0"
                  title={i18n.t("unread_registration_applications", {
                    count: Number(this.unreadApplicationCount),
                    formattedCount: numToSI(this.unreadApplicationCount),
                  })}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="clipboard" />
                  {this.unreadApplicationCount > 0 && (
                    <span className="mx-1 badge badge-light">
                      {numToSI(this.unreadApplicationCount)}
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
          data-tippy-content={i18n.t("expand_here")}
          data-bs-toggle="collapse"
          data-bs-target="#navbarDropdown"
          aria-controls="navbarDropdown"
          aria-expanded="false"
          ref={this.collapseButtonRef}
        >
          <Icon icon="menu" />
        </button>
        <div className="collapse navbar-collapse my-2" id="navbarDropdown">
          <ul className="mr-auto navbar-nav">
            <li className="nav-item">
              <NavLink
                to="/communities"
                className="nav-link"
                title={i18n.t("communities")}
                onMouseUp={linkEvent(this, handleCollapseClick)}
              >
                {i18n.t("communities")}
              </NavLink>
            </li>
            <li className="nav-item">
              {/* TODO make sure this works: https://github.com/infernojs/inferno/issues/1608 */}
              <NavLink
                to={{
                  pathname: "/create_post",
                  search: "",
                  hash: "",
                  key: "",
                  state: { prevPath: this.currentLocation },
                }}
                className="nav-link"
                title={i18n.t("create_post")}
                onMouseUp={linkEvent(this, handleCollapseClick)}
              >
                {i18n.t("create_post")}
              </NavLink>
            </li>
            {this.props.siteRes && canCreateCommunity(this.props.siteRes) && (
              <li className="nav-item">
                <NavLink
                  to="/create_community"
                  className="nav-link"
                  title={i18n.t("create_community")}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  {i18n.t("create_community")}
                </NavLink>
              </li>
            )}
            <li className="nav-item">
              <a
                className="nav-link"
                title={i18n.t("support_lemmy")}
                href={donateLemmyUrl}
              >
                <Icon icon="heart" classes="small" />
              </a>
            </li>
          </ul>
          <ul className="navbar-nav">
            {!this.context.router.history.location.pathname.match(
              /^\/search/
            ) && (
              <li className="nav-item">
                <NavLink
                  to="/search"
                  className="nav-link"
                  title={i18n.t("search")}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="search" />
                </NavLink>
              </li>
            )}
            {amAdmin() && (
              <li className="nav-item">
                <NavLink
                  to="/admin"
                  className="nav-link"
                  title={i18n.t("admin_settings")}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="settings" />
                </NavLink>
              </li>
            )}
            {person ? (
              <>
                <li className="nav-item">
                  <NavLink
                    className="nav-link"
                    to="/inbox"
                    title={i18n.t("unread_messages", {
                      count: Number(this.unreadInboxCount),
                      formattedCount: numToSI(this.unreadInboxCount),
                    })}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
                  >
                    <Icon icon="bell" />
                    {this.unreadInboxCount > 0 && (
                      <span className="mx-1 badge badge-light">
                        {numToSI(this.unreadInboxCount)}
                      </span>
                    )}
                  </NavLink>
                </li>
                {this.moderatesSomething && (
                  <li className="nav-item">
                    <NavLink
                      className="nav-link"
                      to="/reports"
                      title={i18n.t("unread_reports", {
                        count: Number(this.unreadReportCount),
                        formattedCount: numToSI(this.unreadReportCount),
                      })}
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      <Icon icon="shield" />
                      {this.unreadReportCount > 0 && (
                        <span className="mx-1 badge badge-light">
                          {numToSI(this.unreadReportCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )}
                {amAdmin() && (
                  <li className="nav-item">
                    <NavLink
                      to="/registration_applications"
                      className="nav-link"
                      title={i18n.t("unread_registration_applications", {
                        count: Number(this.unreadApplicationCount),
                        formattedCount: numToSI(this.unreadApplicationCount),
                      })}
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      <Icon icon="clipboard" />
                      {this.unreadApplicationCount > 0 && (
                        <span className="mx-1 badge badge-light">
                          {numToSI(this.unreadApplicationCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )}
                {person && (
                  <div className="dropdown">
                    <button
                      className="btn dropdown-toggle"
                      role="button"
                      aria-expanded="false"
                      data-bs-toggle="dropdown"
                    >
                      {showAvatars() && person.avatar && (
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
                          title={i18n.t("profile")}
                          onMouseUp={linkEvent(this, handleCollapseClick)}
                        >
                          <Icon icon="user" classes="mr-1" />
                          {i18n.t("profile")}
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/settings"
                          className="dropdown-item px-2"
                          title={i18n.t("settings")}
                          onMouseUp={linkEvent(this, handleCollapseClick)}
                        >
                          <Icon icon="settings" classes="mr-1" />
                          {i18n.t("settings")}
                        </NavLink>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        <button
                          className="dropdown-item btn btn-link px-2"
                          onClick={handleLogOut}
                        >
                          <Icon icon="log-out" classes="mr-1" />
                          {i18n.t("logout")}
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <li className="nav-item">
                  <NavLink
                    to="/login"
                    className="nav-link"
                    title={i18n.t("login")}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
                  >
                    {i18n.t("login")}
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/signup"
                    className="nav-link"
                    title={i18n.t("sign_up")}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
                  >
                    {i18n.t("sign_up")}
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>
    );
  }

  get moderatesSomething(): boolean {
    const mods = UserService.Instance.myUserInfo?.moderates;
    const moderatesS = (mods && mods.length > 0) || false;
    return amAdmin() || moderatesS;
  }

  handleToggleExpandNavbar(i: Navbar) {
    i.setState({ expanded: !i.state.expanded });
  }

  handleHideExpandNavbar(i: Navbar) {
    i.setState({ expanded: false, showDropdown: false });
  }

  handleLogoutClick(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    UserService.Instance.logout();
  }

  handleToggleDropdown(i: Navbar) {
    i.setState({ showDropdown: !i.state.showDropdown });
  }

  async fetchUnreads() {
    const auth = myAuth();
    if (auth) {
      this.setState({ unreadInboxCountRes: { state: "loading" } });
      this.setState({
        unreadInboxCountRes: await apiWrapper(
          HttpService.client.getUnreadCount({ auth })
        ),
      });

      if (this.moderatesSomething) {
        this.setState({ unreadReportCountRes: { state: "loading" } });
        this.setState({
          unreadReportCountRes: await apiWrapper(
            HttpService.client.getReportCount({ auth })
          ),
        });
      }

      if (amAdmin()) {
        this.setState({ unreadApplicationCountRes: { state: "loading" } });
        this.setState({
          unreadApplicationCountRes: await apiWrapper(
            HttpService.client.getUnreadRegistrationApplicationCount({
              auth,
            })
          ),
        });
      }
    }
  }

  get unreadInboxCount(): number {
    if (this.state.unreadInboxCountRes.state == "success") {
      const data = this.state.unreadInboxCountRes.data;
      return data.replies + data.mentions + data.private_messages;
    } else {
      return 0;
    }
  }

  get unreadReportCount(): number {
    if (this.state.unreadReportCountRes.state == "success") {
      const data = this.state.unreadReportCountRes.data;
      return (
        data.post_reports +
        data.comment_reports +
        (data.private_message_reports ?? 0)
      );
    } else {
      return 0;
    }
  }

  get unreadApplicationCount(): number {
    if (this.state.unreadApplicationCountRes.state == "success") {
      const data = this.state.unreadApplicationCountRes.data;
      return data.registration_applications;
    } else {
      return 0;
    }
  }

  get currentLocation() {
    return this.context.router.history.location.pathname;
  }

  requestNotificationPermission() {
    if (UserService.Instance.myUserInfo) {
      document.addEventListener("DOMContentLoaded", function () {
        if (!Notification) {
          toast(i18n.t("notifications_error"), "danger");
          return;
        }

        if (Notification.permission !== "granted")
          Notification.requestPermission();
      });
    }
  }
}
