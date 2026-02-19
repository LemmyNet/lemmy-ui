import {
  communityToChoice,
  enableDownvotes,
  fetchCommunities,
  fetchThemeList,
  fetchUsers,
  instanceToChoice,
  myAuth,
  personToChoice,
  setIsoData,
  showLocal,
  updateCommunityBlock,
  updateInstanceCommunitiesBlock,
  updateInstancePersonsBlock,
  updateMyUserInfo,
  updatePersonBlock,
  userNotLoggedInOrBanned,
} from "@utils/app";
import { capitalizeFirstLetter, debounce } from "@utils/helpers";
import { Choice, RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, createRef, FormEvent } from "inferno";
import {
  CommunityResponse,
  PersonResponse,
  CommentSortType,
  Community,
  GenerateTotpSecretResponse,
  PagedResponse,
  FederatedInstanceView,
  GetSiteResponse,
  Instance,
  LemmyHttp,
  ListingType,
  LoginResponse,
  Person,
  PostListingMode,
  PostSortType,
  SaveUserSettings,
  SuccessResponse,
  EditTotpResponse,
  VoteShow,
  InstanceId,
  PersonId,
  CommunityId,
  MyUserInfo,
} from "lemmy-js-client";
import { matrixUrl, emDash, fetchLimit, relTags } from "@utils/config";
import { FirstLoadService, UserService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { I18NextService } from "../../services/I18NextService";
import { tippyMixin } from "../mixins/tippy-mixin";
import { toast } from "@utils/app";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import PasswordInput from "../common/password-input";
import { SearchableSelect } from "../common/searchable-select";
import { PostSortDropdown, CommentSortDropdown } from "../common/sort-dropdown";
import Tabs from "../common/tabs";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "./person-listing";
import { InitialFetchRequest } from "@utils/types";
import TotpModal from "../common/modal/totp-modal";
import { LoadingEllipses } from "../common/loading-ellipses";
import {
  isBrowser,
  refreshTheme,
  setThemeOverride,
  snapToTop,
} from "../../utils/browser";
import { getHttpBaseInternal } from "../../utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { TimeIntervalFilter } from "@components/common/time-interval-filter";
import BlockingKeywordsTextArea from "@components/common/blocking-keywords-textarea";
import { NoOptionI18nKeys } from "i18next";
import { PostListingModeDropdown } from "@components/common/post-listing-mode-dropdown";
import { ListingTypeDropdown } from "@components/common/listing-type-dropdown";
import { VoteShowDropdown } from "@components/common/vote-show-dropdown";
import { InterfaceLanguageDropdown } from "@components/common/interface-language-dropdown";
import { ThemeDropdown } from "@components/common/theme-dropdown";
import { FilterChipCheckbox } from "@components/common/filter-chip-checkbox";
import { RouterContext } from "inferno-router/dist/Router";

type SettingsData = RouteDataResponse<{
  instancesRes: PagedResponse<FederatedInstanceView>;
}>;

interface SettingsState {
  saveRes: RequestState<SuccessResponse>;
  changePasswordRes: RequestState<LoginResponse>;
  deleteAccountRes: RequestState<SuccessResponse>;
  instancesRes: RequestState<PagedResponse<FederatedInstanceView>>;
  generateTotpRes: RequestState<GenerateTotpSecretResponse>;
  editTotpRes: RequestState<EditTotpResponse>;
  // TODO redo these forms
  saveUserSettingsForm: SaveUserSettings;
  changePasswordForm: {
    new_password?: string;
    new_password_verify?: string;
    old_password?: string;
  };
  deleteAccountForm: {
    delete_content?: boolean;
    password?: string;
  };
  personBlocks: Person[];
  communityBlocks: Community[];
  instanceCommunitiesBlocks: Instance[];
  instancePersonsBlocks: Instance[];
  currentTab: string;
  themeList: string[];
  deleteAccountShowConfirm: boolean;
  siteRes: GetSiteResponse;
  searchCommunityLoading: boolean;
  searchCommunityOptions: Choice[];
  searchPersonLoading: boolean;
  searchPersonOptions: Choice[];
  searchInstanceOptions: Choice[];
  isIsomorphic: boolean;
  show2faModal: boolean;
  importSettingsRes: RequestState<any>;
  exportSettingsRes: RequestState<any>;
  settingsFile?: File;
  avatar?: string;
  banner?: string;
}

type FilterType = "user" | "community" | "instance";

const Filter = ({
  filterType,
  options,
  onChange,
  onSearch,
  loading = false,
}: {
  filterType: FilterType;
  options: Choice[];
  onSearch: (text: string) => void;
  onChange: (choice: Choice) => void;
  loading?: boolean;
}) => (
  <div className="mb-3 row">
    <label
      className="col-md-4 col-form-label"
      htmlFor={`block-${filterType}-filter`}
    >
      {I18NextService.i18n.t(`block_${filterType}`)}
    </label>
    <div className="col-md-8">
      <SearchableSelect
        id={`block-${filterType}-filter`}
        options={[
          { label: emDash, value: "0", disabled: true } as Choice,
        ].concat(options)}
        loading={loading}
        onChange={onChange}
        onSearch={onSearch}
      />
    </div>
  </div>
);

type SettingsRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type SettingsFetchConfig = IRoutePropsWithFetch<
  SettingsData,
  Record<string, never>,
  Record<string, never>
>;

@simpleScrollMixin
@tippyMixin
export class Settings extends Component<SettingsRouteProps, SettingsState> {
  private isoData = setIsoData<SettingsData>(this.context);
  exportSettingsLink = createRef<HTMLAnchorElement>();

  state: SettingsState = {
    saveRes: EMPTY_REQUEST,
    deleteAccountRes: EMPTY_REQUEST,
    changePasswordRes: EMPTY_REQUEST,
    instancesRes: EMPTY_REQUEST,
    saveUserSettingsForm: {},
    changePasswordForm: {},
    deleteAccountShowConfirm: false,
    deleteAccountForm: {},
    personBlocks: [],
    communityBlocks: [],
    instanceCommunitiesBlocks: [],
    instancePersonsBlocks: [],
    currentTab: "settings",
    siteRes: this.isoData.siteRes,
    themeList: [],
    searchCommunityLoading: false,
    searchCommunityOptions: [],
    searchPersonLoading: false,
    searchPersonOptions: [],
    searchInstanceOptions: [],
    isIsomorphic: false,
    generateTotpRes: EMPTY_REQUEST,
    editTotpRes: EMPTY_REQUEST,
    show2faModal: false,
    importSettingsRes: EMPTY_REQUEST,
    exportSettingsRes: EMPTY_REQUEST,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.userSettings = this.userSettings.bind(this);
    this.blockCards = this.blockCards.bind(this);

    const mui = this.isoData.myUserInfo;
    if (mui) {
      const {
        local_user: {
          show_nsfw,
          blur_nsfw,
          theme,
          default_post_sort_type,
          default_comment_sort_type,
          default_post_time_range_seconds,
          default_listing_type,
          post_listing_mode,
          default_items_per_page,
          interface_language,
          show_avatars,
          show_bot_accounts,
          show_read_posts,
          send_notifications_to_email,
          email,
          open_links_in_new_tab,
          enable_private_messages,
          auto_mark_fetched_posts_as_read,
          show_score,
          show_upvotes,
          show_downvotes,
          show_upvote_percentage,
          show_person_votes,
          enable_animated_images,
          hide_media,
          collapse_bot_comments,
        },
        person: {
          avatar,
          banner,
          display_name,
          bot_account,
          bio,
          matrix_user_id,
        },
      } = mui.local_user_view;

      this.state = {
        ...this.state,
        personBlocks: mui.person_blocks,
        communityBlocks: mui.community_blocks,
        instanceCommunitiesBlocks: mui.instance_communities_blocks,
        instancePersonsBlocks: mui.instance_persons_blocks,
        saveUserSettingsForm: {
          ...this.state.saveUserSettingsForm,
          show_nsfw,
          blur_nsfw,
          theme: theme ?? "browser",
          default_post_sort_type,
          default_comment_sort_type,
          default_post_time_range_seconds,
          default_listing_type,
          post_listing_mode,
          default_items_per_page,
          interface_language,
          discussion_languages: mui.discussion_languages,
          display_name,
          show_avatars,
          bot_account,
          show_bot_accounts,
          show_score,
          show_upvotes,
          show_downvotes,
          show_upvote_percentage,
          show_person_votes,
          show_read_posts,
          email,
          bio,
          send_notifications_to_email,
          matrix_user_id,
          open_links_in_new_tab,
          enable_private_messages,
          auto_mark_fetched_posts_as_read,
          blocking_keywords: mui.keyword_blocks,
          enable_animated_images,
          hide_media,
          collapse_bot_comments,
        },
        avatar,
        banner,
      };
    }

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { instancesRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        instancesRes,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (isBrowser()) {
      this.setState({ themeList: await fetchThemeList() });

      if (!this.state.isIsomorphic) {
        this.setState({
          instancesRes: LOADING_REQUEST,
        });

        this.setState({
          instancesRes: await HttpService.client.getFederatedInstances({
            kind: "linked",
          }),
        });
      }
    }
  }

  componentWillUnmount() {
    // In case `interface_language` change wasn't saved.
    I18NextService.reconfigure(
      window.navigator.languages,
      this.isoData.myUserInfo?.local_user_view.local_user.interface_language,
    );
    setThemeOverride(undefined);
  }

  static fetchInitialData = async ({
    headers,
  }: InitialFetchRequest): Promise<SettingsData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      instancesRes: await client.getFederatedInstances({ kind: "linked" }),
    };
  };

  get documentTitle(): string {
    return I18NextService.i18n.t("settings");
  }

  render() {
    /* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */
    return (
      <div className="person-settings container-lg">
        <a
          ref={this.exportSettingsLink}
          download={`${I18NextService.i18n.t("export_file_name")}_${new Date()
            .toISOString()
            .replace(/:|-/g, "")}.json`}
          className="d-none"
          href="javascript:void(0)"
          aria-hidden="true"
        />
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={this.documentTitle}
          image={this.state.avatar}
        />
        <Tabs
          tabs={[
            {
              key: "settings",
              label: I18NextService.i18n.t("settings"),
              getNode: this.userSettings,
            },
            {
              key: "blocks",
              label: I18NextService.i18n.t("blocks"),
              getNode: this.blockCards,
            },
          ]}
        />
      </div>
    );
    /* eslint-enable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */
  }

  userSettings = (isSelected: boolean) => {
    return (
      <div
        className={classNames("tab-pane show", {
          active: isSelected,
        })}
        role="tabpanel"
        id="settings-tab-pane"
      >
        <div className="row">
          {!userNotLoggedInOrBanned(this.isoData.myUserInfo) && (
            <div className="col-12 col-md-6">
              <div className="card mb-3">
                <div className="card-body">
                  {this.saveUserSettingsHtmlForm()}
                </div>
              </div>
            </div>
          )}
          <div className="col-12 col-md-6">
            {!userNotLoggedInOrBanned(this.isoData.myUserInfo) && (
              <>
                <div className="card mb-3">
                  <div className="card-body">
                    {this.changePasswordHtmlForm()}
                  </div>
                </div>
                <div className="card mb-3">
                  <div className="card-body">{this.totpSection()}</div>
                </div>
              </>
            )}
            <div className="card mb-3">
              <div className="card-body">{this.importExportForm()}</div>
            </div>
            <div className="card mb-3">
              <div className="card-body">{this.deleteAccountForm()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  blockCards = (isSelected: boolean) => {
    return (
      !userNotLoggedInOrBanned(this.isoData.myUserInfo) && (
        <div
          className={classNames("tab-pane", {
            active: isSelected,
          })}
          role="tabpanel"
          id="blocks-tab-pane"
        >
          <div className="row">
            <div className="col-12 col-md-6">
              <div className="card mb-3">
                <div className="card-body">{this.blockUserCard()}</div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card mb-3">
                <div className="card-body">{this.blockCommunityCard()}</div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card mb-3">
                <div className="card-body">
                  {this.blockInstanceCommunitiesCard()}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card mb-3">
                <div className="card-body">
                  {this.blockInstancePersonsCard()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    );
  };

  changePasswordHtmlForm() {
    return (
      <>
        <h2 className="h5">{I18NextService.i18n.t("change_password")}</h2>
        <form onSubmit={e => handleChangePasswordSubmit(this, e)}>
          <div className="mb-3">
            <PasswordInput
              id="new-password"
              value={this.state.changePasswordForm.new_password}
              onInput={e => handleNewPasswordChange(this, e)}
              showStrength
              label={I18NextService.i18n.t("new_password")}
              isNew
            />
          </div>
          <div className="mb-3">
            <PasswordInput
              id="verify-new-password"
              value={this.state.changePasswordForm.new_password_verify}
              onInput={e => handleNewPasswordVerifyChange(this, e)}
              label={I18NextService.i18n.t("verify_password")}
              isNew
            />
          </div>
          <div className="mb-3">
            <PasswordInput
              id="user-old-password"
              value={this.state.changePasswordForm.old_password}
              onInput={e => handleOldPasswordChange(this, e)}
              label={I18NextService.i18n.t("old_password")}
              required={false}
            />
          </div>
          <div className="input-group mb-3">
            <button type="submit" className="btn btn-light border-light-subtle">
              {this.state.changePasswordRes.state === "loading" ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              )}
            </button>
          </div>
        </form>
      </>
    );
  }

  blockUserCard() {
    const { searchPersonLoading, searchPersonOptions } = this.state;

    return (
      <div>
        <Filter
          filterType="user"
          loading={searchPersonLoading}
          onChange={choice => handleBlockPerson(this, choice)}
          onSearch={text => handlePersonSearch(this, text)}
          options={searchPersonOptions}
        />
        {this.blockedUsersList()}
      </div>
    );
  }

  blockedUsersList() {
    return (
      <>
        <h2 className="h5">{I18NextService.i18n.t("blocked_users")}</h2>
        <ul className="list-unstyled mb-0">
          {this.state.personBlocks.map(p => (
            <li key={p.id}>
              <PersonListing
                person={p}
                myUserInfo={this.isoData.myUserInfo}
                banned={false}
              />
              <button
                className="btn btn-sm"
                onClick={() => handleUnblockPerson(this, p.id)}
                data-tippy-content={I18NextService.i18n.t("unblock_user")}
              >
                <Icon icon="x" classes="icon-inline" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockCommunityCard() {
    const { searchCommunityLoading, searchCommunityOptions } = this.state;

    return (
      <div>
        <Filter
          filterType="community"
          loading={searchCommunityLoading}
          onChange={choice => handleBlockCommunity(this, choice)}
          onSearch={text => handleCommunitySearch(this, text)}
          options={searchCommunityOptions}
        />
        {this.blockedCommunitiesList()}
      </div>
    );
  }

  blockedCommunitiesList() {
    return (
      <>
        <h2 className="h5">{I18NextService.i18n.t("blocked_communities")}</h2>
        <ul className="list-unstyled mb-0">
          {this.state.communityBlocks.map(c => (
            <li key={c.id}>
              <CommunityLink
                community={c}
                myUserInfo={this.isoData.myUserInfo}
              />
              <button
                className="btn btn-sm"
                onClick={() => handleUnblockCommunity(this, c.id)}
                data-tippy-content={I18NextService.i18n.t("unblock_community")}
              >
                <Icon icon="x" classes="icon-inline" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockInstanceCommunitiesCard() {
    const { searchInstanceOptions } = this.state;

    return (
      <div>
        <Filter
          filterType="instance"
          onChange={choice => handleBlockInstanceCommunities(this, choice)}
          onSearch={text => handleInstanceSearch(this, text)}
          options={searchInstanceOptions}
        />
        {this.blockedInstanceCommunitiesList()}
      </div>
    );
  }

  blockInstancePersonsCard() {
    const { searchInstanceOptions } = this.state;

    return (
      <div>
        <Filter
          filterType="instance"
          onChange={choice => handleBlockInstancePersons(this, choice)}
          onSearch={text => handleInstanceSearch(this, text)}
          options={searchInstanceOptions}
        />
        {this.blockedInstancePersonsList()}
      </div>
    );
  }

  blockedInstanceCommunitiesList() {
    return (
      <>
        <h2 className="h5">
          {I18NextService.i18n.t(
            "blocked_all_communities_from_these_instances",
          )}
        </h2>
        <ul className="list-unstyled mb-0">
          {this.state.instanceCommunitiesBlocks.map(i => (
            <li key={i.id}>
              {i.domain}
              <button
                className="btn btn-sm"
                onClick={() => handleUnblockInstanceCommunities(this, i.id)}
                data-tippy-content={I18NextService.i18n.t("unblock_instance")}
              >
                <Icon icon="x" classes="icon-inline" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockedInstancePersonsList() {
    return (
      <>
        <h2 className="h5">
          {I18NextService.i18n.t("blocked_all_users_from_these_instances")}
        </h2>
        <ul className="list-unstyled mb-0">
          {this.state.instancePersonsBlocks.map(i => (
            <li key={i.id}>
              {i.domain}
              <button
                className="btn btn-sm"
                onClick={() => handleUnblockInstancePersons(this, i.id)}
                data-tippy-content={I18NextService.i18n.t("unblock_instance")}
              >
                <Icon icon="x" classes="icon-inline" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  importExportForm() {
    return (
      <>
        <h2 className="h5">
          {I18NextService.i18n.t("import_export_section_title")}
        </h2>
        <p>{I18NextService.i18n.t("import_export_section_description")}</p>
        {!(
          this.state.importSettingsRes.state === "loading" ||
          this.state.exportSettingsRes.state === "loading"
        ) ? (
          <>
            <button
              className="btn btn-light border-light-subtle mb-4"
              onClick={() => handleExportSettings(this)}
              type="button"
            >
              {I18NextService.i18n.t("export")}
            </button>
            <fieldset className="border rounded p-3 bg-secondary bg-opacity-25">
              <input
                type="file"
                accept="application/json"
                className="form-control"
                aria-label="Import settings file input"
                onChange={e => handleImportFileChange(this, e)}
              />
              <button
                className="btn btn-light border-light-subtle mt-3"
                onClick={() => handleImportSettings(this)}
                type="button"
                disabled={!this.state.settingsFile}
              >
                {I18NextService.i18n.t("import")}
              </button>
            </fieldset>
          </>
        ) : (
          <div>
            <div className="text-center">
              {this.state.exportSettingsRes.state === "loading"
                ? I18NextService.i18n.t("exporting")
                : I18NextService.i18n.t("importing")}
              <LoadingEllipses />
            </div>
            <Spinner large />
          </div>
        )}
      </>
    );
  }

  saveUserSettingsHtmlForm() {
    const selectedLangs = this.state.saveUserSettingsForm.discussion_languages;
    const siteRes = this.state.siteRes;
    const myUserInfo = this.isoData.myUserInfo;

    return (
      <>
        <h2 className="h5">{I18NextService.i18n.t("settings")}</h2>
        <form onSubmit={e => handleSaveSettingsSubmit(this, e)}>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label" htmlFor="display-name">
              {I18NextService.i18n.t("display_name")}
            </label>
            <div className="col-sm-9">
              <input
                id="display-name"
                type="text"
                className="form-control"
                placeholder={I18NextService.i18n.t("optional")}
                value={this.state.saveUserSettingsForm.display_name}
                onInput={e => handleDisplayNameChange(this, e)}
                pattern="^(?!@)(.+)$"
                minLength={3}
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label" htmlFor="user-bio">
              {I18NextService.i18n.t("bio")}
            </label>
            <div className="col-sm-9">
              <MarkdownTextArea
                initialContent={this.state.saveUserSettingsForm.bio}
                onContentChange={val => handleBioChange(this, val)}
                maxLength={1000}
                hideNavigationWarnings
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
                myUserInfo={myUserInfo}
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label" htmlFor="user-email">
              {I18NextService.i18n.t("email")}
            </label>
            <div className="col-sm-9">
              <input
                type="email"
                id="user-email"
                className="form-control"
                placeholder={I18NextService.i18n.t("optional")}
                value={this.state.saveUserSettingsForm.email}
                onInput={e => handleEmailChange(this, e)}
                minLength={3}
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label" htmlFor="matrix-user-id">
              <a href={matrixUrl} rel={relTags}>
                {I18NextService.i18n.t("matrix_user_id")}
              </a>
            </label>
            <div className="col-sm-9">
              <input
                id="matrix-user-id"
                type="text"
                className="form-control"
                placeholder="@user:example.com"
                value={this.state.saveUserSettingsForm.matrix_user_id}
                onInput={e => handleMatrixUserIdChange(this, e)}
                pattern="^@[A-Za-z0-9\x21-\x39\x3B-\x7F]+:[A-Za-z0-9.-]+(:[0-9]{2,5})?$"
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("avatar")}
            </label>
            <div className="col-sm-9">
              <ImageUploadForm
                uploadTitle={I18NextService.i18n.t("upload_avatar")}
                imageSrc={this.state.avatar}
                uploadKey="uploadUserAvatar"
                removeKey="deleteUserAvatar"
                onImageChange={url => handleAvatarChange(this, myUserInfo, url)}
                rounded
                disabled={!myUserInfo}
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("banner")}
            </label>
            <div className="col-sm-9">
              <ImageUploadForm
                uploadTitle={I18NextService.i18n.t("upload_banner")}
                uploadKey="uploadUserBanner"
                removeKey="deleteUserBanner"
                onImageChange={url => handleBannerChange(this, myUserInfo, url)}
                imageSrc={this.state.banner}
                disabled={!myUserInfo}
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 form-label" htmlFor="user-language">
              {I18NextService.i18n.t("interface_language")}
            </label>
            <div className="col-sm-9">
              <InterfaceLanguageDropdown
                currentOption={
                  this.state.saveUserSettingsForm.interface_language ??
                  "browser"
                }
                onSelect={val => handleInterfaceLangChange(this, val)}
              />
            </div>
          </div>
          <LanguageSelect
            allLanguages={siteRes.all_languages}
            siteLanguages={siteRes.discussion_languages}
            selectedLanguageIds={selectedLangs}
            multiple
            showLanguageWarning
            showAll
            showSite
            onChange={language =>
              handleDiscussionLanguageChange(this, language)
            }
            myUserInfo={myUserInfo}
          />
          <div className="mb-3 row align-items-center">
            <label className="col-sm-3 col-form-label" htmlFor="user-theme">
              {I18NextService.i18n.t("theme")}
            </label>
            <div className="col-sm-9">
              <ThemeDropdown
                themeList={this.state.themeList}
                includeInstanceDefaults
                currentOption={
                  this.state.saveUserSettingsForm.theme ?? "instance"
                }
                onSelect={theme => handleThemeChange(this, theme)}
              />
            </div>
          </div>
          <div className="mb-3 row align-items-center">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("type")}
            </label>
            <div className="col-sm-9">
              <ListingTypeDropdown
                currentOption={
                  this.state.saveUserSettingsForm.default_listing_type ??
                  "local"
                }
                showLocal={showLocal(this.isoData)}
                showSubscribed
                showSuggested={
                  !!this.isoData.siteRes.site_view.local_site
                    .suggested_communities
                }
                myUserInfo={myUserInfo}
                showLabel={false}
                onSelect={val => handleListingTypeChange(this, val)}
              />
            </div>
          </div>
          <div className="mb-3 row align-items-center">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("listing_mode")}
            </label>
            <div className="col-sm-9">
              <PostListingModeDropdown
                currentOption={
                  this.state.saveUserSettingsForm.post_listing_mode ?? "list"
                }
                onSelect={val => handlePostListingModeChange(this, val)}
                showLabel={false}
              />
            </div>
          </div>
          <div className="mb-3 row align-items-center">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("post_sort_type")}
            </label>
            <div className="col-sm-9">
              <PostSortDropdown
                currentOption={
                  this.state.saveUserSettingsForm.default_post_sort_type ??
                  "active"
                }
                onSelect={val => handlePostSortTypeChange(this, val)}
                showLabel={false}
              />
            </div>
          </div>
          <div className="mb-3 row align-items-center">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("comment_sort_type")}
            </label>
            <div className="col-sm-9">
              <CommentSortDropdown
                currentOption={
                  this.state.saveUserSettingsForm.default_comment_sort_type ??
                  "hot"
                }
                onSelect={val => handleCommentSortTypeChange(this, val)}
                showLabel={false}
              />
            </div>
          </div>
          <div className="mb-3 row align-items-center">
            <label
              className="col-sm-3 col-form-label"
              htmlFor="post-time-range"
            >
              {I18NextService.i18n.t("post_time_range")}
            </label>
            <div className="col-sm-9">
              <TimeIntervalFilter
                currentSeconds={
                  this.state.saveUserSettingsForm
                    .default_post_time_range_seconds
                }
                onChange={seconds => handlePostTimeRangeChange(this, seconds)}
              />
            </div>
          </div>
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label" htmlFor="items-per-page">
              {I18NextService.i18n.t("posts_per_page")}
            </label>
            <div className="col-sm-9">
              <input
                id="items-per-page"
                type="number"
                className="form-control"
                value={this.state.saveUserSettingsForm.default_items_per_page}
                onInput={e => handleItemsPerPageChange(this, e)}
                min={1}
                max={50}
              />
            </div>
          </div>
          <BlockingKeywordsTextArea
            keywords={this.state.saveUserSettingsForm.blocking_keywords ?? []}
            onUpdate={keywords => handleBlockingKeywordsUpdate(this, keywords)}
          />
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_nsfw"}
                isChecked={this.state.saveUserSettingsForm.show_nsfw ?? false}
                onCheck={val => handleShowNsfwChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"blur_nsfw"}
                isChecked={
                  (this.state.saveUserSettingsForm.blur_nsfw ?? false) &&
                  (this.state.saveUserSettingsForm.show_nsfw ?? false)
                }
                onCheck={val => handleBlurNsfwChange(this, val)}
                disabled={!this.state.saveUserSettingsForm.show_nsfw}
              />
            </div>
          </div>
          <div className="row mb-3 align-items-center">
            <div className="col">
              <FilterChipCheckbox
                option={"show_scores"}
                isChecked={this.state.saveUserSettingsForm.show_score ?? false}
                onCheck={val => handleShowScoresChange(this, val, myUserInfo)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_upvotes"}
                isChecked={
                  this.state.saveUserSettingsForm.show_upvotes ?? false
                }
                onCheck={val => handleShowUpvotesChange(this, val, myUserInfo)}
              />
            </div>
          </div>
          {enableDownvotes(siteRes) && (
            <div className="mb-3 row align-items-center">
              <label className="col-sm-3 col-form-label">
                {I18NextService.i18n.t("show_downvotes")}
              </label>
              <div className="col-sm-9">
                <VoteShowDropdown
                  currentOption={
                    this.state.saveUserSettingsForm.show_downvotes ?? "show"
                  }
                  onSelect={val => handleShowDownvotesChange(this, val)}
                />
              </div>
            </div>
          )}
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_upvote_percentage"}
                isChecked={
                  this.state.saveUserSettingsForm.show_upvote_percentage ??
                  false
                }
                onCheck={val =>
                  handleShowUpvotePercentageChange(this, val, myUserInfo)
                }
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_user_vote_totals"}
                isChecked={
                  this.state.saveUserSettingsForm.show_person_votes ?? false
                }
                onCheck={val => handleShowPersonVotesChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_avatars"}
                isChecked={
                  this.state.saveUserSettingsForm.show_avatars ?? false
                }
                onCheck={val => handleShowAvatarsChange(this, val, myUserInfo)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_animated_images"}
                isChecked={
                  this.state.saveUserSettingsForm.enable_animated_images ??
                  false
                }
                onCheck={val =>
                  handleEnableAnimatedImagesChange(this, val, myUserInfo)
                }
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"hide_all_media"}
                isChecked={this.state.saveUserSettingsForm.hide_media ?? false}
                onCheck={val => handleHideMediaChange(this, val, myUserInfo)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"bot_account"}
                isChecked={this.state.saveUserSettingsForm.bot_account ?? false}
                onCheck={val => handleBotAccountChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_bot_accounts"}
                isChecked={
                  this.state.saveUserSettingsForm.show_bot_accounts ?? false
                }
                onCheck={val => handleShowBotAccountsChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"collapse_bot_comments"}
                isChecked={
                  this.state.saveUserSettingsForm.collapse_bot_comments ?? false
                }
                onCheck={val => handleCollapseBotCommentsChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"show_read_posts"}
                isChecked={
                  this.state.saveUserSettingsForm.show_read_posts ?? false
                }
                onCheck={val => handleShowReadPostsChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"send_notifications_to_email"}
                isChecked={
                  this.state.saveUserSettingsForm.send_notifications_to_email ??
                  false
                }
                onCheck={val => handleSendNotificationsToEmailChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"open_links_in_new_tab"}
                isChecked={
                  this.state.saveUserSettingsForm.open_links_in_new_tab ?? false
                }
                onCheck={val => handleOpenLinksInNewTabChange(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"enable_private_messages"}
                isChecked={
                  this.state.saveUserSettingsForm.enable_private_messages ??
                  false
                }
                onCheck={val => handleEnablePrivateMessages(this, val)}
              />
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <FilterChipCheckbox
                option={"auto_mark_fetched_posts_as_read"}
                isChecked={
                  this.state.saveUserSettingsForm
                    .auto_mark_fetched_posts_as_read ?? false
                }
                onCheck={val =>
                  handleAutoMarkFetchedPostsAsReadChange(this, val)
                }
              />
            </div>
          </div>
          <div className="input-group mb-3">
            <button
              type="submit"
              className="btn d-block btn-light border-light-subtle me-4"
            >
              {this.state.saveRes.state === "loading" ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              )}
            </button>
          </div>
        </form>
      </>
    );
  }

  deleteAccountForm() {
    return (
      <>
        <h2 className="h5">{I18NextService.i18n.t("delete_account")}</h2>
        <form className="mb-3" onSubmit={e => handleDeleteAccount(this, e)}>
          <button
            type="button"
            className="btn d-block btn-danger"
            onClick={() => handleDeleteAccountShowConfirmToggle(this)}
          >
            {I18NextService.i18n.t("delete_account")}
          </button>
          {this.state.deleteAccountShowConfirm && (
            <>
              <label
                className="my-2 alert alert-danger d-block"
                role="alert"
                htmlFor="password-delete-account"
              >
                {I18NextService.i18n.t("delete_account_confirm")}
              </label>
              <PasswordInput
                id="password-delete-account"
                value={this.state.deleteAccountForm.password}
                onInput={e => handleDeleteAccountPasswordChange(this, e)}
                className="my-2"
              />
              <div className="row mb-3">
                <div className="col">
                  <FilterChipCheckbox
                    option={"delete_account_content"}
                    isChecked={
                      this.state.deleteAccountForm.delete_content ?? false
                    }
                    onCheck={val => handleDeleteAccountContentChange(this, val)}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-danger me-4"
                disabled={!this.state.deleteAccountForm.password}
              >
                {this.state.deleteAccountRes.state === "loading" ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(I18NextService.i18n.t("delete"))
                )}
              </button>
              <button
                className="btn btn-light border-light-subtle"
                type="button"
                onClick={() => handleDeleteAccountShowConfirmToggle(this)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            </>
          )}
        </form>
      </>
    );
  }

  totpSection() {
    const totpEnabled =
      !!this.isoData.myUserInfo?.local_user_view.local_user.totp_2fa_enabled;
    const { generateTotpRes } = this.state;
    const totpActionStr = totpEnabled ? "disable_totp" : "enable_totp";
    const myUserInfo = this.isoData.myUserInfo;

    return (
      <>
        <h2 className="h5">{I18NextService.i18n.t(totpActionStr)}</h2>
        <button
          type="button"
          className="btn btn-light border-light-subtle my-2"
          onClick={() =>
            totpEnabled ? handleShowTotpModal(this) : handleGenerateTotp(this)
          }
        >
          {I18NextService.i18n.t(totpActionStr)}
        </button>
        {totpEnabled ? (
          <TotpModal
            type="remove"
            onSubmit={form => handleDisable2fa(this, form, myUserInfo)}
            show={this.state.show2faModal}
            onClose={() => handleClose2faModal(this)}
          />
        ) : (
          <TotpModal
            type="generate"
            onSubmit={form => handleEnable2fa(this, form, myUserInfo)}
            secretUrl={
              generateTotpRes.state === "success"
                ? generateTotpRes.data.totp_secret_url
                : undefined
            }
            show={this.state.show2faModal}
            onClose={() => handleClose2faModal(this)}
          />
        )}
      </>
    );
  }

  personBlock(res: RequestState<PersonResponse>, blocked: boolean) {
    if (res.state === "success") {
      updatePersonBlock(res.data, blocked, this.isoData.myUserInfo);
      const mui = this.isoData.myUserInfo;
      if (mui) {
        this.setState({ personBlocks: mui.person_blocks });
      }
    }
  }

  communityBlock(res: RequestState<CommunityResponse>, blocked: boolean) {
    if (res.state === "success") {
      updateCommunityBlock(res.data, blocked, this.isoData.myUserInfo);
      const mui = this.isoData.myUserInfo;
      if (mui) {
        this.setState({ communityBlocks: mui.community_blocks });
      }
    }
  }

  instanceCommunitiesBlock(id: number, blocked: boolean) {
    const mui = this.isoData.myUserInfo;
    if (mui && this.state.instancesRes.state === "success") {
      const linkedInstances =
        this.state.instancesRes.data.items.map(view => view.instance) ?? [];
      updateInstanceCommunitiesBlock(blocked, id, linkedInstances, mui);
      this.setState({
        instanceCommunitiesBlocks: mui.instance_communities_blocks,
      });
    }
  }

  instancePersonsBlock(id: number, blocked: boolean) {
    const mui = this.isoData.myUserInfo;
    if (mui && this.state.instancesRes.state === "success") {
      const linkedInstances =
        this.state.instancesRes.data.items.map(view => view.instance) ?? [];
      updateInstancePersonsBlock(blocked, id, linkedInstances, mui);
      this.setState({
        instancePersonsBlocks: mui.instance_persons_blocks,
      });
    }
  }
}

async function handleGenerateTotp(i: Settings) {
  i.setState({ generateTotpRes: LOADING_REQUEST });

  const generateTotpRes = await HttpService.client.generateTotpSecret();

  if (generateTotpRes.state === "failed") {
    toast(generateTotpRes.err.name, "danger");
  } else {
    i.setState({ show2faModal: true });
  }

  i.setState({
    generateTotpRes,
  });
}

function handleShowTotpModal(i: Settings) {
  i.setState({ show2faModal: true });
}

function handleClose2faModal(i: Settings) {
  i.setState({ show2faModal: false });
}

async function handleToggle2fa(
  i: Settings,
  totp: string,
  enabled: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  i.setState({ editTotpRes: LOADING_REQUEST });

  const updateTotpRes = await HttpService.client.editTotp({
    enabled,
    totp_token: totp,
  });

  i.setState({ editTotpRes: updateTotpRes });

  const successful = updateTotpRes.state === "success";
  if (successful && myUserInfo) {
    i.setState({ show2faModal: false });

    const siteRes = await HttpService.client.getSite();

    myUserInfo.local_user_view.local_user.totp_2fa_enabled = enabled;

    if (siteRes.state === "success") {
      i.setState({ siteRes: siteRes.data });
    }

    toast(
      I18NextService.i18n.t(
        enabled ? "enable_totp_success" : "disable_totp_success",
      ),
    );
  } else {
    toast(I18NextService.i18n.t("incorrect_totp_code"), "danger");
  }

  return successful;
}

function handleEnable2fa(
  i: Settings,
  totp: string,
  myUserInfo: MyUserInfo | undefined,
) {
  return handleToggle2fa(i, totp, true, myUserInfo);
}

function handleDisable2fa(
  i: Settings,
  totp: string,
  myUserInfo: MyUserInfo | undefined,
) {
  return handleToggle2fa(i, totp, false, myUserInfo);
}

const handlePersonSearch = debounce(async (i: Settings, text: string) => {
  i.setState({ searchPersonLoading: true });

  const searchPersonOptions: Choice[] = [];

  if (text.length > 0) {
    searchPersonOptions.push(...(await fetchUsers(text)).map(personToChoice));
  }

  i.setState({
    searchPersonLoading: false,
    searchPersonOptions,
  });
});

const handleCommunitySearch = debounce(async (i: Settings, text: string) => {
  i.setState({ searchCommunityLoading: true });

  const searchCommunityOptions: Choice[] = [];

  if (text.length > 0) {
    searchCommunityOptions.push(
      ...(await fetchCommunities(text)).map(communityToChoice),
    );
  }

  i.setState({
    searchCommunityLoading: false,
    searchCommunityOptions,
  });
});

const handleInstanceSearch = debounce((i: Settings, text: string) => {
  let searchInstanceOptions: Instance[] = [];

  if (i.state.instancesRes.state === "success") {
    searchInstanceOptions =
      i.state.instancesRes.data.items
        ?.filter(view =>
          view.instance.domain.toLowerCase().includes(text.toLowerCase()),
        )
        .map(view => view.instance) ?? [];
  }

  i.setState({
    searchInstanceOptions: searchInstanceOptions
      .slice(0, fetchLimit)
      .map(instanceToChoice),
  });
});

async function handleBlockPerson(i: Settings, { value }: Choice) {
  const block = true;
  if (value !== "0") {
    const res = await HttpService.client.blockPerson({
      person_id: Number(value),
      block,
    });
    i.personBlock(res, block);
  }
}

async function handleUnblockPerson(i: Settings, recipientId: PersonId) {
  const block = false;
  const res = await HttpService.client.blockPerson({
    person_id: recipientId,
    block,
  });
  i.personBlock(res, block);
}

async function handleBlockCommunity(i: Settings, { value }: Choice) {
  const block = true;
  if (value !== "0") {
    const res = await HttpService.client.blockCommunity({
      community_id: Number(value),
      block,
    });
    i.communityBlock(res, block);
  }
}

async function handleUnblockCommunity(i: Settings, communityId: CommunityId) {
  const block = false;
  if (myAuth()) {
    const res = await HttpService.client.blockCommunity({
      community_id: communityId,
      block,
    });
    i.communityBlock(res, block);
  }
}

async function handleBlockInstanceCommunities(i: Settings, { value }: Choice) {
  const block = true;
  if (value !== "0") {
    const id = Number(value);
    const res = await HttpService.client.userBlockInstanceCommunities({
      block,
      instance_id: id,
    });
    if (res.state === "success") {
      i.instanceCommunitiesBlock(id, block);
    }
  }
}

async function handleUnblockInstanceCommunities(
  ctx: Settings,
  instanceId: InstanceId,
) {
  const block = false;
  const res = await HttpService.client.userBlockInstanceCommunities({
    block,
    instance_id: instanceId,
  });
  if (res.state === "success") {
    ctx.instanceCommunitiesBlock(instanceId, block);
  }
}

async function handleBlockInstancePersons(i: Settings, { value }: Choice) {
  const block = true;
  if (value !== "0") {
    const id = Number(value);
    const res = await HttpService.client.userBlockInstancePersons({
      block,
      instance_id: id,
    });
    if (res.state === "success") {
      i.instancePersonsBlock(id, block);
    }
  }
}

async function handleUnblockInstancePersons(
  ctx: Settings,
  instanceId: InstanceId,
) {
  const block = false;
  const res = await HttpService.client.userBlockInstancePersons({
    block,
    instance_id: instanceId,
  });
  if (res.state === "success") {
    ctx.instancePersonsBlock(instanceId, block);
  }
}

function handleShowNsfwChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.show_nsfw = val), s));
}

function handleBlurNsfwChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.blur_nsfw = val), s));
}

function handleShowAvatarsChange(
  i: Settings,
  val: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const mui = myUserInfo;
  if (mui) {
    mui.local_user_view.local_user.show_avatars = val;
  }
  i.setState(s => ((s.saveUserSettingsForm.show_avatars = val), s));
}

function handleEnableAnimatedImagesChange(
  i: Settings,
  val: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const mui = myUserInfo;
  if (mui) {
    mui.local_user_view.local_user.enable_animated_images = val;
  }
  i.setState(s => ((s.saveUserSettingsForm.enable_animated_images = val), s));
}

function handleHideMediaChange(
  i: Settings,
  val: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const mui = myUserInfo;
  if (mui) {
    mui.local_user_view.local_user.hide_media = val;
  }
  i.setState(s => ((s.saveUserSettingsForm.hide_media = val), s));
}

function handleBotAccountChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.bot_account = val), s));
}

function handleShowBotAccountsChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.show_bot_accounts = val), s));
}

function handleShowReadPostsChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.show_read_posts = val), s));
}

function handleOpenLinksInNewTabChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.open_links_in_new_tab = val), s));
}

