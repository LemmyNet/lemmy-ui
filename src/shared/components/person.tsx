import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { Subscription } from "rxjs";
import ISO6391 from "iso-639-1";
import {
  UserOperation,
  SortType,
  ListingType,
  SaveUserSettings,
  LoginResponse,
  DeleteAccount,
  GetSiteResponse,
  GetPersonDetailsResponse,
  AddAdminResponse,
  GetPersonDetails,
  CommentResponse,
  PostResponse,
  BanPersonResponse,
  ChangePassword,
} from "lemmy-js-client";
import { InitialFetchRequest, PersonDetailsView } from "../interfaces";
import { WebSocketService, UserService } from "../services";
import {
  wsJsonToRes,
  fetchLimit,
  routeSortTypeToEnum,
  capitalizeFirstLetter,
  themes,
  setTheme,
  languages,
  toast,
  setupTippy,
  getLanguage,
  mdToHtml,
  elementUrl,
  setIsoData,
  getIdFromProps,
  getUsernameFromProps,
  wsSubscribe,
  createCommentLikeRes,
  editCommentRes,
  saveCommentRes,
  createPostLikeFindRes,
  previewLines,
  editPostFindRes,
  wsUserOp,
  wsClient,
  authField,
  setOptionalAuth,
  saveScrollPosition,
  restoreScrollPosition,
  showLocal,
} from "../utils";
import { PersonListing } from "./person-listing";
import { HtmlTags } from "./html-tags";
import { SortSelect } from "./sort-select";
import { ListingTypeSelect } from "./listing-type-select";
import { MomentTime } from "./moment-time";
import { i18n } from "../i18next";
import moment from "moment";
import { PersonDetails } from "./person-details";
import { MarkdownTextArea } from "./markdown-textarea";
import { Icon, Spinner } from "./icon";
import { ImageUploadForm } from "./image-upload-form";
import { BannerIconHeader } from "./banner-icon-header";
import { CommunityLink } from "./community-link";

interface PersonState {
  personRes: GetPersonDetailsResponse;
  personId: number;
  userName: string;
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  loading: boolean;
  saveUserSettingsForm: SaveUserSettings;
  changePasswordForm: ChangePassword;
  saveUserSettingsLoading: boolean;
  changePasswordLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  deleteAccountForm: DeleteAccount;
  siteRes: GetSiteResponse;
}

interface PersonProps {
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  person_id: number | null;
  username: string;
}

interface UrlParams {
  view?: string;
  sort?: SortType;
  page?: number;
}

export class Person extends Component<any, PersonState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: PersonState = {
    personRes: undefined,
    personId: getIdFromProps(this.props),
    userName: getUsernameFromProps(this.props),
    loading: true,
    view: Person.getViewFromProps(this.props.match.view),
    sort: Person.getSortTypeFromProps(this.props.match.sort),
    page: Person.getPageFromProps(this.props.match.page),
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
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleUserSettingsSortTypeChange = this.handleUserSettingsSortTypeChange.bind(
      this
    );
    this.handleUserSettingsListingTypeChange = this.handleUserSettingsListingTypeChange.bind(
      this
    );
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleUserSettingsBioChange = this.handleUserSettingsBioChange.bind(
      this
    );

