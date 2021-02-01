import { Component, linkEvent } from 'inferno';
import { Link } from 'inferno-router';
import { Subscription } from 'rxjs';
import {
  UserOperation,
  SortType,
  ListingType,
  SaveUserSettings,
  LoginResponse,
  DeleteAccount,
  GetSiteResponse,
  GetUserDetailsResponse,
  AddAdminResponse,
  GetUserDetails,
  CommentResponse,
  PostResponse,
  BanUserResponse,
} from 'lemmy-js-client';
import { InitialFetchRequest, UserDetailsView } from '../interfaces';
import { WebSocketService, UserService } from '../services';
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
} from '../utils';
import { UserListing } from './user-listing';
import { HtmlTags } from './html-tags';
import { SortSelect } from './sort-select';
import { ListingTypeSelect } from './listing-type-select';
import { MomentTime } from './moment-time';
import { i18n } from '../i18next';
import moment from 'moment';
import { UserDetails } from './user-details';
import { MarkdownTextArea } from './markdown-textarea';
import { ImageUploadForm } from './image-upload-form';
import { BannerIconHeader } from './banner-icon-header';
import { CommunityLink } from './community-link';

interface UserState {
  userRes: GetUserDetailsResponse;
  userId: number;
  userName: string;
  view: UserDetailsView;
  sort: SortType;
  page: number;
  loading: boolean;
  userSettingsForm: SaveUserSettings;
  userSettingsLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  deleteAccountForm: DeleteAccount;
  siteRes: GetSiteResponse;
}

interface UserProps {
  view: UserDetailsView;
  sort: SortType;
  page: number;
  user_id: number | null;
  username: string;
}

interface UrlParams {
  view?: string;
  sort?: SortType;
  page?: number;
}