function handleEnablePrivateMessages(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.enable_private_messages = val), s));
}

function handleAutoMarkFetchedPostsAsReadChange(i: Settings, val: boolean) {
  i.setState(
    s => ((s.saveUserSettingsForm.auto_mark_fetched_posts_as_read = val), s),
  );
}

function handleShowScoresChange(
  i: Settings,
  val: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const mui = myUserInfo;
  if (mui) {
    mui.local_user_view.local_user.show_score = val;
  }
  i.setState(s => ((s.saveUserSettingsForm.show_score = val), s));
}

function handleShowUpvotesChange(
  i: Settings,
  val: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const mui = myUserInfo;
  if (mui) {
    mui.local_user_view.local_user.show_upvotes = val;
  }
  i.setState(s => ((s.saveUserSettingsForm.show_upvotes = val), s));
}

function handleShowDownvotesChange(i: Settings, val: VoteShow) {
  i.setState(s => ((s.saveUserSettingsForm.show_downvotes = val), s));
}

function handleShowUpvotePercentageChange(
  i: Settings,
  val: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const mui = myUserInfo;
  if (mui) {
    mui.local_user_view.local_user.show_upvote_percentage = val;
  }
  i.setState(s => ((s.saveUserSettingsForm.show_upvote_percentage = val), s));
}

function handleShowPersonVotesChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.show_person_votes = val), s));
}

function handleCollapseBotCommentsChange(i: Settings, val: boolean) {
  i.setState(s => ((s.saveUserSettingsForm.collapse_bot_comments = val), s));
}

function handleSendNotificationsToEmailChange(i: Settings, val: boolean) {
  i.setState(
    s => ((s.saveUserSettingsForm.send_notifications_to_email = val), s),
  );
}

function handleThemeChange(i: Settings, theme: string) {
  i.setState(s => ((s.saveUserSettingsForm.theme = theme), s));
  setThemeOverride(theme);
}

function handleInterfaceLangChange(i: Settings, newLang: string) {
  I18NextService.reconfigure(navigator.languages, newLang);

  i.setState(s => ((s.saveUserSettingsForm.interface_language = newLang), s));
}

function handleDiscussionLanguageChange(i: Settings, val: number[]) {
  i.setState(s => ((s.saveUserSettingsForm.discussion_languages = val), s));
}

function handlePostListingModeChange(i: Settings, val: PostListingMode) {
  i.setState(s => ((s.saveUserSettingsForm.post_listing_mode = val), s));
}

function handlePostSortTypeChange(i: Settings, val: PostSortType) {
  i.setState(s => ((s.saveUserSettingsForm.default_post_sort_type = val), s));
}

