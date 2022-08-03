import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  BlockCommunity,
  BlockCommunityResponse,
  BlockPerson,
  BlockPersonResponse,
  ChangePassword,
  CommunityBlockView,
  CommunityView,
  DeleteAccount,
  GetSiteResponse,
  ListingType,
  LoginResponse,
  PersonBlockView,
  PersonViewSafe,
  SaveUserSettings,
  SortType,
  toUndefined,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n, languages } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  capitalizeFirstLetter,
  choicesConfig,
  communitySelectName,
  communityToChoice,
  debounce,
  elementUrl,
  enableNsfw,
  fetchCommunities,
  fetchThemeList,
  fetchUsers,
  getLanguages,
  isBrowser,
  personSelectName,
  personToChoice,
  relTags,
  setIsoData,
  setTheme,
  setupTippy,
  showLocal,
  toast,
  updateCommunityBlock,
  updatePersonBlock,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "./person-listing";

var Choices: any;
if (isBrowser()) {
  Choices = require("choices.js");
}

interface SettingsState {
  saveUserSettingsForm: SaveUserSettings;
  changePasswordForm: ChangePassword;
  deleteAccountForm: DeleteAccount;
  personBlocks: PersonBlockView[];
  blockPerson: Option<PersonViewSafe>;
  communityBlocks: CommunityBlockView[];
  blockCommunityId: number;
  blockCommunity?: CommunityView;
  currentTab: string;
  themeList: string[];
  saveUserSettingsLoading: boolean;
  changePasswordLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  siteRes: GetSiteResponse;
}

export class Settings extends Component<any, SettingsState> {
  private isoData = setIsoData(this.context);
  private blockPersonChoices: any;
  private blockCommunityChoices: any;
  private subscription: Subscription;
  private emptyState: SettingsState = {
    saveUserSettingsForm: new SaveUserSettings({
      show_nsfw: None,
      show_scores: None,
      show_avatars: None,
      show_read_posts: None,
      show_bot_accounts: None,
      show_new_post_notifs: None,
      default_sort_type: None,
      default_listing_type: None,
      theme: None,
      lang: None,
      avatar: None,
      banner: None,
      display_name: None,
      email: None,
      bio: None,
      matrix_user_id: None,
      send_notifications_to_email: None,
      bot_account: None,
      auth: undefined,
    }),
    changePasswordForm: new ChangePassword({
      new_password: undefined,
      new_password_verify: undefined,
      old_password: undefined,
      auth: undefined,
    }),
    saveUserSettingsLoading: false,
    changePasswordLoading: false,
    deleteAccountLoading: false,
    deleteAccountShowConfirm: false,
    deleteAccountForm: new DeleteAccount({
      password: undefined,
      auth: undefined,
    }),
    personBlocks: [],
    blockPerson: None,
    communityBlocks: [],
    blockCommunityId: 0,
    currentTab: "settings",
    siteRes: this.isoData.site_res,
    themeList: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortTypeChange = this.handleSortTypeChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleBioChange = this.handleBioChange.bind(this);

    this.handleAvatarUpload = this.handleAvatarUpload.bind(this);
    this.handleAvatarRemove = this.handleAvatarRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    this.setUserInfo();
  }

