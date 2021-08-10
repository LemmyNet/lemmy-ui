import { Component, linkEvent } from "inferno";
import ISO6391 from "iso-639-1";
import {
  BlockPersonResponse,
  ChangePassword,
  DeleteAccount,
  GetSiteResponse,
  ListingType,
  LoginResponse,
  SaveUserSettings,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  capitalizeFirstLetter,
  elementUrl,
  getLanguage,
  languages,
  setIsoData,
  setTheme,
  setupTippy,
  showLocal,
  themes,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SortSelect } from "../common/sort-select";

interface SettingsState {
  saveUserSettingsForm: SaveUserSettings;
  changePasswordForm: ChangePassword;
  saveUserSettingsLoading: boolean;
  changePasswordLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  deleteAccountForm: DeleteAccount;
  siteRes: GetSiteResponse;
}

export class Settings extends Component<any, SettingsState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: SettingsState = {
    saveUserSettingsForm: {
      auth: authField(false),
    },
    changePasswordForm: {
      new_password: null,
      new_password_verify: null,
      old_password: null,
      auth: authField(false),
    },
    saveUserSettingsLoading: null,
    changePasswordLoading: false,
    deleteAccountLoading: null,
    deleteAccountShowConfirm: false,
    deleteAccountForm: {
      password: null,
      auth: authField(false),
    },
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleUserSettingsSortTypeChange =
      this.handleUserSettingsSortTypeChange.bind(this);
    this.handleUserSettingsListingTypeChange =
      this.handleUserSettingsListingTypeChange.bind(this);
    this.handleUserSettingsBioChange =
      this.handleUserSettingsBioChange.bind(this);

    this.handleAvatarUpload = this.handleAvatarUpload.bind(this);
    this.handleAvatarRemove = this.handleAvatarRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    this.setUserInfo();

    setupTippy();
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  get documentTitle(): string {
    return i18n.t("settings");
  }

  render() {
    return (
      <div class="container">
        <>
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            description={this.documentTitle}
            image={this.state.saveUserSettingsForm.avatar}
          />
          {this.userSettings()}
        </>
      </div>
    );
  }

  userSettings() {
    return (
      <div class="row">
        <div class="col-12 col-md-6">
          <div class="card border-secondary mb-3">
            <div class="card-body">{this.saveUserSettingsHtmlForm()}</div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-secondary mb-3">
            <div class="card-body">{this.changePasswordHtmlForm()}</div>
          </div>
        </div>
      </div>
    );
  }