function handleCommentSortTypeChange(i: Settings, val: CommentSortType) {
  i.setState(
    s => ((s.saveUserSettingsForm.default_comment_sort_type = val), s),
  );
}

function handlePostTimeRangeChange(i: Settings, val: number) {
  i.setState(
    s => ((s.saveUserSettingsForm.default_post_time_range_seconds = val), s),
  );
}

function handleBlockingKeywordsUpdate(i: Settings, val: string[]) {
  i.setState(s => ((s.saveUserSettingsForm.blocking_keywords = val), s));
}

function handleListingTypeChange(i: Settings, val: ListingType) {
  i.setState(s => ((s.saveUserSettingsForm.default_listing_type = val), s));
}

function handleItemsPerPageChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  const items = event.target.value ? Number(event.target.value) : undefined;
  i.setState(s => ((s.saveUserSettingsForm.default_items_per_page = items), s));
}

function handleEmailChange(i: Settings, event: FormEvent<HTMLInputElement>) {
  i.setState(s => ((s.saveUserSettingsForm.email = event.target.value), s));
}

function handleBioChange(i: Settings, val: string) {
  i.setState(s => ((s.saveUserSettingsForm.bio = val), s));
}

function handleAvatarChange(
  i: Settings,
  myUserInfo: MyUserInfo | undefined,
  url?: string,
) {
  if (myUserInfo) {
    myUserInfo.local_user_view.person.avatar = url;
  }
  i.setState({ avatar: url });
}

