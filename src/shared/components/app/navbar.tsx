import { Component, createRef, linkEvent, RefObject } from "inferno";
import { Link } from "inferno-router";
import {
  CommentResponse,
  CommentView,
  GetPersonMentions,
  GetPersonMentionsResponse,
  GetPrivateMessages,
  GetReplies,
  GetRepliesResponse,
  GetSiteResponse,
  PrivateMessageResponse,
  PrivateMessagesResponse,
  PrivateMessageView,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  donateLemmyUrl,
  fetchLimit,
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
  replies: CommentView[];
  mentions: CommentView[];
  messages: PrivateMessageView[];
  unreadCount: number;
  searchParam: string;
  toggleSearch: boolean;
  showDropdown: boolean;
  onSiteBanner?(url: string): any;
}

export class Navbar extends Component<NavbarProps, NavbarState> {
  private wsSub: Subscription;
  private userSub: Subscription;
  private unreadCountSub: Subscription;
  private searchTextField: RefObject<HTMLInputElement>;
  emptyState: NavbarState = {
    isLoggedIn: !!this.props.site_res.my_user,
    unreadCount: 0,
    replies: [],
    mentions: [],
    messages: [],
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
      this.websocketEvents();

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
      this.unreadCountSub = UserService.Instance.unreadCountSub.subscribe(
        res => {
          this.setState({ unreadCount: res });
        }
      );
    }
  }

  componentWillUnmount() {
    this.wsSub.unsubscribe();
    this.userSub.unsubscribe();
    this.unreadCountSub.unsubscribe();
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
            <button
              title={
                this.props.site_res.site_view.site.description ||
                this.props.site_res.site_view.site.name
              }
              className="d-flex align-items-center navbar-brand mr-md-3 btn btn-link"
              onClick={linkEvent(this, this.handleGotoHome)}
            >
              {this.props.site_res.site_view.site.icon && showAvatars() && (
                <PictrsImage
                  src={this.props.site_res.site_view.site.icon}
                  icon
                />
              )}
              {this.props.site_res.site_view.site.name}
            </button>
          )}
          {this.state.isLoggedIn && (
            <button
              className="ml-auto p-1 navbar-toggler nav-link border-0 btn btn-link"
              onClick={linkEvent(this, this.handleGotoInbox)}
              title={i18n.t("inbox")}
            >
              <Icon icon="bell" />
              {this.state.unreadCount > 0 && (
                <span
                  class="mx-1 badge badge-light"
                  aria-label={`${this.state.unreadCount} ${i18n.t(
                    "unread_messages"
                  )}`}
                >
                  {numToSI(this.state.unreadCount)}
                </span>
              )}
            </button>
          )}
          <button
            class="navbar-toggler border-0 p-1"
            type="button"
            aria-label="menu"
            onClick={linkEvent(this, this.expandNavbar)}
            data-tippy-content={i18n.t("expand_here")}
          >
            <Icon icon="menu" />
          </button>
          <div
            className={`${!this.state.expanded && "collapse"} navbar-collapse`}
          >
            <ul class="navbar-nav my-2 mr-auto">
              <li class="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={linkEvent(this, this.handleGotoCommunities)}
                  title={i18n.t("communities")}
                >
                  {i18n.t("communities")}
                </button>
              </li>
              <li class="nav-item">
                <button
                  className="nav-link btn btn-link"
                  onClick={linkEvent(this, this.handleGotoCreatePost)}
                  title={i18n.t("create_post")}
                >
                  {i18n.t("create_post")}
                </button>
              </li>
              {this.canCreateCommunity && (
                <li class="nav-item">
                  <button
                    className="nav-link btn btn-link"
                    onClick={linkEvent(this, this.handleGotoCreateCommunity)}
                    title={i18n.t("create_community")}
                  >
                    {i18n.t("create_community")}
                  </button>
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
                  <button
                    className="nav-link btn btn-link"
                    onClick={linkEvent(this, this.handleGotoAdmin)}
                    title={i18n.t("admin_settings")}
                  >
                    <Icon icon="settings" />
                  </button>
                </li>
              )}
            </ul>
            {!this.context.router.history.location.pathname.match(
              /^\/search/
            ) && (
              <form
                class="form-inline"
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
                    <Link
                      className="nav-link"
                      to="/inbox"
                      title={i18n.t("inbox")}
                    >
                      <Icon icon="bell" />
                      {this.state.unreadCount > 0 && (
                        <span
                          class="ml-1 badge badge-light"
                          aria-label={`${this.state.unreadCount} ${i18n.t(
                            "unread_messages"
                          )}`}
                        >
                          {numToSI(this.state.unreadCount)}
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>
                <ul class="navbar-nav">
                  <li class="nav-item dropdown">
                    <button
                      class="nav-link btn btn-link dropdown-toggle"
                      onClick={linkEvent(this, this.handleShowDropdown)}
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
                      <div class="dropdown-content">
                        <li className="nav-item">
                          <button
                            className="nav-link btn btn-link"
                            onClick={linkEvent(this, this.handleGotoProfile)}
                            title={i18n.t("profile")}
                          >
                            <Icon icon="user" classes="mr-1" />
                            {i18n.t("profile")}
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className="nav-link btn btn-link"
                            onClick={linkEvent(this, this.handleGotoSettings)}
                            title={i18n.t("settings")}
                          >
                            <Icon icon="settings" classes="mr-1" />
                            {i18n.t("settings")}
                          </button>
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
                <li className="ml-2 nav-item">
                  <button
                    className="btn btn-success"
                    onClick={linkEvent(this, this.handleGotoLogin)}
                    title={i18n.t("login_sign_up")}
                  >
                    {i18n.t("login_sign_up")}
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </nav>
    );
  }

  expandNavbar(i: Navbar) {
    i.state.expanded = !i.state.expanded;
    i.setState(i.state);
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
    i.context.router.history.push("/");
    location.reload();
  }

  handleGotoSettings(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push("/settings");
  }

  handleGotoProfile(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(
      `/u/${UserService.Instance.myUserInfo.local_user_view.person.name}`
    );
  }

  handleGotoCreatePost(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push("/create_post", {
      prevPath: i.currentLocation,
    });
  }

  handleGotoCreateCommunity(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(`/create_community`);
  }

  handleGotoCommunities(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(`/communities`);
  }

  handleGotoHome(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(`/`);
  }

  handleGotoInbox(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(`/inbox`);
  }

  handleGotoAdmin(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(`/admin`);
  }

  handleGotoLogin(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    i.context.router.history.push(`/login`);
  }

  handleShowDropdown(i: Navbar) {
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
    } else if (op == UserOperation.GetReplies) {
      let data = wsJsonToRes<GetRepliesResponse>(msg).data;
      let unreadReplies = data.replies.filter(r => !r.comment.read);

      this.state.replies = unreadReplies;
      this.state.unreadCount = this.calculateUnreadCount();
      this.setState(this.state);
      this.sendUnreadCount();
    } else if (op == UserOperation.GetPersonMentions) {
      let data = wsJsonToRes<GetPersonMentionsResponse>(msg).data;
      let unreadMentions = data.mentions.filter(r => !r.comment.read);

      this.state.mentions = unreadMentions;
      this.state.unreadCount = this.calculateUnreadCount();
      this.setState(this.state);
      this.sendUnreadCount();
    } else if (op == UserOperation.GetPrivateMessages) {
      let data = wsJsonToRes<PrivateMessagesResponse>(msg).data;
      let unreadMessages = data.private_messages.filter(
        r => !r.private_message.read
      );

      this.state.messages = unreadMessages;
      this.state.unreadCount = this.calculateUnreadCount();
      this.setState(this.state);
      this.sendUnreadCount();
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
          this.state.replies.push(data.comment_view);
          this.state.unreadCount++;
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
          this.state.messages.push(data.private_message_view);
          this.state.unreadCount++;
          this.setState(this.state);
          this.sendUnreadCount();
          notifyPrivateMessage(data.private_message_view, this.context.router);
        }
      }
    }
  }

  fetchUnreads() {
    console.log("Fetching unreads...");
    let repliesForm: GetReplies = {
      sort: SortType.New,
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: authField(),
    };

    let personMentionsForm: GetPersonMentions = {
      sort: SortType.New,
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: authField(),
    };

    let privateMessagesForm: GetPrivateMessages = {
      unread_only: true,
      page: 1,
      limit: fetchLimit,
      auth: authField(),
    };

    if (this.currentLocation !== "/inbox") {
      WebSocketService.Instance.send(wsClient.getReplies(repliesForm));
      WebSocketService.Instance.send(
        wsClient.getPersonMentions(personMentionsForm)
      );
      WebSocketService.Instance.send(
        wsClient.getPrivateMessages(privateMessagesForm)
      );
    }
  }

  get currentLocation() {
    return this.context.router.history.location.pathname;
  }

  sendUnreadCount() {
    UserService.Instance.unreadCountSub.next(this.state.unreadCount);
  }

  calculateUnreadCount(): number {
    return (
      this.state.replies.filter(r => !r.comment.read).length +
      this.state.mentions.filter(r => !r.comment.read).length +
      this.state.messages.filter(r => !r.private_message.read).length
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

  /// Listens for some websocket errors
  websocketEvents() {
    let msg = i18n.t("websocket_disconnected");
    WebSocketService.Instance.closeEventListener(() => {
      console.error(msg);
    });
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
