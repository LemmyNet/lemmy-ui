import { showAvatars } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { numToSI } from "@utils/helpers";
import { amAdmin, canCreateCommunity } from "@utils/roles";
import { Component, createRef, linkEvent } from "inferno";
import { NavLink } from "inferno-router";
import { GetSiteResponse } from "lemmy-js-client";
import { donateLemmyUrl } from "../../config";
import {
  I18NextService,
  UserService,
  UnreadCounterService,
} from "../../services";
import { toast } from "../../toast";
import { Icon } from "../common/icon";
import { PictrsImage } from "../common/pictrs-image";
import { Subscription } from "rxjs";
import { tippyMixin } from "../mixins/tippy-mixin";

interface NavbarProps {
  siteRes?: GetSiteResponse;
}

interface NavbarState {
  onSiteBanner?(url: string): any;
  unreadInboxCount: number;
  unreadReportCount: number;
  unreadApplicationCount: number;
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

function handleLogOut(i: Navbar) {
  UserService.Instance.logout();
  handleCollapseClick(i);
}

@tippyMixin
export class Navbar extends Component<NavbarProps, NavbarState> {
  collapseButtonRef = createRef<HTMLButtonElement>();
  mobileMenuRef = createRef<HTMLDivElement>();
  unreadInboxCountSubscription: Subscription;
  unreadReportCountSubscription: Subscription;
  unreadApplicationCountSubscription: Subscription;

  state: NavbarState = {
    unreadInboxCount: 0,
    unreadReportCount: 0,
    unreadApplicationCount: 0,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleOutsideMenuClick = this.handleOutsideMenuClick.bind(this);
  }

  async componentDidMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      // On the first load, check the unreads
      this.requestNotificationPermission();
      this.unreadInboxCountSubscription =
        UnreadCounterService.Instance.unreadInboxCountSubject.subscribe(
          unreadInboxCount => this.setState({ unreadInboxCount }),
        );
      this.unreadReportCountSubscription =
        UnreadCounterService.Instance.unreadReportCountSubject.subscribe(
          unreadReportCount => this.setState({ unreadReportCount }),
        );
      this.unreadApplicationCountSubscription =
        UnreadCounterService.Instance.unreadApplicationCountSubject.subscribe(
          unreadApplicationCount => this.setState({ unreadApplicationCount }),
        );