function handleBannerChange(
  i: Settings,
  myUserInfo: MyUserInfo | undefined,
  url?: string,
) {
  if (myUserInfo) {
    myUserInfo.local_user_view.person.banner = url;
  }
  i.setState({ banner: url });
}

function handleDisplayNameChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(
    s => ((s.saveUserSettingsForm.display_name = event.target.value), s),
  );
}

function handleMatrixUserIdChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(
    s => ((s.saveUserSettingsForm.matrix_user_id = event.target.value), s),
  );
}

function handleNewPasswordChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  const newPass: string | undefined =
    event.target.value === "" ? undefined : event.target.value;
  i.setState(s => ((s.changePasswordForm.new_password = newPass), s));
}

function handleNewPasswordVerifyChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  const newPassVerify: string | undefined =
    event.target.value === "" ? undefined : event.target.value;
  i.setState(
    s => ((s.changePasswordForm.new_password_verify = newPassVerify), s),
  );
}

function handleOldPasswordChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  const oldPass: string | undefined =
    event.target.value === "" ? undefined : event.target.value;
  i.setState(s => ((s.changePasswordForm.old_password = oldPass), s));
}

async function handleSaveSettingsSubmit(
  i: Settings,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  i.setState({ saveRes: LOADING_REQUEST });

  const saveRes = await HttpService.client.saveUserSettings({
    ...i.state.saveUserSettingsForm,
  });

  if (saveRes.state === "success") {
    const [siteRes, userRes] = await Promise.all([
      HttpService.client.getSite(),
      HttpService.client.getMyUser(),
    ]);

    if (siteRes.state === "success" && userRes.state === "success") {
      i.setState({
        siteRes: siteRes.data,
      });

      updateMyUserInfo(userRes.data);
      I18NextService.reconfigure(
        window.navigator.languages,
        userRes.data.local_user_view.local_user.interface_language,
      );
    }

    toast(I18NextService.i18n.t("saved"));

    // You need to reload the page, to properly update the siteRes everywhere
    setTimeout(() => location.reload(), 500);
  } else if (saveRes.state === "failed") {
    toast(
      I18NextService.i18n.t(saveRes.err.name as NoOptionI18nKeys),
      "danger",
    );
  }

  setThemeOverride(undefined);
  i.setState({ saveRes });
}

