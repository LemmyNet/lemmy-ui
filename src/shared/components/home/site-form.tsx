import { capitalizeFirstLetter } from "@utils/helpers";
import { Component } from "inferno";
import { Prompt } from "inferno-router";
import {
  CommentSortType,
  CreateSite,
  EditSite,
  FederationMode,
  GetSiteResponse,
  ListingType,
  MyUserInfo,
  PostListingMode,
  PostSortType,
  RegistrationMode,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import UrlListTextarea from "../common/url-list-textarea";
import { FormEvent } from "inferno";
import { FederationModeDropdown } from "./federation-mode-dropdown";
import {
  CommentSortDropdown,
  PostSortDropdown,
} from "@components/common/sort-dropdown";
import { TimeIntervalFilter } from "@components/common/time-interval-filter";
import { PostListingModeDropdown } from "@components/common/post-listing-mode-dropdown";
import { ListingTypeDropdown } from "@components/common/listing-type-dropdown";
import { RegistrationModeDropdown } from "@components/common/registration-mode-dropdown";
import { FilterChipCheckbox } from "@components/common/filter-chip-checkbox";
import { ThemeDropdown } from "@components/common/theme-dropdown";
import {
  CaptchaDifficulty,
  CaptchaDifficultyDropdown,
} from "@components/common/captcha-difficulty-dropdown";

interface SiteFormProps {
  showLocal?: boolean;
  themeList?: string[];
  onCreate?(form: CreateSite): void;
  onEdit?(form: EditSite): void;
  siteRes: GetSiteResponse;
  loading: boolean;
  myUserInfo: MyUserInfo | undefined;
}

interface SiteFormState {
  siteForm: EditSite;
  submitted: boolean;
  icon?: string;
  banner?: string;
}

export class SiteForm extends Component<SiteFormProps, SiteFormState> {
  state: SiteFormState = {
    siteForm: this.initSiteForm(),
    submitted: false,
  };

  initSiteForm(): EditSite {
    const site = this.props.siteRes?.site_view.site;
    const ls = this.props.siteRes?.site_view.local_site;

    return {
      name: site?.name,
      summary: site?.summary,
      sidebar: site?.sidebar,
      registration_mode: ls?.registration_mode,
      oauth_registration: ls?.oauth_registration,
      community_creation_admin_only: ls?.community_creation_admin_only,
      post_upvotes: ls?.post_upvotes,
      post_downvotes: ls?.post_downvotes,
      comment_upvotes: ls?.comment_upvotes,
      comment_downvotes: ls?.comment_downvotes,
      require_email_verification: ls?.require_email_verification,
      application_question: ls?.application_question,
      private_instance: ls?.private_instance,
      default_theme: ls?.default_theme,
      default_post_listing_type: ls?.default_post_listing_type,
      legal_information: ls?.legal_information,
      application_email_admins: ls?.application_email_admins,
      reports_email_admins: ls?.reports_email_admins,
      discussion_languages: this.props.siteRes?.discussion_languages,
      slur_filter_regex: ls?.slur_filter_regex,
      federation_enabled: ls?.federation_enabled,
      captcha_enabled: ls?.captcha_enabled,
      captcha_difficulty: ls?.captcha_difficulty,
      blocked_urls: this.props.siteRes?.blocked_urls.map(u => u.url),
      content_warning: this.props.siteRes?.site_view.site.content_warning,
      disable_email_notifications: ls?.disable_email_notifications,
      default_items_per_page: ls?.default_items_per_page,
      default_comment_sort_type: ls?.default_comment_sort_type,
      default_post_sort_type: ls?.default_post_sort_type,
      default_post_time_range_seconds: ls?.default_post_time_range_seconds,
    };
  }

  constructor(props: any, context: any) {
    super(props, context);

    const { icon, banner } = this.props.siteRes.site_view.site;

    this.state = {
      ...this.state,
      icon,
      banner,
    };
  }

  render() {
    const siteSetup = this.props.siteRes?.site_view.local_site.site_setup;
    return (
      <form className="site-form" onSubmit={e => handleSubmit(this, e)}>
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.props.loading &&
            !siteSetup &&
            !!(
              this.state.siteForm.name ||
              this.state.siteForm.sidebar ||
              this.state.siteForm.application_question ||
              this.state.siteForm.summary
            ) &&
            !this.state.submitted
          }
        />
        <h2 className="h5">
          {siteSetup
            ? capitalizeFirstLetter(I18NextService.i18n.t("edit_your_site"))
            : capitalizeFirstLetter(I18NextService.i18n.t("setup_your_site"))}
        </h2>
        <div className="mb-3 row">
          <label className="col-12 col-form-label" htmlFor="create-site-name">
            {I18NextService.i18n.t("name")}
          </label>
          <div className="col-12">
            <input
              type="text"
              id="create-site-name"
              className="form-control"
              value={this.state.siteForm.name}
              onInput={e => handleSiteNameChange(this, e)}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("icon")}
          </label>
          <div className="col-sm-10">
            <ImageUploadForm
              uploadTitle={I18NextService.i18n.t("upload_icon")}
              uploadKey="uploadSiteIcon"
              removeKey="deleteSiteIcon"
              imageSrc={this.state.icon}
              onImageChange={url => handleIconChange(this, url)}
              rounded
              disabled={!this.props.myUserInfo}
            />
          </div>
        </div>
        <div className="row mb-3">
          <label className="col-sm-2 col-form-label">
            {I18NextService.i18n.t("banner")}
          </label>
          <div className="col-sm-10">
            <ImageUploadForm
              uploadTitle={I18NextService.i18n.t("upload_banner")}
              uploadKey="uploadSiteBanner"
              removeKey="deleteSiteBanner"
              imageSrc={this.state.banner}
              onImageChange={url => handleBannerChange(this, url)}
              disabled={!this.props.myUserInfo}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-form-label" htmlFor="site-summary">
            {I18NextService.i18n.t("summary")}
          </label>
          <div className="col-12">
            <input
              type="text"
              className="form-control"
              id="site-summary"
              value={this.state.siteForm.summary}
              onInput={e => handleSiteSummaryChange(this, e)}
              maxLength={150}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-form-label">
            {I18NextService.i18n.t("sidebar")}
          </label>
          <div className="col-12">
            <MarkdownTextArea
              initialContent={this.state.siteForm.sidebar}
              onContentChange={val => handleSiteSidebarChange(this, val)}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
              myUserInfo={this.props.myUserInfo}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-form-label">
            {I18NextService.i18n.t("legal_information")}
          </label>
          <div className="col-12">
            <MarkdownTextArea
              initialContent={this.state.siteForm.legal_information}
              onContentChange={val => handleSiteLegalInfoChange(this, val)}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
              myUserInfo={this.props.myUserInfo}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label
            className="col-12 col-form-label"
            htmlFor="default-items-per-page"
          >
            {I18NextService.i18n.t("posts_per_page")}
          </label>
          <div className="col-12">
            <input
              id="items-per-page"
              type="number"
              className="form-control"
              value={this.state.siteForm.default_items_per_page}
              onInput={e => handleDefaultItemsPerPageChange(this, e)}
              min={1}
              max={50}
            />
          </div>
        </div>
        <div className="mb-3 row align-items-center">
          {(
            [
              { kind: "post_upvotes", i18nKey: "post_upvote_federation" },
              { kind: "post_downvotes", i18nKey: "post_downvote_federation" },
              { kind: "comment_upvotes", i18nKey: "comment_upvote_federation" },
              {
                kind: "comment_downvotes",
                i18nKey: "comment_downvote_federation",
              },
            ] as const
          ).map(vote => (
            <>
              <label className="col-sm-3 col-form-label" htmlFor={vote.kind}>
                {I18NextService.i18n.t(vote.i18nKey)}
              </label>
              <div className="col-sm-9">
                <FederationModeDropdown
                  currentOption={this.state.siteForm[vote.kind] ?? "all"}
                  onSelect={val =>
                    handleSiteVoteModeChange(this, val, vote.kind)
                  }
                />
              </div>
            </>
          ))}
        </div>
        <div className="row mb-3">
          <div className="col">
            <FilterChipCheckbox
              option={"disallow_nsfw_content"}
              isChecked={this.state.siteForm.disallow_nsfw_content ?? false}
              onCheck={val => handleSiteEnableNsfwChange(this, val)}
            />
          </div>
        </div>
        {!this.state.siteForm.disallow_nsfw_content && (
          <div className="mb-3 row">
            <div className="alert small alert-info" role="alert">
              <Icon icon="info" classes="icon-inline me-2" />
              {I18NextService.i18n.t("content_warning_setting_blurb")}
            </div>
            <label className="col-12 col-form-label">
              {I18NextService.i18n.t("content_warning")}
            </label>
            <div className="col-12">
              <MarkdownTextArea
                initialContent={this.state.siteForm.content_warning}
                onContentChange={val =>
                  handleSiteContentWarningChange(this, val)
                }
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
                myUserInfo={this.props.myUserInfo}
              />
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <div className="col-12">
            <RegistrationModeDropdown
              currentOption={
                this.state.siteForm.registration_mode ?? "require_application"
              }
              onSelect={val => handleSiteRegistrationModeChange(this, val)}
            />
          </div>
        </div>
        {this.state.siteForm.registration_mode === "require_application" && (
          <div className="mb-3 row">
            <label className="col-12 col-form-label">
              {I18NextService.i18n.t("application_questionnaire")}
            </label>
            <div className="col-12">
              <MarkdownTextArea
                initialContent={this.state.siteForm.application_question}
                onContentChange={val =>
                  handleSiteApplicationQuestionChange(this, val)
                }
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
                myUserInfo={this.props.myUserInfo}
              />
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"oauth_registration"}
              isChecked={this.state.siteForm.oauth_registration ?? false}
              onCheck={val => handleSiteOauthRegistration(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"community_creation_admin_only"}
              isChecked={
                this.state.siteForm.community_creation_admin_only ?? false
              }
              onCheck={val => handleSiteCommunityCreationAdminOnly(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"disable_email_notifications"}
              isChecked={
                this.state.siteForm.disable_email_notifications ?? false
              }
              onCheck={val => handleSiteDisableEmailNotifications(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"require_email_verification"}
              isChecked={
                this.state.siteForm.require_email_verification ?? false
              }
              onCheck={val => handleSiteRequireEmailVerification(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"application_email_admins"}
              isChecked={this.state.siteForm.application_email_admins ?? false}
              onCheck={val => handleSiteApplicationEmailAdmins(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"reports_email_admins"}
              isChecked={this.state.siteForm.reports_email_admins ?? false}
              onCheck={val => handleSiteReportsEmailAdmins(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"private_instance"}
              isChecked={this.state.siteForm.private_instance ?? false}
              onCheck={val => handleSitePrivateInstance(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row align-items-center">
          <label className="col-sm-3 col-form-label">
            {I18NextService.i18n.t("default_theme")}
          </label>
          <div className="col-sm-9">
            <ThemeDropdown
              currentOption={this.state.siteForm.default_theme ?? "litely"}
              themeList={this.props.themeList ?? []}
              includeInstanceDefaults={false}
              onSelect={val => handleSiteDefaultTheme(this, val)}
            />
          </div>
        </div>
        {this.props.showLocal && (
          <div className="mb-3 row align-items-center">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("listing_type")}
            </label>
            <div className="col-sm-9">
              <ListingTypeDropdown
                currentOption={
                  this.state.siteForm.default_post_listing_type ?? "local"
                }
                showLocal
                showSubscribed={false}
                myUserInfo={this.props.myUserInfo}
                onSelect={val => handleDefaultPostListingTypeChange(this, val)}
              />
            </div>
          </div>
        )}
        <div className="mb-3 row align-items-center">
          <label className="col-sm-3 col-form-label">
            {I18NextService.i18n.t("listing_mode")}
          </label>
          <div className="col-sm-9">
            <PostListingModeDropdown
              currentOption={
                this.state.siteForm.default_post_listing_mode ?? "list"
              }
              onSelect={val => handlePostListingModeChange(this, val)}
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
                this.state.siteForm.default_post_sort_type ?? "active"
              }
              onSelect={val => handlePostSortTypeChange(this, val)}
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
                this.state.siteForm.default_comment_sort_type ?? "hot"
              }
              onSelect={val => handleCommentSortTypeChange(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row align-items-center">
          <label className="col-sm-3 col-form-label">
            {I18NextService.i18n.t("post_time_range")}
          </label>
          <div className="col-sm-9">
            <TimeIntervalFilter
              currentSeconds={
                this.state.siteForm.default_post_time_range_seconds
              }
              onChange={seconds => handlePostTimeRangeChange(this, seconds)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label
            className="col-12 col-form-label"
            htmlFor="create-site-slur-filter-regex"
          >
            {I18NextService.i18n.t("slur_filter_regex")}
          </label>
          <div className="col-12">
            <input
              type="text"
              id="create-site-slur-filter-regex"
              placeholder="(word1|word2)"
              className="form-control"
              value={this.state.siteForm.slur_filter_regex}
              onInput={e => handleSiteSlurFilterRegex(this, e)}
              minLength={3}
            />
          </div>
        </div>
        <LanguageSelect
          allLanguages={this.props.siteRes?.all_languages}
          siteLanguages={this.props.siteRes?.discussion_languages}
          selectedLanguageIds={this.state.siteForm.discussion_languages}
          multiple
          onChange={val => handleDiscussionLanguageChange(this, val)}
          showAll
          myUserInfo={this.props.myUserInfo}
        />
        <UrlListTextarea
          urls={this.state.siteForm.blocked_urls ?? []}
          onUpdate={urls => handleBlockedUrlsUpdate(this, urls)}
        />
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"federation_enabled"}
              isChecked={this.state.siteForm.federation_enabled ?? false}
              onCheck={val => handleSiteFederationEnabled(this, val)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <FilterChipCheckbox
              option={"captcha_enabled"}
              isChecked={this.state.siteForm.captcha_enabled ?? false}
              onCheck={val => handleSiteCaptchaEnabled(this, val)}
            />
          </div>
        </div>
        {this.state.siteForm.captcha_enabled && (
          <div className="mb-3 row">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("captcha_difficulty")}
            </label>
            <div className="col-sm-9">
              <CaptchaDifficultyDropdown
                currentOption={
                  this.state.siteForm.captcha_difficulty as CaptchaDifficulty
                }
                onSelect={val => handleSiteCaptchaDifficulty(this, val)}
              />
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-light border-light-subtle me-2"
              disabled={this.props.loading}
            >
              {this.props.loading ? (
                <Spinner />
              ) : siteSetup ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("create"))
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }
}

function handleSubmit(i: SiteForm, event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  i.setState({ submitted: true });

  const stateSiteForm = i.state.siteForm;

  if (i.props.siteRes?.site_view.local_site.site_setup) {
    const form = stateSiteForm;
    i.props.onEdit?.(form);
  } else {
    const form: CreateSite = {
      name: stateSiteForm.name ?? "My site",
      summary: stateSiteForm.summary,
      sidebar: stateSiteForm.sidebar,
      community_creation_admin_only:
        stateSiteForm.community_creation_admin_only,
      post_upvotes: stateSiteForm.post_upvotes,
      post_downvotes: stateSiteForm.post_downvotes,
      comment_upvotes: stateSiteForm.comment_upvotes,
      comment_downvotes: stateSiteForm.comment_downvotes,
      disallow_nsfw_content: stateSiteForm.disallow_nsfw_content,
      application_question: stateSiteForm.application_question,
      registration_mode: stateSiteForm.registration_mode,
      oauth_registration: stateSiteForm.oauth_registration,
      require_email_verification: stateSiteForm.require_email_verification,
      private_instance: stateSiteForm.private_instance,
      default_theme: stateSiteForm.default_theme,
      default_post_listing_type: stateSiteForm.default_post_listing_type,
      application_email_admins: stateSiteForm.application_email_admins,
      legal_information: stateSiteForm.legal_information,
      slur_filter_regex: stateSiteForm.slur_filter_regex,
      rate_limit_message_max_requests:
        stateSiteForm.rate_limit_message_max_requests,
      rate_limit_message_interval_seconds:
        stateSiteForm.rate_limit_message_interval_seconds,
      rate_limit_post_max_requests: stateSiteForm.rate_limit_post_max_requests,
      rate_limit_post_interval_seconds:
        stateSiteForm.rate_limit_post_interval_seconds,
      rate_limit_register_max_requests:
        stateSiteForm.rate_limit_register_max_requests,
      rate_limit_register_interval_seconds:
        stateSiteForm.rate_limit_register_interval_seconds,
      rate_limit_image_max_requests:
        stateSiteForm.rate_limit_image_max_requests,
      rate_limit_image_interval_seconds:
        stateSiteForm.rate_limit_image_interval_seconds,
      rate_limit_comment_max_requests:
        stateSiteForm.rate_limit_comment_max_requests,
      rate_limit_comment_interval_seconds:
        stateSiteForm.rate_limit_comment_interval_seconds,
      rate_limit_search_max_requests:
        stateSiteForm.rate_limit_search_max_requests,
      rate_limit_search_interval_seconds:
        stateSiteForm.rate_limit_search_interval_seconds,
      rate_limit_import_user_settings_max_requests:
        stateSiteForm.rate_limit_import_user_settings_max_requests,
      rate_limit_import_user_settings_interval_seconds:
        stateSiteForm.rate_limit_import_user_settings_interval_seconds,
      federation_enabled: stateSiteForm.federation_enabled,
      captcha_enabled: stateSiteForm.captcha_enabled,
      captcha_difficulty: stateSiteForm.captcha_difficulty,
      discussion_languages: stateSiteForm.discussion_languages,
    };
    i.props.onCreate?.(form);
  }
}

function handleSiteNameChange(i: SiteForm, event: FormEvent<HTMLInputElement>) {
  i.setState(s => ((s.siteForm.name = event.target.value), s));
}

function handleSiteSidebarChange(i: SiteForm, val: string) {
  i.setState(s => ((s.siteForm.sidebar = val), s));
}

function handleSiteLegalInfoChange(i: SiteForm, val: string) {
  i.setState(s => ((s.siteForm.legal_information = val), s));
}

function handleDefaultItemsPerPageChange(
  i: SiteForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(
    s => ((s.siteForm.default_items_per_page = Number(event.target.value)), s),
  );
}

function handleSiteApplicationQuestionChange(i: SiteForm, val: string) {
  i.setState(s => ((s.siteForm.application_question = val), s));
}

function handleSiteSummaryChange(
  i: SiteForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.siteForm.summary = event.target.value), s));
}

function handleSiteEnableNsfwChange(i: SiteForm, val: boolean) {
  const newState = i.state;
  newState.siteForm.disallow_nsfw_content = val;
  if (val) {
    newState.siteForm.content_warning = "";
  }
  i.setState(newState);
}

function handleSiteRegistrationModeChange(i: SiteForm, val: RegistrationMode) {
  i.setState(s => ((s.siteForm.registration_mode = val), s));
}

function handleSiteOauthRegistration(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.oauth_registration = val), s));
}

function handleSiteCommunityCreationAdminOnly(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.community_creation_admin_only = val), s));
}

function handleSiteVoteModeChange(
  i: SiteForm,
  val: FederationMode,
  voteKind: `${"post" | "comment"}_${"upvotes" | "downvotes"}`,
) {
  const newState = i.state;
  newState.siteForm[voteKind] = val;
  i.setState(newState);
}

function handleSiteRequireEmailVerification(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.require_email_verification = val), s));
}