  changePasswordHtmlForm() {
    return (
      <>
        <h5>{i18n.t("change_password")}</h5>
        <form onSubmit={linkEvent(this, this.handleChangePasswordSubmit)}>
          <div class="form-group row">
            <label class="col-lg-5 col-form-label" htmlFor="user-password">
              {i18n.t("new_password")}
            </label>
            <div class="col-lg-7">
              <input
                type="password"
                id="user-password"
                class="form-control"
                value={this.state.changePasswordForm.new_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          <div class="form-group row">
            <label
              class="col-lg-5 col-form-label"
              htmlFor="user-verify-password"
            >
              {i18n.t("verify_password")}
            </label>
            <div class="col-lg-7">
              <input
                type="password"
                id="user-verify-password"
                class="form-control"
                value={this.state.changePasswordForm.new_password_verify}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordVerifyChange)}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-lg-5 col-form-label" htmlFor="user-old-password">
              {i18n.t("old_password")}
            </label>
            <div class="col-lg-7">
              <input
                type="password"
                id="user-old-password"
                class="form-control"
                value={this.state.changePasswordForm.old_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleOldPasswordChange)}
              />
            </div>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-block btn-secondary mr-4">
              {this.state.changePasswordLoading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
        </form>
      </>
    );
  }

  saveUserSettingsHtmlForm() {
    return (
      <>
        <h5>{i18n.t("settings")}</h5>
        <form onSubmit={linkEvent(this, this.handleSaveUserSettingsSubmit)}>
          <div class="form-group row">
            <label class="col-lg-5 col-form-label" htmlFor="display-name">
              {i18n.t("display_name")}
            </label>
            <div class="col-lg-7">
              <input
                id="display-name"
                type="text"
                class="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.saveUserSettingsForm.display_name}
                onInput={linkEvent(
                  this,
                  this.handleUserSettingsPreferredUsernameChange
                )}
                pattern="^(?!@)(.+)$"
                minLength={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-lg-3 col-form-label" htmlFor="user-bio">
              {i18n.t("bio")}
            </label>
            <div class="col-lg-9">
              <MarkdownTextArea
                initialContent={this.state.saveUserSettingsForm.bio}
                onContentChange={this.handleUserSettingsBioChange}
                maxLength={300}
                hideNavigationWarnings
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-lg-3 col-form-label" htmlFor="user-email">
              {i18n.t("email")}
            </label>
            <div class="col-lg-9">
              <input
                type="email"
                id="user-email"
                class="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.saveUserSettingsForm.email}
                onInput={linkEvent(this, this.handleUserSettingsEmailChange)}
                minLength={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-lg-5 col-form-label" htmlFor="matrix-user-id">
              <a href={elementUrl} rel="noopener">
                {i18n.t("matrix_user_id")}
              </a>
            </label>
            <div class="col-lg-7">
              <input
                id="matrix-user-id"
                type="text"
                class="form-control"
                placeholder="@user:example.com"
                value={this.state.saveUserSettingsForm.matrix_user_id}
                onInput={linkEvent(
                  this,
                  this.handleUserSettingsMatrixUserIdChange
                )}
                pattern="^@[A-Za-z0-9._=-]+:[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
              />
            </div>
          </div>
          <div class="form-group">
            <label>{i18n.t("avatar")}</label>
            <ImageUploadForm
              uploadTitle={i18n.t("upload_avatar")}
              imageSrc={this.state.saveUserSettingsForm.avatar}
              onUpload={this.handleAvatarUpload}
              onRemove={this.handleAvatarRemove}
              rounded
            />
          </div>
          <div class="form-group">
            <label>{i18n.t("banner")}</label>
            <ImageUploadForm
              uploadTitle={i18n.t("upload_banner")}
              imageSrc={this.state.saveUserSettingsForm.banner}
              onUpload={this.handleBannerUpload}
              onRemove={this.handleBannerRemove}
            />
          </div>
          <div class="form-group">
            <label htmlFor="user-language">{i18n.t("language")}</label>
            <select
              id="user-language"
              value={this.state.saveUserSettingsForm.lang}
              onChange={linkEvent(this, this.handleUserSettingsLangChange)}
              class="ml-2 custom-select w-auto"
            >
              <option disabled aria-hidden="true">
                {i18n.t("language")}
              </option>
              <option value="browser">{i18n.t("browser_default")}</option>
              <option disabled aria-hidden="true">
                ──
              </option>
              {languages.sort().map(lang => (
                <option value={lang.code}>
                  {ISO6391.getNativeName(lang.code) || lang.code}
                </option>
              ))}
            </select>
          </div>
          <div class="form-group">
            <label htmlFor="user-theme">{i18n.t("theme")}</label>
            <select
              id="user-theme"
              value={this.state.saveUserSettingsForm.theme}
              onChange={linkEvent(this, this.handleUserSettingsThemeChange)}
              class="ml-2 custom-select w-auto"
            >
              <option disabled aria-hidden="true">
                {i18n.t("theme")}
              </option>
              <option value="browser">{i18n.t("browser_default")}</option>
              {themes.map(theme => (
                <option value={theme}>{theme}</option>
              ))}
            </select>
          </div>
          <form className="form-group">
            <label>
              <div class="mr-2">{i18n.t("type")}</div>
            </label>
            <ListingTypeSelect
              type_={
                Object.values(ListingType)[
                  this.state.saveUserSettingsForm.default_listing_type
                ]
              }
              showLocal={showLocal(this.isoData)}
              onChange={this.handleUserSettingsListingTypeChange}
            />
          </form>
          <form className="form-group">
            <label>
              <div class="mr-2">{i18n.t("sort_type")}</div>
            </label>
            <SortSelect
              sort={
                Object.values(SortType)[
                  this.state.saveUserSettingsForm.default_sort_type
                ]
              }
              onChange={this.handleUserSettingsSortTypeChange}
            />
          </form>
          {this.state.siteRes.site_view.site.enable_nsfw && (
            <div class="form-group">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="user-show-nsfw"
                  type="checkbox"
                  checked={this.state.saveUserSettingsForm.show_nsfw}
                  onChange={linkEvent(
                    this,
                    this.handleUserSettingsShowNsfwChange
                  )}
                />
                <label class="form-check-label" htmlFor="user-show-nsfw">
                  {i18n.t("show_nsfw")}
                </label>
              </div>
            </div>
          )}
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-scores"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_scores}
                onChange={linkEvent(
                  this,
                  this.handleUserSettingsShowScoresChange
                )}
              />
              <label class="form-check-label" htmlFor="user-show-scores">
                {i18n.t("show_scores")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-avatars"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_avatars}
                onChange={linkEvent(
                  this,
                  this.handleUserSettingsShowAvatarsChange
                )}
              />
              <label class="form-check-label" htmlFor="user-show-avatars">
                {i18n.t("show_avatars")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-bot-account"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.bot_account}
                onChange={linkEvent(this, this.handleUserSettingsBotAccount)}
              />
              <label class="form-check-label" htmlFor="user-bot-account">
                {i18n.t("bot_account")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-bot-accounts"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_bot_accounts}
                onChange={linkEvent(
                  this,
                  this.handleUserSettingsShowBotAccounts
                )}
              />
              <label class="form-check-label" htmlFor="user-show-bot-accounts">
                {i18n.t("show_bot_accounts")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-read-posts"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_read_posts}
                onChange={linkEvent(this, this.handleUserSettingsShowReadPosts)}
              />
              <label class="form-check-label" htmlFor="user-show-read-posts">
                {i18n.t("show_read_posts")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-new-post-notifs"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_new_post_notifs}
                onChange={linkEvent(
                  this,
                  this.handleUserSettingsShowNewPostNotifs
                )}
              />
              <label
                class="form-check-label"
                htmlFor="user-show-new-post-notifs"
              >
                {i18n.t("show_new_post_notifs")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-send-notifications-to-email"
                type="checkbox"
                disabled={!this.state.saveUserSettingsForm.email}
                checked={
                  this.state.saveUserSettingsForm.send_notifications_to_email
                }
                onChange={linkEvent(
                  this,
                  this.handleUserSettingsSendNotificationsToEmailChange
                )}
              />
              <label
                class="form-check-label"
                htmlFor="user-send-notifications-to-email"
              >
                {i18n.t("send_notifications_to_email")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-block btn-secondary mr-4">
              {this.state.saveUserSettingsLoading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
          <hr />
          <div class="form-group">
            <button
              class="btn btn-block btn-danger"
              onClick={linkEvent(
                this,
                this.handleDeleteAccountShowConfirmToggle
              )}
            >
              {i18n.t("delete_account")}
            </button>
            {this.state.deleteAccountShowConfirm && (
              <>
                <div class="my-2 alert alert-danger" role="alert">
                  {i18n.t("delete_account_confirm")}
                </div>
                <input
                  type="password"
                  value={this.state.deleteAccountForm.password}
                  autoComplete="new-password"
                  maxLength={60}
                  onInput={linkEvent(
                    this,
                    this.handleDeleteAccountPasswordChange
                  )}
                  class="form-control my-2"
                />
                <button
                  class="btn btn-danger mr-4"
                  disabled={!this.state.deleteAccountForm.password}
                  onClick={linkEvent(this, this.handleDeleteAccount)}
                >
                  {this.state.deleteAccountLoading ? (
                    <Spinner />
                  ) : (
                    capitalizeFirstLetter(i18n.t("delete"))
                  )}
                </button>
                <button
                  class="btn btn-secondary"
                  onClick={linkEvent(
                    this,
                    this.handleDeleteAccountShowConfirmToggle
                  )}
                >
                  {i18n.t("cancel")}
                </button>
              </>
            )}
          </div>
        </form>
      </>
    );
  }

  handleUserSettingsShowNsfwChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowAvatarsChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_avatars = event.target.checked;
    UserService.Instance.localUserView.local_user.show_avatars =
      event.target.checked; // Just for instant updates
    i.setState(i.state);
  }

  handleUserSettingsBotAccount(i: Settings, event: any) {
    i.state.saveUserSettingsForm.bot_account = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowBotAccounts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_bot_accounts = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowReadPosts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_read_posts = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowNewPostNotifs(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_new_post_notifs = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowScoresChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_scores = event.target.checked;
    UserService.Instance.localUserView.local_user.show_scores =
      event.target.checked; // Just for instant updates
    i.setState(i.state);
  }

  handleUserSettingsSendNotificationsToEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.send_notifications_to_email =
      event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsThemeChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.theme = event.target.value;
    setTheme(event.target.value, true);
    i.setState(i.state);
  }

  handleUserSettingsLangChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.lang = event.target.value;
    i18n.changeLanguage(getLanguage(i.state.saveUserSettingsForm.lang));
    i.setState(i.state);
  }

  handleUserSettingsSortTypeChange(val: SortType) {
    this.state.saveUserSettingsForm.default_sort_type =
      Object.keys(SortType).indexOf(val);
    this.setState(this.state);
  }

  handleUserSettingsListingTypeChange(val: ListingType) {
    this.state.saveUserSettingsForm.default_listing_type =
      Object.keys(ListingType).indexOf(val);
    this.setState(this.state);
  }

  handleUserSettingsEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.email = event.target.value;
    i.setState(i.state);
  }

  handleUserSettingsBioChange(val: string) {
    this.state.saveUserSettingsForm.bio = val;
    this.setState(this.state);
  }

  handleAvatarUpload(url: string) {
    this.state.saveUserSettingsForm.avatar = url;
    this.setState(this.state);
  }

  handleAvatarRemove() {
    this.state.saveUserSettingsForm.avatar = "";
    this.setState(this.state);
  }

  handleBannerUpload(url: string) {
    this.state.saveUserSettingsForm.banner = url;
    this.setState(this.state);
  }

  handleBannerRemove() {
    this.state.saveUserSettingsForm.banner = "";
    this.setState(this.state);
  }

  handleUserSettingsPreferredUsernameChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.display_name = event.target.value;
    i.setState(i.state);
  }

  handleUserSettingsMatrixUserIdChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.matrix_user_id = event.target.value;
    if (
      i.state.saveUserSettingsForm.matrix_user_id == "" &&
      !UserService.Instance.localUserView.person.matrix_user_id
    ) {
      i.state.saveUserSettingsForm.matrix_user_id = undefined;
    }
    i.setState(i.state);
  }

  handleNewPasswordChange(i: Settings, event: any) {
    i.state.changePasswordForm.new_password = event.target.value;
    if (i.state.changePasswordForm.new_password == "") {
      i.state.changePasswordForm.new_password = undefined;
    }
    i.setState(i.state);
  }

  handleNewPasswordVerifyChange(i: Settings, event: any) {
    i.state.changePasswordForm.new_password_verify = event.target.value;
    if (i.state.changePasswordForm.new_password_verify == "") {
      i.state.changePasswordForm.new_password_verify = undefined;
    }
    i.setState(i.state);
  }

  handleOldPasswordChange(i: Settings, event: any) {
    i.state.changePasswordForm.old_password = event.target.value;
    if (i.state.changePasswordForm.old_password == "") {
      i.state.changePasswordForm.old_password = undefined;
    }
    i.setState(i.state);
  }

  handleSaveUserSettingsSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.state.saveUserSettingsLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.saveUserSettings(i.state.saveUserSettingsForm)
    );
  }

  handleChangePasswordSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.state.changePasswordLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.changePassword(i.state.changePasswordForm)
    );
  }

  handleDeleteAccountShowConfirmToggle(i: Settings, event: any) {
    event.preventDefault();
    i.state.deleteAccountShowConfirm = !i.state.deleteAccountShowConfirm;
    i.setState(i.state);
  }

  handleDeleteAccountPasswordChange(i: Settings, event: any) {
    i.state.deleteAccountForm.password = event.target.value;
    i.setState(i.state);
  }

  handleLogoutClick(i: Settings) {
    UserService.Instance.logout();
    i.context.router.history.push("/");
  }

  handleDeleteAccount(i: Settings, event: any) {
    event.preventDefault();
    i.state.deleteAccountLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.deleteAccount(i.state.deleteAccountForm)
    );
  }

  setUserInfo() {
    this.state.saveUserSettingsForm.show_nsfw =
      UserService.Instance.localUserView.local_user.show_nsfw;
    this.state.saveUserSettingsForm.theme = UserService.Instance.localUserView
      .local_user.theme
      ? UserService.Instance.localUserView.local_user.theme
      : "browser";
    this.state.saveUserSettingsForm.default_sort_type =
      UserService.Instance.localUserView.local_user.default_sort_type;
    this.state.saveUserSettingsForm.default_listing_type =
      UserService.Instance.localUserView.local_user.default_listing_type;
    this.state.saveUserSettingsForm.lang =
      UserService.Instance.localUserView.local_user.lang;
    this.state.saveUserSettingsForm.avatar =
      UserService.Instance.localUserView.person.avatar;
    this.state.saveUserSettingsForm.banner =
      UserService.Instance.localUserView.person.banner;
    this.state.saveUserSettingsForm.display_name =
      UserService.Instance.localUserView.person.display_name;
    this.state.saveUserSettingsForm.show_avatars =
      UserService.Instance.localUserView.local_user.show_avatars;
    this.state.saveUserSettingsForm.bot_account =
      UserService.Instance.localUserView.person.bot_account;
    this.state.saveUserSettingsForm.show_bot_accounts =
      UserService.Instance.localUserView.local_user.show_bot_accounts;
    this.state.saveUserSettingsForm.show_scores =
      UserService.Instance.localUserView.local_user.show_scores;
    this.state.saveUserSettingsForm.show_read_posts =
      UserService.Instance.localUserView.local_user.show_read_posts;
    this.state.saveUserSettingsForm.show_new_post_notifs =
      UserService.Instance.localUserView.local_user.show_new_post_notifs;
    this.state.saveUserSettingsForm.email =
      UserService.Instance.localUserView.local_user.email;
    this.state.saveUserSettingsForm.bio =
      UserService.Instance.localUserView.person.bio;
    this.state.saveUserSettingsForm.send_notifications_to_email =
      UserService.Instance.localUserView.local_user.send_notifications_to_email;
    this.state.saveUserSettingsForm.matrix_user_id =
      UserService.Instance.localUserView.person.matrix_user_id;
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.SaveUserSettings) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      UserService.Instance.login(data);
      this.state.saveUserSettingsLoading = false;
      this.setState(this.state);

      window.scrollTo(0, 0);
    } else if (op == UserOperation.ChangePassword) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      UserService.Instance.login(data);
      this.state.changePasswordLoading = false;
      this.setState(this.state);
      window.scrollTo(0, 0);
      toast(i18n.t("password_changed"));
    } else if (op == UserOperation.DeleteAccount) {
      this.setState({
        deleteAccountLoading: false,
        deleteAccountShowConfirm: false,
      });
      UserService.Instance.logout();
      window.location.href = "/";
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg).data;
      let personName = data.person_view.person.name;
      let blocked = data.blocked;
      toast(
        `${personName} has been ${blocked ? "blocked" : "unblocked"}`,
        "success"
      );
    }
  }
}