async function handleChangePasswordSubmit(
  i: Settings,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  const { new_password, new_password_verify, old_password } =
    i.state.changePasswordForm;

  if (new_password && new_password_verify) {
    i.setState({ changePasswordRes: LOADING_REQUEST });
    const changePasswordRes = await HttpService.client.changePassword({
      new_password,
      new_password_verify,
      old_password: old_password || "",
    });
    if (changePasswordRes.state === "success") {
      snapToTop();
      toast(I18NextService.i18n.t("password_changed"));
    }

    i.setState({ changePasswordRes });
  }
}

function handleImportFileChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    settingsFile: event.target.files?.item(0) ?? undefined,
  });
}

async function handleExportSettings(i: Settings) {
  i.setState({ exportSettingsRes: LOADING_REQUEST });
  const res = await HttpService.client.exportSettings();

  if (res.state === "success") {
    i.exportSettingsLink.current!.href = `data:application/json,${encodeURIComponent(
      JSON.stringify(res.data),
    )}`;
    i.exportSettingsLink.current?.click();
  } else if (res.state === "failed") {
    toast(
      res.err.name === "rate_limit_error"
        ? I18NextService.i18n.t("import_export_rate_limit_error")
        : I18NextService.i18n.t("export_error"),
      "danger",
    );
  }

  i.setState({ exportSettingsRes: EMPTY_REQUEST });
}