function handleSiteApplicationEmailAdmins(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.application_email_admins = val), s));
}

function handleSiteDisableEmailNotifications(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.disable_email_notifications = val), s));
}

function handleSiteReportsEmailAdmins(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.reports_email_admins = val), s));
}

function handleSitePrivateInstance(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.private_instance = val), s));
}

function handleSiteDefaultTheme(i: SiteForm, val: string) {
  i.setState(s => ((s.siteForm.default_theme = val), s));
}

function handleIconChange(i: SiteForm, url?: string) {
  i.setState({ icon: url });
}

function handleBannerChange(i: SiteForm, url?: string) {
  i.setState({ banner: url });
}

function handleSiteSlurFilterRegex(
  i: SiteForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.siteForm.slur_filter_regex = event.target.value), s));
}

function handleSiteFederationEnabled(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.federation_enabled = val), s));
}

function handleSiteCaptchaEnabled(i: SiteForm, val: boolean) {
  i.setState(s => ((s.siteForm.captcha_enabled = val), s));
}

function handleSiteCaptchaDifficulty(i: SiteForm, val: CaptchaDifficulty) {
  i.setState(s => ((s.siteForm.captcha_difficulty = val), s));
}

function handleDiscussionLanguageChange(i: SiteForm, val: number[]) {
  i.setState(s => ((s.siteForm.discussion_languages = val), s));
}

function handleDefaultPostListingTypeChange(i: SiteForm, val: ListingType) {
  i.setState(s => ((s.siteForm.default_post_listing_type = val), s));
}

function handleCommentSortTypeChange(i: SiteForm, val: CommentSortType) {
  i.setState(s => ((s.siteForm.default_comment_sort_type = val), s));
}

function handlePostSortTypeChange(i: SiteForm, val: PostSortType) {
  i.setState(s => ((s.siteForm.default_post_sort_type = val), s));
}

function handlePostListingModeChange(i: SiteForm, val: PostListingMode) {
  i.setState(s => ((s.siteForm.default_post_listing_mode = val), s));
}

function handlePostTimeRangeChange(i: SiteForm, val: number) {
  i.setState(s => ((s.siteForm.default_post_time_range_seconds = val), s));
}

function handleBlockedUrlsUpdate(i: SiteForm, newBlockedUrls: string[]) {
  i.setState(s => ((s.siteForm.blocked_urls = newBlockedUrls), s));
}

function handleSiteContentWarningChange(i: SiteForm, val: string) {
  i.setState(s => ((s.siteForm.content_warning = val), s));
}
