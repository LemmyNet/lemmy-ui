import { Component, createRef, linkEvent, RefObject } from "inferno";
import { NavLink } from "inferno-router";
import {
  CommentResponse,
  GetReportCount,
  GetReportCountResponse,
  GetSiteResponse,
  GetUnreadCount,
  GetUnreadCountResponse,
  GetUnreadRegistrationApplicationCount,
  GetUnreadRegistrationApplicationCountResponse,
  PrivateMessageResponse,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  donateLemmyUrl,
  getLanguage,
  isBrowser,
  notifyComment,
  notifyPrivateMessage,
  numToSI,
  setTheme,
  showAvatars,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { Icon } from "../common/icon";
import { PictrsImage } from "../common/pictrs-image";

interface NavbarProps {
  site_res: GetSiteResponse;
}

interface NavbarState {
  isLoggedIn: boolean;
  expanded: boolean;
  unreadInboxCount: number;
  unreadReportCount: number;
  unreadApplicationCount: number;
  searchParam: string;
  toggleSearch: boolean;
  showDropdown: boolean;
  onSiteBanner?(url: string): any;
}

export class Navbar extends Component<NavbarProps, NavbarState> {
  private wsSub: Subscription;
  private userSub: Subscription;
  private unreadInboxCountSub: Subscription;
  private unreadReportCountSub: Subscription;
  private unreadApplicationCountSub: Subscription;
  private searchTextField: RefObject<HTMLInputElement>;
  emptyState: NavbarState = {
    isLoggedIn: !!this.props.site_res.my_user,
    unreadInboxCount: 0,
    unreadReportCount: 0,
    unreadApplicationCount: 0,
    expanded: false,
    searchParam: "",
    toggleSearch: false,
    showDropdown: false,
  };
  subscription: any;

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentDidMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      this.searchTextField = createRef();
      console.log(`isLoggedIn = ${this.state.isLoggedIn}`);

      // On the first load, check the unreads
      if (this.state.isLoggedIn == false) {
        // setTheme(data.my_user.theme, true);
        // i18n.changeLanguage(getLanguage());
        // i18n.changeLanguage('de');
      } else {
        this.requestNotificationPermission();
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth: authField(),
          })
        );
        this.fetchUnreads();
      }

      this.userSub = UserService.Instance.jwtSub.subscribe(res => {
        // A login
        if (res !== undefined) {
          this.requestNotificationPermission();
          WebSocketService.Instance.send(
            wsClient.getSite({ auth: authField() })
          );
        } else {
          this.setState({ isLoggedIn: false });
        }
      });

      // Subscribe to unread count changes
      this.unreadInboxCountSub =
        UserService.Instance.unreadInboxCountSub.subscribe(res => {
          this.setState({ unreadInboxCount: res });
        });
      // Subscribe to unread report count changes
      this.unreadReportCountSub =
        UserService.Instance.unreadReportCountSub.subscribe(res => {
          this.setState({ unreadReportCount: res });
        });
      // Subscribe to unread application count
      this.unreadApplicationCountSub =
        UserService.Instance.unreadApplicationCountSub.subscribe(res => {
          this.setState({ unreadApplicationCount: res });
        });
    }
  }

  componentWillUnmount() {
    this.wsSub.unsubscribe();
    this.userSub.unsubscribe();
    this.unreadInboxCountSub.unsubscribe();
    this.unreadReportCountSub.unsubscribe();
    this.unreadApplicationCountSub.unsubscribe();
  }

  updateUrl() {
    const searchParam = this.state.searchParam;
    this.setState({ searchParam: "" });
    this.setState({ toggleSearch: false });
    this.setState({ showDropdown: false, expanded: false });
    if (searchParam === "") {
      this.context.router.history.push(`/search/`);
    } else {
      const searchParamEncoded = encodeURIComponent(searchParam);
      this.context.router.history.push(
        `/search/q/${searchParamEncoded}/type/All/sort/TopAll/listing_type/All/community_id/0/creator_id/0/page/1`
      );
    }
  }

  render() {
    return this.navbar();
  }

  // TODO class active corresponding to current page
  navbar() {
    let myUserInfo =
      UserService.Instance.myUserInfo || this.props.site_res.my_user;
    let person = myUserInfo?.local_user_view.person;
    return (
      <nav class="navbar navbar-expand-lg navbar-light shadow-sm p-0 px-3">
        <div class="container">
          {this.props.site_res.site_view && (
            <NavLink
              to="/"
              onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
              title={
                this.props.site_res.site_view.site.description ||
                this.props.site_res.site_view.site.name
              }
              className="d-flex align-items-center navbar-brand mr-md-3"
            >
              {this.props.site_res.site_view.site.icon && showAvatars() && (
                <PictrsImage
                  src={this.props.site_res.site_view.site.icon}
                  icon
                />
              )}
              {this.props.site_res.site_view.site.name}
            </NavLink>
          )}
          {this.state.isLoggedIn && (
            <>
              <ul class="navbar-nav ml-auto">
                <li className="nav-item">
                  <NavLink
                    to="/inbox"
                    className="p-1 navbar-toggler nav-link border-0"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("unread_messages", {
                      count: this.state.unreadInboxCount,
                      formattedCount: numToSI(this.state.unreadInboxCount),
                    })}
                  >
                    <Icon icon="bell" />
                    {this.state.unreadInboxCount > 0 && (
                      <span class="mx-1 badge badge-light">
                        {numToSI(this.state.unreadInboxCount)}
                      </span>
                    )}
                  </NavLink>
                </li>
              </ul>
              {UserService.Instance.myUserInfo?.moderates.length > 0 && (
                <ul class="navbar-nav ml-1">
                  <li className="nav-item">
                    <NavLink
                      to="/reports"
                      className="p-1 navbar-toggler nav-link border-0"
                      onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                      title={i18n.t("unread_reports", {
                        count: this.state.unreadReportCount,
                        formattedCount: numToSI(this.state.unreadReportCount),
                      })}
                    >
                      <Icon icon="shield" />
                      {this.state.unreadReportCount > 0 && (
                        <span class="mx-1 badge badge-light">
                          {numToSI(this.state.unreadReportCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                </ul>
              )}
              {UserService.Instance.myUserInfo?.local_user_view.person
                .admin && (
                <ul class="navbar-nav ml-1">
                  <li className="nav-item">
                    <NavLink
                      to="/registration_applications"
                      className="p-1 navbar-toggler nav-link border-0"
                      onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                      title={i18n.t("unread_registration_applications", {
                        count: this.state.unreadApplicationCount,
                        formattedCount: numToSI(
                          this.state.unreadApplicationCount
                        ),
                      })}
                    >
                      <Icon icon="edit" />
                      {this.state.unreadApplicationCount > 0 && (
                        <span class="mx-1 badge badge-light">
                          {numToSI(this.state.unreadApplicationCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                </ul>
              )}
            </>
          )}
          <button
            class="navbar-toggler border-0 p-1"
            type="button"
            aria-label="menu"
            onClick={linkEvent(this, this.handleToggleExpandNavbar)}
            data-tippy-content={i18n.t("expand_here")}
          >
            <Icon icon="menu" />
          </button>
          <div
            className={`${!this.state.expanded && "collapse"} navbar-collapse`}
          >
            <ul class="navbar-nav my-2 mr-auto">
              <li class="nav-item">
                <NavLink
                  to="/communities"
                  className="nav-link"
                  onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                  title={i18n.t("communities")}
                >
                  {i18n.t("communities")}
                </NavLink>
              </li>
              <li class="nav-item">
                <NavLink
                  to={{
                    pathname: "/create_post",
                    prevPath: this.currentLocation,
                  }}
                  className="nav-link"
                  onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                  title={i18n.t("create_post")}
                >
                  {i18n.t("create_post")}
                </NavLink>
              </li>
              {this.canCreateCommunity && (
                <li class="nav-item">
                  <NavLink
                    to="/create_community"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("create_community")}
                  >
                    {i18n.t("create_community")}
                  </NavLink>
                </li>
              )}
              <li class="nav-item">
                <a
                  className="nav-link"
                  title={i18n.t("support_lemmy")}
                  href={donateLemmyUrl}
                >
                  <Icon icon="heart" classes="small" />
                </a>
              </li>
            </ul>
            <ul class="navbar-nav my-2">
              {this.canAdmin && (
                <li className="nav-item">
                  <NavLink
                    to="/admin"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("admin_settings")}
                  >
                    <Icon icon="settings" />
                  </NavLink>
                </li>
              )}
            </ul>
            {!this.context.router.history.location.pathname.match(
              /^\/search/
            ) && (
              <form
                class="form-inline mr-2"
                onSubmit={linkEvent(this, this.handleSearchSubmit)}
              >
                <input
                  id="search-input"
                  class={`form-control mr-0 search-input ${
                    this.state.toggleSearch ? "show-input" : "hide-input"
                  }`}
                  onInput={linkEvent(this, this.handleSearchParam)}
                  value={this.state.searchParam}
                  ref={this.searchTextField}
                  type="text"
                  placeholder={i18n.t("search")}
                  onBlur={linkEvent(this, this.handleSearchBlur)}
                ></input>
                <label class="sr-only" htmlFor="search-input">
                  {i18n.t("search")}
                </label>
                <button
                  name="search-btn"
                  onClick={linkEvent(this, this.handleSearchBtn)}
                  class="px-1 btn btn-link"
                  style="color: var(--gray)"
                  aria-label={i18n.t("search")}
                >
                  <Icon icon="search" />
                </button>
              </form>
            )}
            {this.state.isLoggedIn ? (
              <>
                <ul class="navbar-nav my-2">
                  <li className="nav-item">
                    <NavLink
                      className="nav-link"
                      to="/inbox"
                      onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                      title={i18n.t("unread_messages", {
                        count: this.state.unreadInboxCount,
                        formattedCount: numToSI(this.state.unreadInboxCount),
                      })}
                    >
                      <Icon icon="bell" />
                      {this.state.unreadInboxCount > 0 && (
                        <span class="ml-1 badge badge-light">
                          {numToSI(this.state.unreadInboxCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                </ul>
                {UserService.Instance.myUserInfo?.moderates.length > 0 && (
                  <ul class="navbar-nav my-2">
                    <li className="nav-item">
                      <NavLink
                        className="nav-link"
                        to="/reports"
                        onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                        title={i18n.t("unread_reports", {
                          count: this.state.unreadReportCount,
                          formattedCount: numToSI(this.state.unreadReportCount),
                        })}
                      >
                        <Icon icon="shield" />
                        {this.state.unreadReportCount > 0 && (
                          <span class="ml-1 badge badge-light">
                            {numToSI(this.state.unreadReportCount)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  </ul>
                )}
                {UserService.Instance.myUserInfo?.local_user_view.person
                  .admin && (
                  <ul class="navbar-nav my-2">
                    <li className="nav-item">
                      <NavLink
                        to="/registration_applications"
                        className="nav-link"
                        onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                        title={i18n.t("unread_registration_applications", {
                          count: this.state.unreadApplicationCount,
                          formattedCount: numToSI(
                            this.state.unreadApplicationCount
                          ),
                        })}
                      >
                        <Icon icon="edit" />
                        {this.state.unreadApplicationCount > 0 && (
                          <span class="mx-1 badge badge-light">
                            {numToSI(this.state.unreadApplicationCount)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  </ul>
                )}
                <ul class="navbar-nav">
                  <li class="nav-item dropdown">
                    <button
                      class="nav-link btn btn-link dropdown-toggle"
                      onClick={linkEvent(this, this.handleToggleDropdown)}
                      id="navbarDropdown"
                      role="button"
                      aria-expanded="false"
                    >
                      <span>
                        {person.avatar && showAvatars() && (
                          <PictrsImage src={person.avatar} icon />
                        )}
                        {person.display_name
                          ? person.display_name
                          : person.name}
                      </span>
                    </button>
                    {this.state.showDropdown && (
                      <div
                        class="dropdown-content"
                        onMouseLeave={linkEvent(
                          this,
                          this.handleToggleDropdown
                        )}
                      >
                        <li className="nav-item">
                          <NavLink
                            to={`/u/${UserService.Instance.myUserInfo.local_user_view.person.name}`}
                            className="nav-link"
                            title={i18n.t("profile")}
                          >
                            <Icon icon="user" classes="mr-1" />
                            {i18n.t("profile")}
                          </NavLink>
                        </li>
                        <li className="nav-item">
                          <NavLink
                            to="/settings"
                            className="nav-link"
                            title={i18n.t("settings")}
                          >
                            <Icon icon="settings" classes="mr-1" />
                            {i18n.t("settings")}
                          </NavLink>
                        </li>
                        <li>
                          <hr class="dropdown-divider" />
                        </li>
                        <li className="nav-item">
                          <button
                            className="nav-link btn btn-link"
                            onClick={linkEvent(this, this.handleLogoutClick)}
                            title="test"
                          >
                            <Icon icon="log-out" classes="mr-1" />
                            {i18n.t("logout")}
                          </button>
                        </li>
                      </div>
                    )}
                  </li>
                </ul>
              </>
            ) : (
              <ul class="navbar-nav my-2">
                <li className="nav-item">
                  <NavLink
                    to="/login"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("login")}
                  >
                    {i18n.t("login")}
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/signup"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("sign_up")}
                  >
                    {i18n.t("sign_up")}
                  </NavLink>
                </li>
              </ul>
            )}
          </div>
        </div>
      </nav>
    );
  }

  handleToggleExpandNavbar(i: Navbar) {
    i.state.expanded = !i.state.expanded;
    i.setState(i.state);
  }

  handleHideExpandNavbar(i: Navbar) {
    i.setState({ expanded: false, showDropdown: false });
  }

  handleSearchParam(i: Navbar, event: any) {
    i.state.searchParam = event.target.value;
    i.setState(i.state);
  }

  handleSearchSubmit(i: Navbar, event: any) {
    event.preventDefault();
    i.updateUrl();
  }

  handleSearchBtn(i: Navbar, event: any) {
    event.preventDefault();
    i.setState({ toggleSearch: true });

    i.searchTextField.current.focus();
    const offsetWidth = i.searchTextField.current.offsetWidth;
    if (i.state.searchParam && offsetWidth > 100) {
      i.updateUrl();
    }
  }

  handleSearchBlur(i: Navbar, event: any) {
    if (!(event.relatedTarget && event.relatedTarget.name !== "search-btn")) {
      i.state.toggleSearch = false;
      i.setState(i.state);
    }
  }

  handleLogoutClick(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    UserService.Instance.logout();
    window.location.href = "/";
    location.reload();
  }

  handleToggleDropdown(i: Navbar) {
    i.state.showDropdown = !i.state.showDropdown;
    i.setState(i.state);
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      if (msg.error == "not_logged_in") {
        UserService.Instance.logout();
        location.reload();
      }
      return;
    } else if (msg.reconnect) {
      console.log(i18n.t("websocket_reconnected"));
      WebSocketService.Instance.send(
        wsClient.userJoin({
          auth: authField(),
        })
      );
      this.fetchUnreads();
    } else if (op == UserOperation.GetUnreadCount) {
      let data = wsJsonToRes<GetUnreadCountResponse>(msg).data;
      this.state.unreadInboxCount =
        data.replies + data.mentions + data.private_messages;
      this.setState(this.state);
      this.sendUnreadCount();
    } else if (op == UserOperation.GetReportCount) {
      let data = wsJsonToRes<GetReportCountResponse>(msg).data;
      this.state.unreadReportCount = data.post_reports + data.comment_reports;
      this.setState(this.state);
      this.sendReportUnread();
    } else if (op == UserOperation.GetUnreadRegistrationApplicationCount) {
      let data =
        wsJsonToRes<GetUnreadRegistrationApplicationCountResponse>(msg).data;
      this.state.unreadApplicationCount = data.registration_applications;
      this.setState(this.state);
      this.sendApplicationUnread();
    } else if (op == UserOperation.GetSite) {
      // This is only called on a successful login
      let data = wsJsonToRes<GetSiteResponse>(msg).data;
      console.log(data.my_user);
      UserService.Instance.myUserInfo = data.my_user;
      setTheme(
        UserService.Instance.myUserInfo.local_user_view.local_user.theme
      );
      i18n.changeLanguage(getLanguage());
      this.state.isLoggedIn = true;
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;

      if (this.state.isLoggedIn) {
        if (
          data.recipient_ids.includes(
            UserService.Instance.myUserInfo.local_user_view.local_user.id
          )
        ) {
          this.state.unreadInboxCount++;
          this.setState(this.state);
          this.sendUnreadCount();
          notifyComment(data.comment_view, this.context.router);
        }
      }
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg).data;

      if (this.state.isLoggedIn) {
        if (
          data.private_message_view.recipient.id ==
          UserService.Instance.myUserInfo.local_user_view.person.id
        ) {
          this.state.unreadInboxCount++;
          this.setState(this.state);
          this.sendUnreadCount();
          notifyPrivateMessage(data.private_message_view, this.context.router);
        }
      }
    }
  }

  fetchUnreads() {
    console.log("Fetching inbox unreads...");

    let unreadForm: GetUnreadCount = {
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.getUnreadCount(unreadForm));

    console.log("Fetching reports...");

    let reportCountForm: GetReportCount = {
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.getReportCount(reportCountForm));

    if (UserService.Instance.myUserInfo?.local_user_view.person.admin) {
      console.log("Fetching applications...");

      let applicationCountForm: GetUnreadRegistrationApplicationCount = {
        auth: authField(),
      };
      WebSocketService.Instance.send(
        wsClient.getUnreadRegistrationApplicationCount(applicationCountForm)
      );
    }
  }

  get currentLocation() {
    return this.context.router.history.location.pathname;
  }

  sendUnreadCount() {
    UserService.Instance.unreadInboxCountSub.next(this.state.unreadInboxCount);
  }

  sendReportUnread() {
    UserService.Instance.unreadReportCountSub.next(
      this.state.unreadReportCount
    );
  }

  sendApplicationUnread() {
    UserService.Instance.unreadApplicationCountSub.next(
      this.state.unreadApplicationCount
    );
  }

  get canAdmin(): boolean {
    return (
      UserService.Instance.myUserInfo &&
      this.props.site_res.admins
        .map(a => a.person.id)
        .includes(UserService.Instance.myUserInfo.local_user_view.person.id)
    );
  }

  get canCreateCommunity(): boolean {
    let adminOnly =
      this.props.site_res.site_view?.site.community_creation_admin_only;
    return !adminOnly || this.canAdmin;
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