      document.addEventListener("mouseup", this.handleOutsideMenuClick);
    }
  }

  componentWillUnmount() {
    document.removeEventListener("mouseup", this.handleOutsideMenuClick);
    this.unreadInboxCountSubscription.unsubscribe();
    this.unreadReportCountSubscription.unsubscribe();
    this.unreadApplicationCountSubscription.unsubscribe();
  }

  // TODO class active corresponding to current pages
  render() {
    const siteView = this.props.siteRes?.site_view;
    const person = UserService.Instance.myUserInfo?.local_user_view.person;
    return (
      <div className="shadow-sm">
        <nav
          className="navbar navbar-expand-md navbar-light p-0 px-3 container-lg"
          id="navbar"
        >
          <NavLink
            id="navTitle"
            to="/"
            title={siteView?.site.description ?? siteView?.site.name}
            className="d-flex align-items-center navbar-brand me-md-3"
            onMouseUp={linkEvent(this, handleCollapseClick)}
          >
            {siteView?.site.icon && showAvatars() && (
              <PictrsImage src={siteView.site.icon} icon />
            )}
            {siteView?.site.name}
          </NavLink>
          {person && (
            <ul className="navbar-nav d-flex flex-row ms-auto d-md-none">
              <li id="navMessages" className="nav-item nav-item-icon">
                <NavLink
                  to="/inbox"
                  className="p-1 nav-link border-0 nav-messages"
                  title={I18NextService.i18n.t("unread_messages", {
                    count: Number(this.state.unreadInboxCount),
                    formattedCount: numToSI(this.state.unreadInboxCount),
                  })}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="bell" />
                  {this.state.unreadInboxCount > 0 && (
                    <span className="mx-1 badge text-bg-light">
                      {numToSI(this.state.unreadInboxCount)}
                    </span>
                  )}
                </NavLink>
              </li>
              {UserService.Instance.moderatesSomething && (
                <li className="nav-item nav-item-icon">
                  <NavLink
                    to="/reports"
                    className="p-1 nav-link border-0"
                    title={I18NextService.i18n.t("unread_reports", {
                      count: Number(this.state.unreadReportCount),
                      formattedCount: numToSI(this.state.unreadReportCount),
                    })}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
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
              {amAdmin() && (
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
                    onMouseUp={linkEvent(this, handleCollapseClick)}
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
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  {I18NextService.i18n.t("communities")}
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
                  title={I18NextService.i18n.t("create_post")}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  {I18NextService.i18n.t("create_post")}
                </NavLink>
              </li>
              {this.props.siteRes && canCreateCommunity(this.props.siteRes) && (
                <li className="nav-item">
                  <NavLink
                    to="/create_community"
                    className="nav-link"
                    title={I18NextService.i18n.t("create_community")}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
                  >
                    {I18NextService.i18n.t("create_community")}
                  </NavLink>
                </li>
              )}
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
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="search" />
                  <span className="d-inline ms-1 d-md-none ms-md-0">
                    {I18NextService.i18n.t("search")}
                  </span>
                </NavLink>
              </li>
              {amAdmin() && (
                <li id="navAdmin" className="nav-item">
                  <NavLink
                    to="/admin"
                    className="nav-link d-inline-flex align-items-center d-md-inline-block"
                    title={I18NextService.i18n.t("admin_settings")}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
                  >
                    <Icon icon="settings" />
                    <span className="d-inline ms-1 d-md-none ms-md-0">
                      {I18NextService.i18n.t("admin_settings")}
                    </span>
                  </NavLink>
                </li>
              )}
              {person ? (
                <>
                  <li id="navMessages" className="nav-item">
                    <NavLink
                      className="nav-link d-inline-flex align-items-center d-md-inline-block"
                      to="/inbox"
                      title={I18NextService.i18n.t("unread_messages", {
                        count: Number(this.state.unreadInboxCount),
                        formattedCount: numToSI(this.state.unreadInboxCount),
                      })}
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      <Icon icon="bell" />
                      <span className="badge text-bg-light d-inline ms-1 d-md-none ms-md-0">
                        {I18NextService.i18n.t("unread_messages", {
                          count: Number(this.state.unreadInboxCount),
                          formattedCount: numToSI(this.state.unreadInboxCount),
                        })}
                      </span>
                      {this.state.unreadInboxCount > 0 && (
                        <span className="mx-1 badge text-bg-light">
                          {numToSI(this.state.unreadInboxCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                  {UserService.Instance.moderatesSomething && (
                    <li id="navModeration" className="nav-item">
                      <NavLink
                        className="nav-link d-inline-flex align-items-center d-md-inline-block"
                        to="/reports"
                        title={I18NextService.i18n.t("unread_reports", {
                          count: Number(this.state.unreadReportCount),
                          formattedCount: numToSI(this.state.unreadReportCount),
                        })}
                        onMouseUp={linkEvent(this, handleCollapseClick)}
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
                  {amAdmin() && (
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
                        onMouseUp={linkEvent(this, handleCollapseClick)}
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
                  {person && (
                    <li id="dropdownUser" className="dropdown">
                      <button
                        type="button"
                        className="btn dropdown-toggle"
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
                            title={I18NextService.i18n.t("profile")}
                            onMouseUp={linkEvent(this, handleCollapseClick)}
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
                            onMouseUp={linkEvent(this, handleCollapseClick)}
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
                            onClick={linkEvent(this, handleLogOut)}
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
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      {I18NextService.i18n.t("login")}
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      to="/signup"
                      className="nav-link"
                      title={I18NextService.i18n.t("sign_up")}
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      {I18NextService.i18n.t("sign_up")}
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>
      </div>
    );
  }

  handleOutsideMenuClick(event: MouseEvent) {
    if (!this.mobileMenuRef.current?.contains(event.target as Node | null)) {
      handleCollapseClick(this);
    }
  }

  get currentLocation() {
    return this.context.router.history.location.pathname;
  }

  requestNotificationPermission() {
    if (UserService.Instance.myUserInfo) {
      document.addEventListener("lemmy-hydrated", function () {
        if (!Notification) {
          toast(I18NextService.i18n.t("notifications_error"), "danger");
          return;
        }

        if (Notification.permission !== "granted")
          Notification.requestPermission();
      });
    }
  }
}