async function handleImportSettings(i: Settings) {
  i.setState({ importSettingsRes: LOADING_REQUEST });

  const res = await HttpService.client.importSettings(
    JSON.parse(await i.state.settingsFile!.text()),
  );

  if (res.state === "success") {
    toast(I18NextService.i18n.t("import_success"), "success");

    const saveRes = i.state.saveRes;
    i.setState({ saveRes: LOADING_REQUEST });

    const [siteRes, userRes] = await Promise.all([
      HttpService.client.getSite(),
      HttpService.client.getMyUser(),
    ]);
    i.setState({ saveRes });

    if (siteRes.state === "success" && userRes.state === "success") {
      const {
        local_user: {
          show_nsfw,
          blur_nsfw,
          theme,
          default_post_sort_type,
          default_comment_sort_type,
          default_listing_type,
          default_items_per_page,
          interface_language,
          show_avatars,
          show_bot_accounts,
          show_read_posts,
          send_notifications_to_email,
          email,
          open_links_in_new_tab,
          enable_private_messages,
          auto_mark_fetched_posts_as_read,
        },
        person: {
          avatar,
          banner,
          display_name,
          bot_account,
          bio,
          matrix_user_id,
        },
      } = userRes.data.local_user_view;

      updateMyUserInfo(userRes.data);
      refreshTheme();

      i.setState(prev => ({
        ...prev,
        saveUserSettingsForm: {
          ...prev.saveUserSettingsForm,
          show_avatars,
          show_bot_accounts,
          show_nsfw,
          teme: theme ?? "browser",
          display_name,
          bio,
          matrix_user_id,
          blur_nsfw,
          bot_account,
          default_listing_type,
          default_items_per_page,
          default_post_sort_type,
          default_comment_sort_type,
          discussion_languages: userRes.data.discussion_languages,
          email,
          interface_language,
          open_links_in_new_tab,
          send_notifications_to_email,
          show_read_posts,
          enable_private_messages,
          auto_mark_fetched_posts_as_read,
        },
        avatar,
        banner,
      }));
    }
  } else if (res.state === "failed") {
    toast(
      res.err.name === "rate_limit_error"
        ? I18NextService.i18n.t("import_export_rate_limit_error")
        : I18NextService.i18n.t("import_error"),
      "danger",
    );
  }

  i.setState({ importSettingsRes: EMPTY_REQUEST, settingsFile: undefined });
}

function handleDeleteAccountShowConfirmToggle(i: Settings) {
  i.setState({ deleteAccountShowConfirm: !i.state.deleteAccountShowConfirm });
}

function handleDeleteAccountContentChange(i: Settings, val: boolean) {
  i.setState(s => ((s.deleteAccountForm.delete_content = val), s));
}

function handleDeleteAccountPasswordChange(
  i: Settings,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.deleteAccountForm.password = event.target.value), s));
}

async function handleDeleteAccount(
  i: Settings,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  const password = i.state.deleteAccountForm.password;
  if (password) {
    i.setState({ deleteAccountRes: LOADING_REQUEST });
    const deleteAccountRes = await HttpService.client.deleteAccount({
      password,
      delete_content: i.state.deleteAccountForm.delete_content || false,
    });
    if (deleteAccountRes.state === "success") {
      UserService.Instance.logout();
      const context: RouterContext = i.context;
      context.router.history.replace("/");
    }

    i.setState({ deleteAccountRes });
  }
}
