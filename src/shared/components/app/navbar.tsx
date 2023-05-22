import { Component, createRef, linkEvent } from "inferno";
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
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  amAdmin,
  canCreateCommunity,
  donateLemmyUrl,
  isBrowser,
  myAuth,
  notifyComment,
  notifyPrivateMessage,
  numToSI,
  showAvatars,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { Icon } from "../common/icon";
import { PictrsImage } from "../common/pictrs-image";

interface NavbarProps {
  siteRes: GetSiteResponse;
}

interface NavbarState {
  unreadInboxCount: number;
  unreadReportCount: number;
  unreadApplicationCount: number;
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
  private wsSub: Subscription;
  private userSub: Subscription;
  private unreadInboxCountSub: Subscription;
  private unreadReportCountSub: Subscription;
  private unreadApplicationCountSub: Subscription;
  state: NavbarState = {
    unreadInboxCount: 0,
    unreadReportCount: 0,
    unreadApplicationCount: 0,
  };
  subscription: any;
  collapseButtonRef = createRef<HTMLButtonElement>();

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
  }

  componentDidMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      // On the first load, check the unreads
      let auth = myAuth(false);
      if (auth && UserService.Instance.myUserInfo) {
        this.requestNotificationPermission();
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth,
          })
        );

        this.fetchUnreads();
      }

      this.requestNotificationPermission();

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

  // TODO class active corresponding to current page
  render() {
    const siteView = this.props.siteRes.site_view;
    const person = UserService.Instance.myUserInfo?.local_user_view.person;
    return (
      <nav className="navbar navbar-expand-md navbar-light shadow-sm p-0 px-3 container-lg">
        <NavLink
          to="/"
          title={siteView.site.description ?? siteView.site.name}
          className="d-flex align-items-center navbar-brand mr-md-3"
          onMouseUp={linkEvent(this, handleCollapseClick)}
        >
          {siteView.site.icon && showAvatars() && (
            <PictrsImage src={siteView.site.icon} icon />
          )}
          {siteView.site.name}
        </NavLink>
        {person && (
          <ul className="navbar-nav d-flex flex-row ml-auto d-md-none">
            <li className="nav-item">
              <NavLink
                to="/inbox"
                className="p-1 nav-link border-0"
                title={i18n.t("unread_messages", {
                  count: Number(this.state.unreadInboxCount),
                  formattedCount: numToSI(this.state.unreadInboxCount),
                })}
                onMouseUp={linkEvent(this, handleCollapseClick)}
              >
                <Icon icon="bell" />
                {this.state.unreadInboxCount > 0 && (
                  <span className="mx-1 badge badge-light">
                    {numToSI(this.state.unreadInboxCount)}
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
                    count: Number(this.state.unreadReportCount),
                    formattedCount: numToSI(this.state.unreadReportCount),
                  })}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="shield" />
                  {this.state.unreadReportCount > 0 && (
                    <span className="mx-1 badge badge-light">
                      {numToSI(this.state.unreadReportCount)}
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
                    count: Number(this.state.unreadApplicationCount),
                    formattedCount: numToSI(this.state.unreadApplicationCount),
                  })}
                  onMouseUp={linkEvent(this, handleCollapseClick)}
                >
                  <Icon icon="clipboard" />
                  {this.state.unreadApplicationCount > 0 && (
                    <span className="mx-1 badge badge-light">
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
            {canCreateCommunity(this.props.siteRes) && (
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
                      count: Number(this.state.unreadInboxCount),
                      formattedCount: numToSI(this.state.unreadInboxCount),
                    })}
                    onMouseUp={linkEvent(this, handleCollapseClick)}
                  >
                    <Icon icon="bell" />
                    {this.state.unreadInboxCount > 0 && (
                      <span className="ml-1 badge badge-light">
                        {numToSI(this.state.unreadInboxCount)}
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
                        count: Number(this.state.unreadReportCount),
                        formattedCount: numToSI(this.state.unreadReportCount),
                      })}
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      <Icon icon="shield" />
                      {this.state.unreadReportCount > 0 && (
                        <span className="ml-1 badge badge-light">
                          {numToSI(this.state.unreadReportCount)}
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
                        count: Number(this.state.unreadApplicationCount),
                        formattedCount: numToSI(
                          this.state.unreadApplicationCount
                        ),
                      })}
                      onMouseUp={linkEvent(this, handleCollapseClick)}
                    >
                      <Icon icon="clipboard" />
                      {this.state.unreadApplicationCount > 0 && (
                        <span className="mx-1 badge badge-light">
                          {numToSI(this.state.unreadApplicationCount)}
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
    let mods = UserService.Instance.myUserInfo?.moderates;
    let moderatesS = (mods && mods.length > 0) || false;
    return amAdmin() || moderatesS;
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      if (msg.error == "not_logged_in") {
        UserService.Instance.logout();
      }
      return;
    } else if (msg.reconnect) {
      console.log(i18n.t("websocket_reconnected"));
      let auth = myAuth(false);
      if (UserService.Instance.myUserInfo && auth) {
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth,
          })
        );
        this.fetchUnreads();
      }
    } else if (op == UserOperation.GetUnreadCount) {
      let data = wsJsonToRes<GetUnreadCountResponse>(msg);
      this.setState({
        unreadInboxCount: data.replies + data.mentions + data.private_messages,
      });
      this.sendUnreadCount();
    } else if (op == UserOperation.GetReportCount) {
      let data = wsJsonToRes<GetReportCountResponse>(msg);
      this.setState({
        unreadReportCount:
          data.post_reports +
          data.comment_reports +
          (data.private_message_reports ?? 0),
      });
      this.sendReportUnread();
    } else if (op == UserOperation.GetUnreadRegistrationApplicationCount) {
      let data =
        wsJsonToRes<GetUnreadRegistrationApplicationCountResponse>(msg);
      this.setState({ unreadApplicationCount: data.registration_applications });
      this.sendApplicationUnread();
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      let mui = UserService.Instance.myUserInfo;
      if (
        mui &&
        data.recipient_ids.includes(mui.local_user_view.local_user.id)
      ) {
        this.setState({
          unreadInboxCount: this.state.unreadInboxCount + 1,
        });
        this.sendUnreadCount();
        notifyComment(data.comment_view, this.context.router);
      }
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg);

      if (
        data.private_message_view.recipient.id ==
        UserService.Instance.myUserInfo?.local_user_view.person.id
      ) {
        this.setState({
          unreadInboxCount: this.state.unreadInboxCount + 1,
        });
        this.sendUnreadCount();
        notifyPrivateMessage(data.private_message_view, this.context.router);
      }
    }
  }

  fetchUnreads() {
    console.log("Fetching inbox unreads...");

    let auth = myAuth();
    if (auth) {
      let unreadForm: GetUnreadCount = {
        auth,
      };
      WebSocketService.Instance.send(wsClient.getUnreadCount(unreadForm));

      console.log("Fetching reports...");

      let reportCountForm: GetReportCount = {
        auth,
      };
      WebSocketService.Instance.send(wsClient.getReportCount(reportCountForm));

      if (amAdmin()) {
        console.log("Fetching applications...");

        let applicationCountForm: GetUnreadRegistrationApplicationCount = {
          auth,
        };
        WebSocketService.Instance.send(
          wsClient.getUnreadRegistrationApplicationCount(applicationCountForm)
        );
      }
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