    this.handleAvatarUpload = this.handleAvatarUpload.bind(this);
    this.handleAvatarRemove = this.handleAvatarRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.personRes = this.isoData.routeData[0];
      this.setUserInfo();
      this.state.loading = false;
    } else {
      this.fetchUserData();
    }

    setupTippy();
  }

  fetchUserData() {
    let form: GetPersonDetails = {
      person_id: this.state.personId,
      username: this.state.userName,
      sort: this.state.sort,
      saved_only: this.state.view === PersonDetailsView.Saved,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(false),
    };
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  get isCurrentUser() {
    return (
      UserService.Instance.localUserView?.person.id ==
      this.state.personRes.person_view.person.id
    );
  }

  static getViewFromProps(view: string): PersonDetailsView {
    return view ? PersonDetailsView[view] : PersonDetailsView.Overview;
  }

  static getSortTypeFromProps(sort: string): SortType {
    return sort ? routeSortTypeToEnum(sort) : SortType.New;
  }

  static getPageFromProps(page: number): number {
    return page ? Number(page) : 1;
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let promises: Promise<any>[] = [];

    // It can be /u/me, or /username/1
    let idOrName = pathSplit[2];
    let person_id: number;
    let username: string;
    if (isNaN(Number(idOrName))) {
      username = idOrName;
    } else {
      person_id = Number(idOrName);
    }

    let view = this.getViewFromProps(pathSplit[4]);
    let sort = this.getSortTypeFromProps(pathSplit[6]);
    let page = this.getPageFromProps(Number(pathSplit[8]));

    let form: GetPersonDetails = {
      sort,
      saved_only: view === PersonDetailsView.Saved,
      page,
      limit: fetchLimit,
    };
    setOptionalAuth(form, req.auth);
    this.setIdOrName(form, person_id, username);
    promises.push(req.client.getPersonDetails(form));
    return promises;
  }

  static setIdOrName(obj: any, id: number, name_: string) {
    if (id) {
      obj.person_id = id;
    } else {
      obj.username = name_;
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    saveScrollPosition(this.context);
  }

  static getDerivedStateFromProps(props: any): PersonProps {
    return {
      view: this.getViewFromProps(props.match.params.view),
      sort: this.getSortTypeFromProps(props.match.params.sort),
      page: this.getPageFromProps(props.match.params.page),
      person_id: Number(props.match.params.id) || null,
      username: props.match.params.username,
    };
  }

  componentDidUpdate(lastProps: any) {
    // Necessary if you are on a post and you click another post (same route)
    if (
      lastProps.location.pathname.split("/")[2] !==
      lastProps.history.location.pathname.split("/")[2]
    ) {
      // Couldnt get a refresh working. This does for now.
      location.reload();
    }
  }

  get documentTitle(): string {
    return `@${this.state.personRes.person_view.person.name} - ${this.state.siteRes.site_view.site.name}`;
  }

  get bioTag(): string {
    return this.state.personRes.person_view.person.bio
      ? previewLines(this.state.personRes.person_view.person.bio)
      : undefined;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-md-8">
              <>
                <HtmlTags
                  title={this.documentTitle}
                  path={this.context.router.route.match.url}
                  description={this.bioTag}
                  image={this.state.personRes.person_view.person.avatar}
                />
                {this.userInfo()}
                <hr />
              </>
              {!this.state.loading && this.selects()}
              <PersonDetails
                personRes={this.state.personRes}
                admins={this.state.siteRes.admins}
                sort={this.state.sort}
                page={this.state.page}
                limit={fetchLimit}
                enableDownvotes={
                  this.state.siteRes.site_view.site.enable_downvotes
                }
                enableNsfw={this.state.siteRes.site_view.site.enable_nsfw}
                view={this.state.view}
                onPageChange={this.handlePageChange}
              />
            </div>

            {!this.state.loading && (
              <div class="col-12 col-md-4">
                {this.isCurrentUser && this.userSettings()}
                {this.moderates()}
                {this.follows()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  viewRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Overview && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Overview}
            checked={this.state.view === PersonDetailsView.Overview}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("overview")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Comments && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Comments}
            checked={this.state.view == PersonDetailsView.Comments}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("comments")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Posts && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Posts}
            checked={this.state.view == PersonDetailsView.Posts}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("posts")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Saved && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Saved}
            checked={this.state.view == PersonDetailsView.Saved}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("saved")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span class="mr-3">{this.viewRadios()}</span>
        <SortSelect
          sort={this.state.sort}
          onChange={this.handleSortChange}
          hideHot
          hideMostComments
        />
        <a
          href={`/feeds/u/${this.state.userName}.xml?sort=${this.state.sort}`}
          rel="noopener"
          title="RSS"
        >
          <Icon icon="rss" classes="text-muted small mx-2" />
        </a>
      </div>
    );
  }

  userInfo() {
    let pv = this.state.personRes?.person_view;

    return (
      <div>
        <BannerIconHeader banner={pv.person.banner} icon={pv.person.avatar} />
        <div class="mb-3">
          <div class="">
            <div class="mb-0 d-flex flex-wrap">
              <div>
                {pv.person.display_name && (
                  <h5 class="mb-0">{pv.person.display_name}</h5>
                )}
                <ul class="list-inline mb-2">
                  <li className="list-inline-item">
                    <PersonListing
                      person={pv.person}
                      realLink
                      useApubName
                      muted
                      hideAvatar
                    />
                  </li>
                  {pv.person.banned && (
                    <li className="list-inline-item badge badge-danger">
                      {i18n.t("banned")}
                    </li>
                  )}
                </ul>
              </div>
              <div className="flex-grow-1 unselectable pointer mx-2"></div>
              {this.isCurrentUser ? (
                <button
                  class="d-flex align-self-start btn btn-secondary mr-2"
                  onClick={linkEvent(this, this.handleLogoutClick)}
                >
                  {i18n.t("logout")}
                </button>
              ) : (
                <>
                  <a
                    className={`d-flex align-self-start btn btn-secondary mr-2 ${
                      !pv.person.matrix_user_id && "invisible"
                    }`}
                    rel="noopener"
                    href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                  >
                    {i18n.t("send_secure_message")}
                  </a>
                  <Link
                    className={"d-flex align-self-start btn btn-secondary"}
                    to={`/create_private_message/recipient/${pv.person.id}`}
                  >
                    {i18n.t("send_message")}
                  </Link>
                </>
              )}
            </div>
            {pv.person.bio && (
              <div className="d-flex align-items-center mb-2">
                <div
                  className="md-div"
                  dangerouslySetInnerHTML={mdToHtml(pv.person.bio)}
                />
              </div>
            )}
            <div>
              <ul class="list-inline mb-2">
                <li className="list-inline-item badge badge-light">
                  {i18n.t("number_of_posts", { count: pv.counts.post_count })}
                </li>
                <li className="list-inline-item badge badge-light">
                  {i18n.t("number_of_comments", {
                    count: pv.counts.comment_count,
                  })}
                </li>
              </ul>
            </div>
            <div class="text-muted">
              {i18n.t("joined")}{" "}
              <MomentTime data={pv.person} showAgo ignoreUpdated />
            </div>
            <div className="d-flex align-items-center text-muted mb-2">
              <Icon icon="cake" />
              <span className="ml-2">
                {i18n.t("cake_day_title")}{" "}
                {moment.utc(pv.person.published).local().format("MMM DD, YYYY")}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  userSettings() {
    return (
      <div>
        <div class="card border-secondary mb-3">
          <div class="card-body">
            {this.saveUserSettingsHtmlForm()}
            <br />
            {this.changePasswordHtmlForm()}
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
                maxLength={20}
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

  moderates() {
    return (
      <div>
        {this.state.personRes.moderates.length > 0 && (
          <div class="card border-secondary mb-3">
            <div class="card-body">
              <h5>{i18n.t("moderates")}</h5>
              <ul class="list-unstyled mb-0">
                {this.state.personRes.moderates.map(cmv => (
                  <li>
                    <CommunityLink community={cmv.community} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  follows() {
    return (
      <div>
        {this.state.personRes.follows.length > 0 && (
          <div class="card border-secondary mb-3">
            <div class="card-body">
              <h5>{i18n.t("subscribed")}</h5>
              <ul class="list-unstyled mb-0">
                {this.state.personRes.follows.map(cfv => (
                  <li>
                    <CommunityLink community={cfv.community} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  updateUrl(paramUpdates: UrlParams) {
    const page = paramUpdates.page || this.state.page;
    const viewStr = paramUpdates.view || PersonDetailsView[this.state.view];
    const sortStr = paramUpdates.sort || this.state.sort;

    let typeView = this.state.userName
      ? `/u/${this.state.userName}`
      : `/user/${this.state.personId}`;

    this.props.history.push(
      `${typeView}/view/${viewStr}/sort/${sortStr}/page/${page}`
    );
    this.state.loading = true;
    this.setState(this.state);
    this.fetchUserData();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
  }

  handleViewChange(i: Person, event: any) {
    i.updateUrl({
      view: PersonDetailsView[Number(event.target.value)],
      page: 1,
    });
  }

  handleUserSettingsShowNsfwChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowAvatarsChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.show_avatars = event.target.checked;
    UserService.Instance.localUserView.local_user.show_avatars =
      event.target.checked; // Just for instant updates
    i.setState(i.state);
  }

  handleUserSettingsBotAccount(i: Person, event: any) {
    i.state.saveUserSettingsForm.bot_account = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowBotAccounts(i: Person, event: any) {
    i.state.saveUserSettingsForm.show_bot_accounts = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowReadPosts(i: Person, event: any) {
    i.state.saveUserSettingsForm.show_read_posts = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowScoresChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.show_scores = event.target.checked;
    UserService.Instance.localUserView.local_user.show_scores =
      event.target.checked; // Just for instant updates
    i.setState(i.state);
  }

  handleUserSettingsSendNotificationsToEmailChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.send_notifications_to_email =
      event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsThemeChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.theme = event.target.value;
    setTheme(event.target.value, true);
    i.setState(i.state);
  }

  handleUserSettingsLangChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.lang = event.target.value;
    i18n.changeLanguage(getLanguage(i.state.saveUserSettingsForm.lang));
    i.setState(i.state);
  }

  handleUserSettingsSortTypeChange(val: SortType) {
    this.state.saveUserSettingsForm.default_sort_type = Object.keys(
      SortType
    ).indexOf(val);
    this.setState(this.state);
  }

  handleUserSettingsListingTypeChange(val: ListingType) {
    this.state.saveUserSettingsForm.default_listing_type = Object.keys(
      ListingType
    ).indexOf(val);
    this.setState(this.state);
  }

  handleUserSettingsEmailChange(i: Person, event: any) {
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

  handleUserSettingsPreferredUsernameChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.display_name = event.target.value;
    i.setState(i.state);
  }

  handleUserSettingsMatrixUserIdChange(i: Person, event: any) {
    i.state.saveUserSettingsForm.matrix_user_id = event.target.value;
    if (
      i.state.saveUserSettingsForm.matrix_user_id == "" &&
      !UserService.Instance.localUserView.person.matrix_user_id
    ) {
      i.state.saveUserSettingsForm.matrix_user_id = undefined;
    }
    i.setState(i.state);
  }

  handleNewPasswordChange(i: Person, event: any) {
    i.state.changePasswordForm.new_password = event.target.value;
    if (i.state.changePasswordForm.new_password == "") {
      i.state.changePasswordForm.new_password = undefined;
    }
    i.setState(i.state);
  }

  handleNewPasswordVerifyChange(i: Person, event: any) {
    i.state.changePasswordForm.new_password_verify = event.target.value;
    if (i.state.changePasswordForm.new_password_verify == "") {
      i.state.changePasswordForm.new_password_verify = undefined;
    }
    i.setState(i.state);
  }

  handleOldPasswordChange(i: Person, event: any) {
    i.state.changePasswordForm.old_password = event.target.value;
    if (i.state.changePasswordForm.old_password == "") {
      i.state.changePasswordForm.old_password = undefined;
    }
    i.setState(i.state);
  }

  handleSaveUserSettingsSubmit(i: Person, event: any) {
    event.preventDefault();
    i.state.saveUserSettingsLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.saveUserSettings(i.state.saveUserSettingsForm)
    );
  }

  handleChangePasswordSubmit(i: Person, event: any) {
    event.preventDefault();
    i.state.changePasswordLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.changePassword(i.state.changePasswordForm)
    );
  }

  handleDeleteAccountShowConfirmToggle(i: Person, event: any) {
    event.preventDefault();
    i.state.deleteAccountShowConfirm = !i.state.deleteAccountShowConfirm;
    i.setState(i.state);
  }

  handleDeleteAccountPasswordChange(i: Person, event: any) {
    i.state.deleteAccountForm.password = event.target.value;
    i.setState(i.state);
  }

  handleLogoutClick(i: Person) {
    UserService.Instance.logout();
    i.context.router.history.push("/");
  }

  handleDeleteAccount(i: Person, event: any) {
    event.preventDefault();
    i.state.deleteAccountLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.deleteAccount(i.state.deleteAccountForm)
    );
  }

  setUserInfo() {
    if (this.isCurrentUser) {
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
      this.state.saveUserSettingsForm.email =
        UserService.Instance.localUserView.local_user.email;
      this.state.saveUserSettingsForm.bio =
        UserService.Instance.localUserView.person.bio;
      this.state.saveUserSettingsForm.send_notifications_to_email =
        UserService.Instance.localUserView.local_user.send_notifications_to_email;
      this.state.saveUserSettingsForm.matrix_user_id =
        UserService.Instance.localUserView.person.matrix_user_id;
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      if (msg.error == "couldnt_find_that_username_or_email") {
        this.context.router.history.push("/");
      }
      this.setState({
        deleteAccountLoading: false,
        saveUserSettingsLoading: false,
        changePasswordLoading: false,
      });
      return;
    } else if (msg.reconnect) {
      this.fetchUserData();
    } else if (op == UserOperation.GetPersonDetails) {
      // Since the PersonDetails contains posts/comments as well as some general user info we listen here as well
      // and set the parent state if it is not set or differs
      // TODO this might need to get abstracted
      let data = wsJsonToRes<GetPersonDetailsResponse>(msg).data;
      this.state.personRes = data;
      console.log(data);
      this.setUserInfo();
      this.state.loading = false;
      this.setState(this.state);
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.SaveUserSettings) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      UserService.Instance.login(data);
      this.state.personRes.person_view.person.bio = this.state.saveUserSettingsForm.bio;
      this.state.personRes.person_view.person.display_name = this.state.saveUserSettingsForm.display_name;
      this.state.personRes.person_view.person.banner = this.state.saveUserSettingsForm.banner;
      this.state.personRes.person_view.person.avatar = this.state.saveUserSettingsForm.avatar;
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
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg).data;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(data.comment_view, this.state.personRes.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(data.comment_view, this.state.personRes.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      if (
        UserService.Instance.localUserView &&
        data.comment_view.creator.id ==
          UserService.Instance.localUserView.person.id
      ) {
        toast(i18n.t("reply_sent"));
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(data.comment_view, this.state.personRes.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.StickyPost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      editPostFindRes(data.post_view, this.state.personRes.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.personRes.posts);
      this.setState(this.state);
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg).data;
      this.state.personRes.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      this.state.personRes.posts
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      this.setState(this.state);
    }
  }
}