  async componentDidMount() {
    setupTippy();
    this.setState({ themeList: await fetchThemeList() });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  get documentTitle(): string {
    return i18n.t("settings");
  }

  render() {
    return (
      <div className="container">
        <>
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            description={Some(this.documentTitle)}
            image={this.state.saveUserSettingsForm.avatar}
          />
          <ul className="nav nav-tabs mb-2">
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "settings" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "settings" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("settings")}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "blocks" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "blocks" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("blocks")}
              </button>
            </li>
          </ul>
          {this.state.currentTab == "settings" && this.userSettings()}
          {this.state.currentTab == "blocks" && this.blockCards()}
        </>
      </div>
    );
  }

  userSettings() {
    return (
      <div className="row">
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.saveUserSettingsHtmlForm()}</div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.changePasswordHtmlForm()}</div>
          </div>
        </div>
      </div>
    );
  }

  blockCards() {
    return (
      <div className="row">
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.blockUserCard()}</div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.blockCommunityCard()}</div>
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
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-password">
              {i18n.t("new_password")}
            </label>
            <div className="col-sm-7">
              <input
                type="password"
                id="user-password"
                className="form-control"
                value={this.state.changePasswordForm.new_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-sm-5 col-form-label"
              htmlFor="user-verify-password"
            >
              {i18n.t("verify_password")}
            </label>
            <div className="col-sm-7">
              <input
                type="password"
                id="user-verify-password"
                className="form-control"
                value={this.state.changePasswordForm.new_password_verify}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordVerifyChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-sm-5 col-form-label"
              htmlFor="user-old-password"
            >
              {i18n.t("old_password")}
            </label>
            <div className="col-sm-7">
              <input
                type="password"
                id="user-old-password"
                className="form-control"
                value={this.state.changePasswordForm.old_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleOldPasswordChange)}
              />
            </div>
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-block btn-secondary mr-4">
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

  blockUserCard() {
    return (
      <div>
        {this.blockUserForm()}
        {this.blockedUsersList()}
      </div>
    );
  }

  blockedUsersList() {
    return (
      <>
        <h5>{i18n.t("blocked_users")}</h5>
        <ul className="list-unstyled mb-0">
          {this.state.personBlocks.map(pb => (
            <li key={pb.person.id}>
              <span>
                <PersonListing person={pb.target} />
                <button
                  className="btn btn-sm"
                  onClick={linkEvent(
                    { ctx: this, recipientId: pb.target.id },
                    this.handleUnblockPerson
                  )}
                  data-tippy-content={i18n.t("unblock_user")}
                >
                  <Icon icon="x" classes="icon-inline" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockUserForm() {
    return (
      <div className="form-group row">
        <label
          className="col-md-4 col-form-label"
          htmlFor="block-person-filter"
        >
          {i18n.t("block_user")}
        </label>
        <div className="col-md-8">
          <select
            className="form-control"
            id="block-person-filter"
            value={this.state.blockPerson.map(p => p.person.id).unwrapOr(0)}
          >
            <option value="0">—</option>
            {this.state.blockPerson.match({
              some: personView => (
                <option value={personView.person.id}>
                  {personSelectName(personView)}
                </option>
              ),
              none: <></>,
            })}
          </select>
        </div>
      </div>
    );
  }

  blockCommunityCard() {
    return (
      <div>
        {this.blockCommunityForm()}
        {this.blockedCommunitiesList()}
      </div>
    );
  }

  blockedCommunitiesList() {
    return (
      <>
        <h5>{i18n.t("blocked_communities")}</h5>
        <ul className="list-unstyled mb-0">
          {this.state.communityBlocks.map(cb => (
            <li key={cb.community.id}>
              <span>
                <CommunityLink community={cb.community} />
                <button
                  className="btn btn-sm"
                  onClick={linkEvent(
                    { ctx: this, communityId: cb.community.id },
                    this.handleUnblockCommunity
                  )}
                  data-tippy-content={i18n.t("unblock_community")}
                >
                  <Icon icon="x" classes="icon-inline" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockCommunityForm() {
    return (
      <div className="form-group row">
        <label
          className="col-md-4 col-form-label"
          htmlFor="block-community-filter"
        >
          {i18n.t("block_community")}
        </label>
        <div className="col-md-8">
          <select
            className="form-control"
            id="block-community-filter"
            value={this.state.blockCommunityId}
          >
            <option value="0">—</option>
            {this.state.blockCommunity && (
              <option value={this.state.blockCommunity.community.id}>
                {communitySelectName(this.state.blockCommunity)}
              </option>
            )}
          </select>
        </div>
      </div>
    );
  }

  saveUserSettingsHtmlForm() {
    return (
      <>
        <h5>{i18n.t("settings")}</h5>
        <form onSubmit={linkEvent(this, this.handleSaveSettingsSubmit)}>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="display-name">
              {i18n.t("display_name")}
            </label>
            <div className="col-sm-7">
              <input
                id="display-name"
                type="text"
                className="form-control"
                placeholder={i18n.t("optional")}
                value={toUndefined(
                  this.state.saveUserSettingsForm.display_name
                )}
                onInput={linkEvent(this, this.handleDisplayNameChange)}
                pattern="^(?!@)(.+)$"
                minLength={3}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="user-bio">
              {i18n.t("bio")}
            </label>
            <div className="col-sm-9">
              <MarkdownTextArea
                initialContent={this.state.saveUserSettingsForm.bio}
                onContentChange={this.handleBioChange}
                maxLength={Some(300)}
                placeholder={None}
                buttonTitle={None}
                hideNavigationWarnings
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="user-email">
              {i18n.t("email")}
            </label>
            <div className="col-sm-9">
              <input
                type="email"
                id="user-email"
                className="form-control"
                placeholder={i18n.t("optional")}
                value={toUndefined(this.state.saveUserSettingsForm.email)}
                onInput={linkEvent(this, this.handleEmailChange)}
                minLength={3}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="matrix-user-id">
              <a href={elementUrl} rel={relTags}>
                {i18n.t("matrix_user_id")}
              </a>
            </label>
            <div className="col-sm-7">
              <input
                id="matrix-user-id"
                type="text"
                className="form-control"
                placeholder="@user:example.com"
                value={toUndefined(
                  this.state.saveUserSettingsForm.matrix_user_id
                )}
                onInput={linkEvent(this, this.handleMatrixUserIdChange)}
                pattern="^@[A-Za-z0-9._=-]+:[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3">{i18n.t("avatar")}</label>
            <div className="col-sm-9">
              <ImageUploadForm
                uploadTitle={i18n.t("upload_avatar")}
                imageSrc={this.state.saveUserSettingsForm.avatar}
                onUpload={this.handleAvatarUpload}
                onRemove={this.handleAvatarRemove}
                rounded
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3">{i18n.t("banner")}</label>
            <div className="col-sm-9">
              <ImageUploadForm
                uploadTitle={i18n.t("upload_banner")}
                imageSrc={this.state.saveUserSettingsForm.banner}
                onUpload={this.handleBannerUpload}
                onRemove={this.handleBannerRemove}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3" htmlFor="user-language">
              {i18n.t("language")}
            </label>
            <div className="col-sm-9">
              <select
                id="user-language"
                value={toUndefined(this.state.saveUserSettingsForm.lang)}
                onChange={linkEvent(this, this.handleLangChange)}
                className="custom-select w-auto"
              >
                <option disabled aria-hidden="true">
                  {i18n.t("language")}
                </option>
                <option value="browser">{i18n.t("browser_default")}</option>
                <option disabled aria-hidden="true">
                  ──
                </option>
                {languages
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3" htmlFor="user-theme">
              {i18n.t("theme")}
            </label>
            <div className="col-sm-9">
              <select
                id="user-theme"
                value={toUndefined(this.state.saveUserSettingsForm.theme)}
                onChange={linkEvent(this, this.handleThemeChange)}
                className="custom-select w-auto"
              >
                <option disabled aria-hidden="true">
                  {i18n.t("theme")}
                </option>
                <option value="browser">{i18n.t("browser_default")}</option>
                {this.state.themeList.map(theme => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <form className="form-group row">
            <label className="col-sm-3">{i18n.t("type")}</label>
            <div className="col-sm-9">
              <ListingTypeSelect
                type_={
                  Object.values(ListingType)[
                    this.state.saveUserSettingsForm.default_listing_type.unwrapOr(
                      1
                    )
                  ]
                }
                showLocal={showLocal(this.isoData)}
                showSubscribed
                onChange={this.handleListingTypeChange}
              />
            </div>
          </form>
          <form className="form-group row">
            <label className="col-sm-3">{i18n.t("sort_type")}</label>
            <div className="col-sm-9">
              <SortSelect
                sort={
                  Object.values(SortType)[
                    this.state.saveUserSettingsForm.default_sort_type.unwrapOr(
                      0
                    )
                  ]
                }
                onChange={this.handleSortTypeChange}
              />
            </div>
          </form>
          {enableNsfw(this.state.siteRes) && (
            <div className="form-group">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="user-show-nsfw"
                  type="checkbox"
                  checked={toUndefined(
                    this.state.saveUserSettingsForm.show_nsfw
                  )}
                  onChange={linkEvent(this, this.handleShowNsfwChange)}
                />
                <label className="form-check-label" htmlFor="user-show-nsfw">
                  {i18n.t("show_nsfw")}
                </label>
              </div>
            </div>
          )}
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-scores"
                type="checkbox"
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_scores
                )}
                onChange={linkEvent(this, this.handleShowScoresChange)}
              />
              <label className="form-check-label" htmlFor="user-show-scores">
                {i18n.t("show_scores")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-avatars"
                type="checkbox"
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_avatars
                )}
                onChange={linkEvent(this, this.handleShowAvatarsChange)}
              />
              <label className="form-check-label" htmlFor="user-show-avatars">
                {i18n.t("show_avatars")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-bot-account"
                type="checkbox"
                checked={toUndefined(
                  this.state.saveUserSettingsForm.bot_account
                )}
                onChange={linkEvent(this, this.handleBotAccount)}
              />
              <label className="form-check-label" htmlFor="user-bot-account">
                {i18n.t("bot_account")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-bot-accounts"
                type="checkbox"
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_bot_accounts
                )}
                onChange={linkEvent(this, this.handleShowBotAccounts)}
              />
              <label
                className="form-check-label"
                htmlFor="user-show-bot-accounts"
              >
                {i18n.t("show_bot_accounts")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-read-posts"
                type="checkbox"
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_read_posts
                )}
                onChange={linkEvent(this, this.handleReadPosts)}
              />
              <label
                className="form-check-label"
                htmlFor="user-show-read-posts"
              >
                {i18n.t("show_read_posts")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-new-post-notifs"
                type="checkbox"
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_new_post_notifs
                )}
                onChange={linkEvent(this, this.handleShowNewPostNotifs)}
              />
              <label
                className="form-check-label"
                htmlFor="user-show-new-post-notifs"
              >
                {i18n.t("show_new_post_notifs")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-send-notifications-to-email"
                type="checkbox"
                disabled={!this.state.saveUserSettingsForm.email}
                checked={toUndefined(
                  this.state.saveUserSettingsForm.send_notifications_to_email
                )}
                onChange={linkEvent(
                  this,
                  this.handleSendNotificationsToEmailChange
                )}
              />
              <label
                className="form-check-label"
                htmlFor="user-send-notifications-to-email"
              >
                {i18n.t("send_notifications_to_email")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-block btn-secondary mr-4">
              {this.state.saveUserSettingsLoading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
          <hr />
          <div className="form-group">
            <button
              className="btn btn-block btn-danger"
              onClick={linkEvent(
                this,
                this.handleDeleteAccountShowConfirmToggle
              )}
            >
              {i18n.t("delete_account")}
            </button>
            {this.state.deleteAccountShowConfirm && (
              <>
                <div className="my-2 alert alert-danger" role="alert">
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
                  className="form-control my-2"
                />
                <button
                  className="btn btn-danger mr-4"
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
                  className="btn btn-secondary"
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

  setupBlockPersonChoices() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("block-person-filter");
      if (selectId) {
        this.blockPersonChoices = new Choices(selectId, choicesConfig);
        this.blockPersonChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.handleBlockPerson(Number(e.detail.choice.value));
          },
          false
        );
        this.blockPersonChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let persons = (await fetchUsers(e.detail.value)).users;
              let choices = persons.map(pvs => personToChoice(pvs));
              this.blockPersonChoices.setChoices(
                choices,
                "value",
                "label",
                true
              );
            } catch (err) {
              console.error(err);
            }
          }),
          false
        );
      }
    }
  }

  setupBlockCommunityChoices() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("block-community-filter");
      if (selectId) {
        this.blockCommunityChoices = new Choices(selectId, choicesConfig);
        this.blockCommunityChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.handleBlockCommunity(Number(e.detail.choice.value));
          },
          false
        );
        this.blockCommunityChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let communities = (await fetchCommunities(e.detail.value))
                .communities;
              let choices = communities.map(cv => communityToChoice(cv));
              this.blockCommunityChoices.setChoices(
                choices,
                "value",
                "label",
                true
              );
            } catch (err) {
              console.log(err);
            }
          }),
          false
        );
      }
    }
  }

  handleBlockPerson(personId: number) {
    if (personId != 0) {
      let blockUserForm = new BlockPerson({
        person_id: personId,
        block: true,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }

  handleUnblockPerson(i: { ctx: Settings; recipientId: number }) {
    let blockUserForm = new BlockPerson({
      person_id: i.recipientId,
      block: false,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  handleBlockCommunity(community_id: number) {
    if (community_id != 0) {
      let blockCommunityForm = new BlockCommunity({
        community_id,
        block: true,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }

  handleUnblockCommunity(i: { ctx: Settings; communityId: number }) {
    let blockCommunityForm = new BlockCommunity({
      community_id: i.communityId,
      block: false,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockCommunity(blockCommunityForm));
  }

  handleShowNsfwChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_nsfw = Some(event.target.checked);
    i.setState(i.state);
  }

  handleShowAvatarsChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_avatars = Some(event.target.checked);
    UserService.Instance.myUserInfo.match({
      some: mui =>
        (mui.local_user_view.local_user.show_avatars = event.target.checked),
      none: void 0,
    });
    i.setState(i.state);
  }

  handleBotAccount(i: Settings, event: any) {
    i.state.saveUserSettingsForm.bot_account = Some(event.target.checked);
    i.setState(i.state);
  }

  handleShowBotAccounts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_bot_accounts = Some(event.target.checked);
    i.setState(i.state);
  }

  handleReadPosts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_read_posts = Some(event.target.checked);
    i.setState(i.state);
  }

  handleShowNewPostNotifs(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_new_post_notifs = Some(
      event.target.checked
    );
    i.setState(i.state);
  }

  handleShowScoresChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_scores = Some(event.target.checked);
    UserService.Instance.myUserInfo.match({
      some: mui =>
        (mui.local_user_view.local_user.show_scores = event.target.checked),
      none: void 0,
    });
    i.setState(i.state);
  }

  handleSendNotificationsToEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.send_notifications_to_email = Some(
      event.target.checked
    );
    i.setState(i.state);
  }

  handleThemeChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.theme = Some(event.target.value);
    setTheme(event.target.value, true);
    i.setState(i.state);
  }

  handleLangChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.lang = Some(event.target.value);
    i18n.changeLanguage(
      getLanguages(i.state.saveUserSettingsForm.lang.unwrap())[0]
    );
    i.setState(i.state);
  }

  handleSortTypeChange(val: SortType) {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        default_sort_type: Some(Object.keys(SortType).indexOf(val)),
      },
    });
  }

  handleListingTypeChange(val: ListingType) {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        default_listing_type: Some(Object.keys(ListingType).indexOf(val)),
      },
    });
  }

  handleEmailChange(i: Settings, event: any) {
    i.setState({
      saveUserSettingsForm: {
        ...i.state.saveUserSettingsForm,
        email: Some(event.target.value),
      },
    });
  }

  handleBioChange(val: string) {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        bio: Some(val),
      },
    });
  }

  handleAvatarUpload(url: string) {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        avatar: Some(url),
      },
    });
  }

  handleAvatarRemove() {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        avatar: Some(""),
      },
    });
  }

  handleBannerUpload(url: string) {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        banner: Some(url),
      },
    });
  }

  handleBannerRemove() {
    this.setState({
      saveUserSettingsForm: {
        ...this.state.saveUserSettingsForm,
        banner: Some(""),
      },
    });
  }

  handleDisplayNameChange(i: Settings, event: any) {
    i.setState({
      saveUserSettingsForm: {
        ...i.state.saveUserSettingsForm,
        display_name: Some(event.target.value),
      },
    });
  }

  handleMatrixUserIdChange(i: Settings, event: any) {
    i.setState({
      saveUserSettingsForm: {
        ...i.state.saveUserSettingsForm,
        matrix_user_id: Some(event.target.value),
      },
    });
  }

  handleNewPasswordChange(i: Settings, event: any) {
    i.setState({
      changePasswordForm: {
        ...i.state.changePasswordForm,
        new_password: event.target.value,
      },
    });
    if (i.state.changePasswordForm.new_password == "") {
      i.setState({
        changePasswordForm: {
          ...i.state.changePasswordForm,
          new_password: undefined,
        },
      });
    }
  }

  handleNewPasswordVerifyChange(i: Settings, event: any) {
    i.setState({
      changePasswordForm: {
        ...i.state.changePasswordForm,
        new_password_verify: event.target.value,
      },
    });
    if (i.state.changePasswordForm.new_password_verify == "") {
      i.setState({
        changePasswordForm: {
          ...i.state.changePasswordForm,
          new_password_verify: undefined,
        },
      });
    }
  }

  handleOldPasswordChange(i: Settings, event: any) {
    i.setState({
      changePasswordForm: {
        ...i.state.changePasswordForm,
        old_password: event.target.value,
      },
    });
    if (i.state.changePasswordForm.old_password == "") {
      i.setState({
        changePasswordForm: {
          ...i.state.changePasswordForm,
          old_password: undefined,
        },
      });
    }
  }

  handleSaveSettingsSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.setState({
      saveUserSettingsLoading: true,
      saveUserSettingsForm: {
        ...i.state.saveUserSettingsForm,
        auth: auth().unwrap(),
      },
    });

    WebSocketService.Instance.send(
      wsClient.saveUserSettings(i.state.saveUserSettingsForm)
    );
  }

  handleChangePasswordSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.setState({
      changePasswordLoading: true,
      changePasswordForm: {
        ...i.state.changePasswordForm,
        auth: auth().unwrap(),
      },
    });

    WebSocketService.Instance.send(
      wsClient.changePassword(i.state.changePasswordForm)
    );
  }

  handleDeleteAccountShowConfirmToggle(i: Settings, event: any) {
    event.preventDefault();
    i.setState({ deleteAccountShowConfirm: !i.state.deleteAccountShowConfirm });
  }

  handleDeleteAccountPasswordChange(i: Settings, event: any) {
    i.setState({
      deleteAccountForm: {
        ...i.state.deleteAccountForm,
        password: event.target.value,
      },
    });
  }

  handleDeleteAccount(i: Settings, event: any) {
    event.preventDefault();
    i.setState({
      deleteAccountLoading: true,
      deleteAccountForm: {
        ...i.state.deleteAccountForm,
        auth: auth().unwrap(),
      },
    });

    WebSocketService.Instance.send(
      wsClient.deleteAccount(i.state.deleteAccountForm)
    );
  }

  handleSwitchTab(i: { ctx: Settings; tab: string }) {
    i.ctx.setState({ currentTab: i.tab });

    if (i.ctx.state.currentTab == "blocks") {
      i.ctx.setupBlockPersonChoices();
      i.ctx.setupBlockCommunityChoices();
    }
  }

  setUserInfo() {
    UserService.Instance.myUserInfo.match({
      some: mui => {
        let luv = mui.local_user_view;
        this.setState({
          saveUserSettingsForm: {
            ...this.state.saveUserSettingsForm,
            show_nsfw: Some(luv.local_user.show_nsfw),
            theme: Some(
              luv.local_user.theme ? luv.local_user.theme : "browser"
            ),
            default_sort_type: Some(luv.local_user.default_sort_type),
            default_listing_type: Some(luv.local_user.default_listing_type),
            lang: Some(luv.local_user.lang),
            avatar: luv.person.avatar,
            banner: luv.person.banner,
            display_name: luv.person.display_name,
            show_avatars: Some(luv.local_user.show_avatars),
            bot_account: Some(luv.person.bot_account),
            show_bot_accounts: Some(luv.local_user.show_bot_accounts),
            show_scores: Some(luv.local_user.show_scores),
            show_read_posts: Some(luv.local_user.show_read_posts),
            show_new_post_notifs: Some(luv.local_user.show_new_post_notifs),
            email: luv.local_user.email,
            bio: luv.person.bio,
            send_notifications_to_email: Some(
              luv.local_user.send_notifications_to_email
            ),
            matrix_user_id: luv.person.matrix_user_id,
          },
          personBlocks: mui.person_blocks,
          communityBlocks: mui.community_blocks,
        });
      },
      none: void 0,
    });
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      this.setState({
        saveUserSettingsLoading: false,
        changePasswordLoading: false,
        deleteAccountLoading: false,
      });
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.SaveUserSettings) {
      let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
      UserService.Instance.login(data);
      this.setState({ saveUserSettingsLoading: false });
      toast(i18n.t("saved"));
      window.scrollTo(0, 0);
    } else if (op == UserOperation.ChangePassword) {
      let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
      UserService.Instance.login(data);
      this.setState({ changePasswordLoading: false });
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
      let data = wsJsonToRes<BlockPersonResponse>(msg, BlockPersonResponse);
      updatePersonBlock(data).match({
        some: blocks => this.setState({ personBlocks: blocks }),
        none: void 0,
      });
    } else if (op == UserOperation.BlockCommunity) {
      let data = wsJsonToRes<BlockCommunityResponse>(
        msg,
        BlockCommunityResponse
      );
      updateCommunityBlock(data).match({
        some: blocks => this.setState({ communityBlocks: blocks }),
        none: void 0,
      });
    }
  }
}