export class User extends Component<any, UserState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: UserState = {
    userRes: undefined,
    userId: getIdFromProps(this.props),
    userName: getUsernameFromProps(this.props),
    loading: true,
    view: User.getViewFromProps(this.props.match.view),
    sort: User.getSortTypeFromProps(this.props.match.sort),
    page: User.getPageFromProps(this.props.match.page),
    userSettingsForm: {
      show_nsfw: null,
      theme: null,
      default_sort_type: null,
      default_listing_type: null,
      lang: null,
      show_avatars: null,
      send_notifications_to_email: null,
      bio: null,
      preferred_username: null,
      auth: authField(false),
    },
    userSettingsLoading: null,
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
      this.state.userRes = this.isoData.routeData[0];
      this.setUserInfo();
      this.state.loading = false;
    } else {
      this.fetchUserData();
    }

    setupTippy();
  }

  fetchUserData() {
    let form: GetUserDetails = {
      user_id: this.state.userId,
      username: this.state.userName,
      sort: this.state.sort,
      saved_only: this.state.view === UserDetailsView.Saved,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(false),
    };
    WebSocketService.Instance.send(wsClient.getUserDetails(form));
  }

  get isCurrentUser() {
    return (
      UserService.Instance.user &&
      UserService.Instance.user.id == this.state.userRes.user_view.user.id
    );
  }

  static getViewFromProps(view: string): UserDetailsView {
    return view ? UserDetailsView[view] : UserDetailsView.Overview;
  }

  static getSortTypeFromProps(sort: string): SortType {
    return sort ? routeSortTypeToEnum(sort) : SortType.New;
  }

  static getPageFromProps(page: number): number {
    return page ? Number(page) : 1;
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split('/');
    let promises: Promise<any>[] = [];

    // It can be /u/me, or /username/1
    let idOrName = pathSplit[2];
    let user_id: number;
    let username: string;
    if (isNaN(Number(idOrName))) {
      username = idOrName;
    } else {
      user_id = Number(idOrName);
    }

    let view = this.getViewFromProps(pathSplit[4]);
    let sort = this.getSortTypeFromProps(pathSplit[6]);
    let page = this.getPageFromProps(Number(pathSplit[8]));

    let form: GetUserDetails = {
      sort,
      saved_only: view === UserDetailsView.Saved,
      page,
      limit: fetchLimit,
    };
    setOptionalAuth(form, req.auth);
    this.setIdOrName(form, user_id, username);
    promises.push(req.client.getUserDetails(form));
    return promises;
  }

  static setIdOrName(obj: any, id: number, name_: string) {
    if (id) {
      obj.user_id = id;
    } else {
      obj.username = name_;
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  static getDerivedStateFromProps(props: any): UserProps {
    return {
      view: this.getViewFromProps(props.match.params.view),
      sort: this.getSortTypeFromProps(props.match.params.sort),
      page: this.getPageFromProps(props.match.params.page),
      user_id: Number(props.match.params.id) || null,
      username: props.match.params.username,
    };
  }

  componentDidUpdate(lastProps: any, _lastState: UserState, _snapshot: any) {
    // Necessary if you are on a post and you click another post (same route)
    if (
      lastProps.location.pathname.split('/')[2] !==
      lastProps.history.location.pathname.split('/')[2]
    ) {
      // Couldnt get a refresh working. This does for now.
      location.reload();
    }
  }

  get documentTitle(): string {
    return `@${this.state.userRes.user_view.user.name} - ${this.state.siteRes.site_view.site.name}`;
  }

  get bioTag(): string {
    return this.state.userRes.user_view.user.bio
      ? previewLines(this.state.userRes.user_view.user.bio)
      : undefined;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <svg class="icon icon-spinner spin">
              <use xlinkHref="#icon-spinner"></use>
            </svg>
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-md-8">
              <>
                <HtmlTags
                  title={this.documentTitle}
                  path={this.context.router.route.match.url}
                  description={this.bioTag}
                  image={this.state.userRes.user_view.user.avatar}
                />
                {this.userInfo()}
                <hr />
              </>
              {!this.state.loading && this.selects()}
              <UserDetails
                userRes={this.state.userRes}
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
            ${this.state.view == UserDetailsView.Overview && 'active'}
          `}
        >
          <input
            type="radio"
            value={UserDetailsView.Overview}
            checked={this.state.view === UserDetailsView.Overview}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t('overview')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == UserDetailsView.Comments && 'active'}
          `}
        >
          <input
            type="radio"
            value={UserDetailsView.Comments}
            checked={this.state.view == UserDetailsView.Comments}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t('comments')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == UserDetailsView.Posts && 'active'}
          `}
        >
          <input
            type="radio"
            value={UserDetailsView.Posts}
            checked={this.state.view == UserDetailsView.Posts}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t('posts')}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == UserDetailsView.Saved && 'active'}
          `}
        >
          <input
            type="radio"
            value={UserDetailsView.Saved}
            checked={this.state.view == UserDetailsView.Saved}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t('saved')}
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
        />
        <a
          href={`/feeds/u/${this.state.userName}.xml?sort=${this.state.sort}`}
          target="_blank"
          rel="noopener"
          title="RSS"
        >
          <svg class="icon mx-2 text-muted small">
            <use xlinkHref="#icon-rss">#</use>
          </svg>
        </a>
      </div>
    );
  }

  userInfo() {
    let uv = this.state.userRes?.user_view;

    return (
      <div>
        <BannerIconHeader banner={uv.user.banner} icon={uv.user.avatar} />
        <div class="mb-3">
          <div class="">
            <div class="mb-0 d-flex flex-wrap">
              <div>
                {uv.user.preferred_username && (
                  <h5 class="mb-0">{uv.user.preferred_username}</h5>
                )}
                <ul class="list-inline mb-2">
                  <li className="list-inline-item">
                    <UserListing
                      user={uv.user}
                      realLink
                      useApubName
                      muted
                      hideAvatar
                    />
                  </li>
                  {uv.user.banned && (
                    <li className="list-inline-item badge badge-danger">
                      {i18n.t('banned')}
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
                  {i18n.t('logout')}
                </button>
              ) : (
                <>
                  <a
                    className={`d-flex align-self-start btn btn-secondary mr-2 ${
                      !uv.user.matrix_user_id && 'invisible'
                    }`}
                    target="_blank"
                    rel="noopener"
                    href={`https://matrix.to/#/${uv.user.matrix_user_id}`}
                  >
                    {i18n.t('send_secure_message')}
                  </a>
                  <Link
                    className={'d-flex align-self-start btn btn-secondary'}
                    to={`/create_private_message/recipient/${uv.user.id}`}
                  >
                    {i18n.t('send_message')}
                  </Link>
                </>
              )}
            </div>
            {uv.user.bio && (
              <div className="d-flex align-items-center mb-2">
                <div
                  className="md-div"
                  dangerouslySetInnerHTML={mdToHtml(uv.user.bio)}
                />
              </div>
            )}
            <div>
              <ul class="list-inline mb-2">
                <li className="list-inline-item badge badge-light">
                  {i18n.t('number_of_posts', { count: uv.counts.post_count })}
                </li>
                <li className="list-inline-item badge badge-light">
                  {i18n.t('number_of_comments', {
                    count: uv.counts.comment_count,
                  })}
                </li>
              </ul>
            </div>
            <div class="text-muted">
              {i18n.t('joined')} <MomentTime data={uv.user} showAgo />
            </div>
            <div className="d-flex align-items-center text-muted mb-2">
              <svg class="icon">
                <use xlinkHref="#icon-cake"></use>
              </svg>
              <span className="ml-2">
                {i18n.t('cake_day_title')}{' '}
                {moment.utc(uv.user.published).local().format('MMM DD, YYYY')}
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
            <h5>{i18n.t('settings')}</h5>
            <form onSubmit={linkEvent(this, this.handleUserSettingsSubmit)}>
              <div class="form-group">
                <label>{i18n.t('avatar')}</label>
                <ImageUploadForm
                  uploadTitle={i18n.t('upload_avatar')}
                  imageSrc={this.state.userSettingsForm.avatar}
                  onUpload={this.handleAvatarUpload}
                  onRemove={this.handleAvatarRemove}
                  rounded
                />
              </div>
              <div class="form-group">
                <label>{i18n.t('banner')}</label>
                <ImageUploadForm
                  uploadTitle={i18n.t('upload_banner')}
                  imageSrc={this.state.userSettingsForm.banner}
                  onUpload={this.handleBannerUpload}
                  onRemove={this.handleBannerRemove}
                />
              </div>
              <div class="form-group">
                <label>{i18n.t('language')}</label>
                <select
                  value={this.state.userSettingsForm.lang}
                  onChange={linkEvent(this, this.handleUserSettingsLangChange)}
                  class="ml-2 custom-select w-auto"
                >
                  <option disabled>{i18n.t('language')}</option>
                  <option value="browser">{i18n.t('browser_default')}</option>
                  <option disabled>──</option>
                  {languages.map(lang => (
                    <option value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div class="form-group">
                <label>{i18n.t('theme')}</label>
                <select
                  value={this.state.userSettingsForm.theme}
                  onChange={linkEvent(this, this.handleUserSettingsThemeChange)}
                  class="ml-2 custom-select w-auto"
                >
                  <option disabled>{i18n.t('theme')}</option>
                  <option value="browser">{i18n.t('browser_default')}</option>
                  {themes.map(theme => (
                    <option value={theme}>{theme}</option>
                  ))}
                </select>
              </div>
              <form className="form-group">
                <label>
                  <div class="mr-2">{i18n.t('sort_type')}</div>
                </label>
                <ListingTypeSelect
                  type_={
                    Object.values(ListingType)[
                      this.state.userSettingsForm.default_listing_type
                    ]
                  }
                  showLocal={
                    this.state.siteRes.federated_instances?.linked.length > 0
                  }
                  onChange={this.handleUserSettingsListingTypeChange}
                />
              </form>
              <form className="form-group">
                <label>
                  <div class="mr-2">{i18n.t('type')}</div>
                </label>
                <SortSelect
                  sort={
                    Object.values(SortType)[
                      this.state.userSettingsForm.default_sort_type
                    ]
                  }
                  onChange={this.handleUserSettingsSortTypeChange}
                />
              </form>
              <div class="form-group row">
                <label class="col-lg-5 col-form-label">
                  {i18n.t('display_name')}
                </label>
                <div class="col-lg-7">
                  <input
                    type="text"
                    class="form-control"
                    placeholder={i18n.t('optional')}
                    value={this.state.userSettingsForm.preferred_username}
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
                  {i18n.t('bio')}
                </label>
                <div class="col-lg-9">
                  <MarkdownTextArea
                    initialContent={this.state.userSettingsForm.bio}
                    onContentChange={this.handleUserSettingsBioChange}
                    maxLength={300}
                    hideNavigationWarnings
                  />
                </div>
              </div>
              <div class="form-group row">
                <label class="col-lg-3 col-form-label" htmlFor="user-email">
                  {i18n.t('email')}
                </label>
                <div class="col-lg-9">
                  <input
                    type="email"
                    id="user-email"
                    class="form-control"
                    placeholder={i18n.t('optional')}
                    value={this.state.userSettingsForm.email}
                    onInput={linkEvent(
                      this,
                      this.handleUserSettingsEmailChange
                    )}
                    minLength={3}
                  />
                </div>
              </div>
              <div class="form-group row">
                <label class="col-lg-5 col-form-label">
                  <a href={elementUrl} target="_blank" rel="noopener">
                    {i18n.t('matrix_user_id')}
                  </a>
                </label>
                <div class="col-lg-7">
                  <input
                    type="text"
                    class="form-control"
                    placeholder="@user:example.com"
                    value={this.state.userSettingsForm.matrix_user_id}
                    onInput={linkEvent(
                      this,
                      this.handleUserSettingsMatrixUserIdChange
                    )}
                    minLength={3}
                  />
                </div>
              </div>
              <div class="form-group row">
                <label class="col-lg-5 col-form-label" htmlFor="user-password">
                  {i18n.t('new_password')}
                </label>
                <div class="col-lg-7">
                  <input
                    type="password"
                    id="user-password"
                    class="form-control"
                    value={this.state.userSettingsForm.new_password}
                    autoComplete="new-password"
                    onInput={linkEvent(
                      this,
                      this.handleUserSettingsNewPasswordChange
                    )}
                  />
                </div>
              </div>
              <div class="form-group row">
                <label
                  class="col-lg-5 col-form-label"
                  htmlFor="user-verify-password"
                >
                  {i18n.t('verify_password')}
                </label>
                <div class="col-lg-7">
                  <input
                    type="password"
                    id="user-verify-password"
                    class="form-control"
                    value={this.state.userSettingsForm.new_password_verify}
                    autoComplete="new-password"
                    onInput={linkEvent(
                      this,
                      this.handleUserSettingsNewPasswordVerifyChange
                    )}
                  />
                </div>
              </div>
              <div class="form-group row">
                <label
                  class="col-lg-5 col-form-label"
                  htmlFor="user-old-password"
                >
                  {i18n.t('old_password')}
                </label>
                <div class="col-lg-7">
                  <input
                    type="password"
                    id="user-old-password"
                    class="form-control"
                    value={this.state.userSettingsForm.old_password}
                    autoComplete="new-password"
                    onInput={linkEvent(
                      this,
                      this.handleUserSettingsOldPasswordChange
                    )}
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
                      checked={this.state.userSettingsForm.show_nsfw}
                      onChange={linkEvent(
                        this,
                        this.handleUserSettingsShowNsfwChange
                      )}
                    />
                    <label class="form-check-label" htmlFor="user-show-nsfw">
                      {i18n.t('show_nsfw')}
                    </label>
                  </div>
                </div>
              )}
              <div class="form-group">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="user-show-avatars"
                    type="checkbox"
                    checked={this.state.userSettingsForm.show_avatars}
                    onChange={linkEvent(
                      this,
                      this.handleUserSettingsShowAvatarsChange
                    )}
                  />
                  <label class="form-check-label" htmlFor="user-show-avatars">
                    {i18n.t('show_avatars')}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="user-send-notifications-to-email"
                    type="checkbox"
                    disabled={!this.state.userSettingsForm.email}
                    checked={
                      this.state.userSettingsForm.send_notifications_to_email
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
                    {i18n.t('send_notifications_to_email')}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-block btn-secondary mr-4">
                  {this.state.userSettingsLoading ? (
                    <svg class="icon icon-spinner spin">
                      <use xlinkHref="#icon-spinner"></use>
                    </svg>
                  ) : (
                    capitalizeFirstLetter(i18n.t('save'))
                  )}
                </button>
              </div>
              <hr />
              <div class="form-group mb-0">
                <button
                  class="btn btn-block btn-danger"
                  onClick={linkEvent(
                    this,
                    this.handleDeleteAccountShowConfirmToggle
                  )}
                >
                  {i18n.t('delete_account')}
                </button>
                {this.state.deleteAccountShowConfirm && (
                  <>
                    <div class="my-2 alert alert-danger" role="alert">
                      {i18n.t('delete_account_confirm')}
                    </div>
                    <input
                      type="password"
                      value={this.state.deleteAccountForm.password}
                      autoComplete="new-password"
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
                        <svg class="icon icon-spinner spin">
                          <use xlinkHref="#icon-spinner"></use>
                        </svg>
                      ) : (
                        capitalizeFirstLetter(i18n.t('delete'))
                      )}
                    </button>
                    <button
                      class="btn btn-secondary"
                      onClick={linkEvent(
                        this,
                        this.handleDeleteAccountShowConfirmToggle
                      )}
                    >
                      {i18n.t('cancel')}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  moderates() {
    return (
      <div>
        {this.state.userRes.moderates.length > 0 && (
          <div class="card border-secondary mb-3">
            <div class="card-body">
              <h5>{i18n.t('moderates')}</h5>
              <ul class="list-unstyled mb-0">
                {this.state.userRes.moderates.map(cmv => (
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
        {this.state.userRes.follows.length > 0 && (
          <div class="card border-secondary mb-3">
            <div class="card-body">
              <h5>{i18n.t('subscribed')}</h5>
              <ul class="list-unstyled mb-0">
                {this.state.userRes.follows.map(cfv => (
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
    const viewStr = paramUpdates.view || UserDetailsView[this.state.view];
    const sortStr = paramUpdates.sort || this.state.sort;

    let typeView = this.state.userName
      ? `/u/${this.state.userName}`
      : `/user/${this.state.userId}`;

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

  handleViewChange(i: User, event: any) {
    i.updateUrl({
      view: UserDetailsView[Number(event.target.value)],
      page: 1,
    });
  }

  handleUserSettingsShowNsfwChange(i: User, event: any) {
    i.state.userSettingsForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsShowAvatarsChange(i: User, event: any) {
    i.state.userSettingsForm.show_avatars = event.target.checked;
    UserService.Instance.user.show_avatars = event.target.checked; // Just for instant updates
    i.setState(i.state);
  }

  handleUserSettingsSendNotificationsToEmailChange(i: User, event: any) {
    i.state.userSettingsForm.send_notifications_to_email = event.target.checked;
    i.setState(i.state);
  }

  handleUserSettingsThemeChange(i: User, event: any) {
    i.state.userSettingsForm.theme = event.target.value;
    setTheme(event.target.value, true);
    i.setState(i.state);
  }

  handleUserSettingsLangChange(i: User, event: any) {
    i.state.userSettingsForm.lang = event.target.value;
    i18n.changeLanguage(getLanguage(i.state.userSettingsForm.lang));
    i.setState(i.state);
  }

  handleUserSettingsSortTypeChange(val: SortType) {
    this.state.userSettingsForm.default_sort_type = Object.keys(
      SortType
    ).indexOf(val);
    this.setState(this.state);
  }

  handleUserSettingsListingTypeChange(val: ListingType) {
    this.state.userSettingsForm.default_listing_type = Object.keys(
      ListingType
    ).indexOf(val);
    this.setState(this.state);
  }

  handleUserSettingsEmailChange(i: User, event: any) {
    i.state.userSettingsForm.email = event.target.value;
    i.setState(i.state);
  }

  handleUserSettingsBioChange(val: string) {
    this.state.userSettingsForm.bio = val;
    this.setState(this.state);
  }

  handleAvatarUpload(url: string) {
    this.state.userSettingsForm.avatar = url;
    this.setState(this.state);
  }

  handleAvatarRemove() {
    this.state.userSettingsForm.avatar = '';
    this.setState(this.state);
  }

  handleBannerUpload(url: string) {
    this.state.userSettingsForm.banner = url;
    this.setState(this.state);
  }

  handleBannerRemove() {
    this.state.userSettingsForm.banner = '';
    this.setState(this.state);
  }

  handleUserSettingsPreferredUsernameChange(i: User, event: any) {
    i.state.userSettingsForm.preferred_username = event.target.value;
    i.setState(i.state);
  }

  handleUserSettingsMatrixUserIdChange(i: User, event: any) {
    i.state.userSettingsForm.matrix_user_id = event.target.value;
    if (
      i.state.userSettingsForm.matrix_user_id == '' &&
      !i.state.userRes.user_view.user.matrix_user_id
    ) {
      i.state.userSettingsForm.matrix_user_id = undefined;
    }
    i.setState(i.state);
  }

  handleUserSettingsNewPasswordChange(i: User, event: any) {
    i.state.userSettingsForm.new_password = event.target.value;
    if (i.state.userSettingsForm.new_password == '') {
      i.state.userSettingsForm.new_password = undefined;
    }
    i.setState(i.state);
  }

  handleUserSettingsNewPasswordVerifyChange(i: User, event: any) {
    i.state.userSettingsForm.new_password_verify = event.target.value;
    if (i.state.userSettingsForm.new_password_verify == '') {
      i.state.userSettingsForm.new_password_verify = undefined;
    }
    i.setState(i.state);
  }

  handleUserSettingsOldPasswordChange(i: User, event: any) {
    i.state.userSettingsForm.old_password = event.target.value;
    if (i.state.userSettingsForm.old_password == '') {
      i.state.userSettingsForm.old_password = undefined;
    }
    i.setState(i.state);
  }

  handleUserSettingsSubmit(i: User, event: any) {
    event.preventDefault();
    i.state.userSettingsLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.saveUserSettings(i.state.userSettingsForm)
    );
  }

  handleDeleteAccountShowConfirmToggle(i: User, event: any) {
    event.preventDefault();
    i.state.deleteAccountShowConfirm = !i.state.deleteAccountShowConfirm;
    i.setState(i.state);
  }

  handleDeleteAccountPasswordChange(i: User, event: any) {
    i.state.deleteAccountForm.password = event.target.value;
    i.setState(i.state);
  }

  handleLogoutClick(i: User) {
    UserService.Instance.logout();
    i.context.router.history.push('/');
  }

  handleDeleteAccount(i: User, event: any) {
    event.preventDefault();
    i.state.deleteAccountLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.deleteAccount(i.state.deleteAccountForm)
    );
    i.handleLogoutClick(i);
  }

  setUserInfo() {
    if (this.isCurrentUser) {
      this.state.userSettingsForm.show_nsfw =
        UserService.Instance.user.show_nsfw;
      this.state.userSettingsForm.theme = UserService.Instance.user.theme
        ? UserService.Instance.user.theme
        : 'browser';
      this.state.userSettingsForm.default_sort_type =
        UserService.Instance.user.default_sort_type;
      this.state.userSettingsForm.default_listing_type =
        UserService.Instance.user.default_listing_type;
      this.state.userSettingsForm.lang = UserService.Instance.user.lang;
      this.state.userSettingsForm.avatar = UserService.Instance.user.avatar;
      this.state.userSettingsForm.banner = UserService.Instance.user.banner;
      this.state.userSettingsForm.preferred_username =
        UserService.Instance.user.preferred_username;
      this.state.userSettingsForm.show_avatars =
        UserService.Instance.user.show_avatars;
      this.state.userSettingsForm.email = UserService.Instance.user.email;
      this.state.userSettingsForm.bio = UserService.Instance.user.bio;
      this.state.userSettingsForm.send_notifications_to_email =
        UserService.Instance.user.send_notifications_to_email;
      this.state.userSettingsForm.matrix_user_id =
        UserService.Instance.user.matrix_user_id;
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), 'danger');
      if (msg.error == 'couldnt_find_that_username_or_email') {
        this.context.router.history.push('/');
      }
      this.setState({
        deleteAccountLoading: false,
        userSettingsLoading: false,
      });
      return;
    } else if (msg.reconnect) {
      this.fetchUserData();
    } else if (op == UserOperation.GetUserDetails) {
      // Since the UserDetails contains posts/comments as well as some general user info we listen here as well
      // and set the parent state if it is not set or differs
      // TODO this might need to get abstracted
      let data = wsJsonToRes<GetUserDetailsResponse>(msg).data;
      this.state.userRes = data;
      this.setUserInfo();
      this.state.loading = false;
      this.setState(this.state);
    } else if (op == UserOperation.SaveUserSettings) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      UserService.Instance.login(data);
      this.state.userRes.user_view.user.bio = this.state.userSettingsForm.bio;
      this.state.userRes.user_view.user.preferred_username = this.state.userSettingsForm.preferred_username;
      this.state.userRes.user_view.user.banner = this.state.userSettingsForm.banner;
      this.state.userRes.user_view.user.avatar = this.state.userSettingsForm.avatar;
      this.state.userSettingsLoading = false;
      this.setState(this.state);

      window.scrollTo(0, 0);
    } else if (op == UserOperation.DeleteAccount) {
      this.setState({
        deleteAccountLoading: false,
        deleteAccountShowConfirm: false,
      });
      this.context.router.history.push('/');
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg).data;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(data.comment_view, this.state.userRes.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(data.comment_view, this.state.userRes.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      if (
        UserService.Instance.user &&
        data.comment_view.creator.id == UserService.Instance.user.id
      ) {
        toast(i18n.t('reply_sent'));
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(data.comment_view, this.state.userRes.comments);
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
      editPostFindRes(data.post_view, this.state.userRes.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.userRes.posts);
      this.setState(this.state);
    } else if (op == UserOperation.BanUser) {
      let data = wsJsonToRes<BanUserResponse>(msg).data;
      this.state.userRes.comments
        .filter(c => c.creator.id == data.user_view.user.id)
        .forEach(c => (c.creator.banned = data.banned));
      this.state.userRes.posts
        .filter(c => c.creator.id == data.user_view.user.id)
        .forEach(c => (c.creator.banned = data.banned));
      this.setState(this.state);
    }
  }
}
