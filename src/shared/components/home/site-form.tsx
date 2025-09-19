import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CreateSite,
  EditSite,
  FederationMode,
  GetSiteResponse,
  ListingType,
  MyUserInfo,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import UrlListTextarea from "../common/url-list-textarea";
import { FormEvent } from "inferno";
import { FederationModeSelect } from "./federation-mode-select";

interface SiteFormProps {
  showLocal?: boolean;
  themeList?: string[];
  onSaveSite(form: EditSite): void;
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
      sidebar: site?.sidebar,
      description: site?.description,
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
      actor_name_max_length: ls?.actor_name_max_length,
      federation_enabled: ls?.federation_enabled,
      captcha_enabled: ls?.captcha_enabled,
      captcha_difficulty: ls?.captcha_difficulty,
      blocked_urls: this.props.siteRes?.blocked_urls.map(u => u.url),
      content_warning: this.props.siteRes?.site_view.site.content_warning,
    };
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSiteSidebarChange = this.handleSiteSidebarChange.bind(this);
    this.handleSiteLegalInfoChange = this.handleSiteLegalInfoChange.bind(this);
    this.handleSiteApplicationQuestionChange =
      this.handleSiteApplicationQuestionChange.bind(this);

    this.handleIconChange = this.handleIconChange.bind(this);
    this.handleBannerChange = this.handleBannerChange.bind(this);

    this.handleDefaultPostListingTypeChange =
      this.handleDefaultPostListingTypeChange.bind(this);

    this.handleDiscussionLanguageChange =
      this.handleDiscussionLanguageChange.bind(this);

    this.handleBlockedUrlsUpdate = this.handleBlockedUrlsUpdate.bind(this);
    this.handleSiteContentWarningChange =
      this.handleSiteContentWarningChange.bind(this);

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
      <form
        className="site-form"
        onSubmit={linkEvent(this, this.handleSaveSiteSubmit)}
      >
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.props.loading &&
            !siteSetup &&
            !!(
              this.state.siteForm.name ||
              this.state.siteForm.sidebar ||
              this.state.siteForm.application_question ||
              this.state.siteForm.description
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
              onInput={linkEvent(this, this.handleSiteNameChange)}
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
              onImageChange={this.handleIconChange}
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
              onImageChange={this.handleBannerChange}
              disabled={!this.props.myUserInfo}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-form-label" htmlFor="site-desc">
            {I18NextService.i18n.t("description")}
          </label>
          <div className="col-12">
            <input
              type="text"
              className="form-control"
              id="site-desc"
              value={this.state.siteForm.description}
              onInput={linkEvent(this, this.handleSiteDescChange)}
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
              onContentChange={this.handleSiteSidebarChange}
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
              onContentChange={this.handleSiteLegalInfoChange}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
              myUserInfo={this.props.myUserInfo}
            />
          </div>
        </div>
        <div className="mb-3 row">
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
            <div className="col-12">
              <label className="form-check-label me-2" htmlFor={vote.kind}>
                {I18NextService.i18n.t(vote.i18nKey)}
              </label>
              <FederationModeSelect
                id={vote.kind}
                current={this.state.siteForm[vote.kind] ?? "All"}
                onChange={linkEvent(
                  { i: this, voteKind: vote.kind },
                  this.handleSiteVoteModeChange,
                )}
              />
            </div>
          ))}
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-enable-nsfw"
                type="checkbox"
                checked={this.state.siteForm.disallow_nsfw_content}
                onChange={linkEvent(this, this.handleSiteEnableNsfwChange)}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-enable-nsfw"
              >
                {I18NextService.i18n.t("disallow_nsfw_content")}
              </label>
            </div>
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
                onContentChange={this.handleSiteContentWarningChange}
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
            <label
              className="form-check-label me-2"
              htmlFor="create-site-registration-mode"
            >
              {I18NextService.i18n.t("registration_mode")}
            </label>
            <select
              id="create-site-registration-mode"
              value={this.state.siteForm.registration_mode}
              onChange={linkEvent(this, this.handleSiteRegistrationModeChange)}
              className="form-select d-inline-block w-auto"
            >
              <option value={"RequireApplication"}>
                {I18NextService.i18n.t("require_registration_application")}
              </option>
              <option value={"Open"}>
                {I18NextService.i18n.t("open_registration")}
              </option>
              <option value={"Closed"}>
                {I18NextService.i18n.t("close_registration")}
              </option>
            </select>
          </div>
        </div>
        {this.state.siteForm.registration_mode === "RequireApplication" && (
          <div className="mb-3 row">
            <label className="col-12 col-form-label">
              {I18NextService.i18n.t("application_questionnaire")}
            </label>
            <div className="col-12">
              <MarkdownTextArea
                initialContent={this.state.siteForm.application_question}
                onContentChange={this.handleSiteApplicationQuestionChange}
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
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-oauth-registration"
                type="checkbox"
                checked={this.state.siteForm.oauth_registration}
                onChange={linkEvent(this, this.handleSiteOauthRegistration)}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-oauth-registration"
              >
                {I18NextService.i18n.t("oauth_registration")}
              </label>
            </div>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-community-creation-admin-only"
                type="checkbox"
                checked={this.state.siteForm.community_creation_admin_only}
                onChange={linkEvent(
                  this,
                  this.handleSiteCommunityCreationAdminOnly,
                )}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-community-creation-admin-only"
              >
                {I18NextService.i18n.t("community_creation_admin_only")}
              </label>
            </div>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-require-email-verification"
                type="checkbox"
                checked={this.state.siteForm.require_email_verification}
                onChange={linkEvent(
                  this,
                  this.handleSiteRequireEmailVerification,
                )}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-require-email-verification"
              >
                {I18NextService.i18n.t("require_email_verification")}
              </label>
            </div>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-application-email-admins"
                type="checkbox"
                checked={this.state.siteForm.application_email_admins}
                onChange={linkEvent(
                  this,
                  this.handleSiteApplicationEmailAdmins,
                )}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-email-admins"
              >
                {I18NextService.i18n.t("application_email_admins")}
              </label>
            </div>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-reports-email-admins"
                type="checkbox"
                checked={this.state.siteForm.reports_email_admins}
                onChange={linkEvent(this, this.handleSiteReportsEmailAdmins)}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-reports-email-admins"
              >
                {I18NextService.i18n.t("reports_email_admins")}
              </label>
            </div>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <label
              className="form-check-label me-2"
              htmlFor="create-site-default-theme"
            >
              {I18NextService.i18n.t("theme")}
            </label>
            <select
              id="create-site-default-theme"
              value={this.state.siteForm.default_theme}
              onChange={linkEvent(this, this.handleSiteDefaultTheme)}
              className="form-select d-inline-block w-auto"
            >
              <option value="instance">
                {I18NextService.i18n.t("theme_instance_default")}
              </option>
              <option value="instance-compact">
                {I18NextService.i18n.t("theme_instance_default_compact")}
              </option>
              {this.props.themeList?.map(theme => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>
        </div>
        {this.props.showLocal && (
          <form className="mb-3 row">
            <label className="col-sm-3 col-form-label">
              {I18NextService.i18n.t("listing_type")}
            </label>
            <div className="col-sm-9">
              <ListingTypeSelect
                type_={this.state.siteForm.default_post_listing_type ?? "Local"}
                showLocal
                showSubscribed={false}
                myUserInfo={this.props.myUserInfo}
                onChange={this.handleDefaultPostListingTypeChange}
              />
            </div>
          </form>
        )}
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-private-instance"
                type="checkbox"
                checked={this.state.siteForm.private_instance}
                onChange={linkEvent(this, this.handleSitePrivateInstance)}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-private-instance"
              >
                {I18NextService.i18n.t("private_instance")}
              </label>
            </div>
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
              onInput={linkEvent(this, this.handleSiteSlurFilterRegex)}
              minLength={3}
            />
          </div>
        </div>
        <LanguageSelect
          allLanguages={this.props.siteRes?.all_languages}
          siteLanguages={this.props.siteRes?.discussion_languages}
          selectedLanguageIds={this.state.siteForm.discussion_languages}
          multiple={true}
          onChange={this.handleDiscussionLanguageChange}
          showAll
          myUserInfo={this.props.myUserInfo}
        />
        <UrlListTextarea
          urls={this.state.siteForm.blocked_urls ?? []}
          onUpdate={this.handleBlockedUrlsUpdate}
        />
        <div className="mb-3 row">
          <label
            className="col-12 col-form-label"
            htmlFor="create-site-actor-name"
          >
            {I18NextService.i18n.t("actor_name_max_length")}
          </label>
          <div className="col-12">
            <input
              type="number"
              id="create-site-actor-name"
              className="form-control"
              min={5}
              value={this.state.siteForm.actor_name_max_length}
              onInput={linkEvent(this, this.handleSiteActorNameMaxLength)}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-federation-enabled"
                type="checkbox"
                checked={this.state.siteForm.federation_enabled}
                onChange={linkEvent(this, this.handleSiteFederationEnabled)}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-federation-enabled"
              >
                {I18NextService.i18n.t("federation_enabled")}
              </label>
            </div>
          </div>
        </div>
        <div className="mb-3 row">
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                id="create-site-captcha-enabled"
                type="checkbox"
                checked={this.state.siteForm.captcha_enabled}
                onChange={linkEvent(this, this.handleSiteCaptchaEnabled)}
              />
              <label
                className="form-check-label"
                htmlFor="create-site-captcha-enabled"
              >
                {I18NextService.i18n.t("captcha_enabled")}
              </label>
            </div>
          </div>
        </div>
        {this.state.siteForm.captcha_enabled && (
          <div className="mb-3 row">
            <div className="col-12">
              <label
                className="form-check-label me-2"
                htmlFor="create-site-captcha-difficulty"
              >
                {I18NextService.i18n.t("captcha_difficulty")}
              </label>
              <select
                id="create-site-captcha-difficulty"
                value={this.state.siteForm.captcha_difficulty}
                onChange={linkEvent(this, this.handleSiteCaptchaDifficulty)}
                className="form-select d-inline-block w-auto"
              >
                <option value="easy">{I18NextService.i18n.t("easy")}</option>
                <option value="medium">
                  {I18NextService.i18n.t("medium")}
                </option>
                <option value="hard">{I18NextService.i18n.t("hard")}</option>
              </select>
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-secondary me-2"
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

  handleSaveSiteSubmit(i: SiteForm, event: any) {
    event.preventDefault();
    i.setState({ submitted: true });

    const stateSiteForm = i.state.siteForm;

    let form: EditSite | CreateSite;

    if (i.props.siteRes?.site_view.local_site.site_setup) {
      form = stateSiteForm;
    } else {
      form = {
        name: stateSiteForm.name ?? "My site",
        sidebar: stateSiteForm.sidebar,
        description: stateSiteForm.description,
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
        actor_name_max_length: stateSiteForm.actor_name_max_length,
        rate_limit_message_max_requests:
          stateSiteForm.rate_limit_message_max_requests,
        rate_limit_message_interval_seconds:
          stateSiteForm.rate_limit_message_interval_seconds,
        rate_limit_post_max_requests:
          stateSiteForm.rate_limit_post_max_requests,
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
    }

    i.props.onSaveSite(form);
  }

  handleSiteNameChange(i: SiteForm, event: any) {
    i.state.siteForm.name = event.target.value;
    i.setState(i.state);
  }

  handleSiteSidebarChange(val: string) {
    this.setState(s => ((s.siteForm.sidebar = val), s));
  }

  handleSiteLegalInfoChange(val: string) {
    this.setState(s => ((s.siteForm.legal_information = val), s));
  }

  handleSiteApplicationQuestionChange(val: string) {
    this.setState(s => ((s.siteForm.application_question = val), s));
  }

  handleSiteDescChange(i: SiteForm, event: any) {
    i.state.siteForm.description = event.target.value;
    i.setState(i.state);
  }

  handleSiteEnableNsfwChange(i: SiteForm, event: any) {
    i.state.siteForm.disallow_nsfw_content = event.target.checked;
    if (event.target.checked) {
      i.state.siteForm.content_warning = "";
    }
    i.setState(i.state);
  }

  handleSiteRegistrationModeChange(i: SiteForm, event: any) {
    i.state.siteForm.registration_mode = event.target.value;
    i.setState(i.state);
  }

  handleSiteOauthRegistration(i: SiteForm, event: any) {
    i.state.siteForm.oauth_registration = event.target.checked;
    i.setState(i.state);
  }

  handleSiteCommunityCreationAdminOnly(i: SiteForm, event: any) {
    i.state.siteForm.community_creation_admin_only = event.target.checked;
    i.setState(i.state);
  }

  handleSiteVoteModeChange(
    {
      i,
      voteKind,
    }: {
      i: SiteForm;
      voteKind: `${"post" | "comment"}_${"upvotes" | "downvotes"}`;
    },
    event: FormEvent<HTMLSelectElement>,
  ) {
    i.state.siteForm[voteKind] = event.target.value as FederationMode;
    i.setState(i.state);
  }

  handleSiteRequireEmailVerification(i: SiteForm, event: any) {
    i.state.siteForm.require_email_verification = event.target.checked;
    i.setState(i.state);
  }

  handleSiteApplicationEmailAdmins(i: SiteForm, event: any) {
    i.state.siteForm.application_email_admins = event.target.checked;
    i.setState(i.state);
  }

  handleSiteReportsEmailAdmins(i: SiteForm, event: any) {
    i.state.siteForm.reports_email_admins = event.target.checked;
    i.setState(i.state);
  }

  handleSitePrivateInstance(i: SiteForm, event: any) {
    i.state.siteForm.private_instance = event.target.checked;
    i.setState(i.state);
  }

  handleSiteDefaultTheme(i: SiteForm, event: any) {
    i.state.siteForm.default_theme = event.target.value;
    i.setState(i.state);
  }

  handleIconChange(url?: string) {
    this.setState({ icon: url });
  }

  handleBannerChange(url?: string) {
    this.setState({ banner: url });
  }

  handleSiteSlurFilterRegex(i: SiteForm, event: any) {
    i.setState(s => ((s.siteForm.slur_filter_regex = event.target.value), s));
  }

  handleSiteActorNameMaxLength(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.actor_name_max_length = Number(event.target.value)), s),
    );
  }

  handleSiteFederationEnabled(i: SiteForm, event: any) {
    i.state.siteForm.federation_enabled = event.target.checked;
    i.setState(i.state);
  }

  handleSiteCaptchaEnabled(i: SiteForm, event: any) {
    i.state.siteForm.captcha_enabled = event.target.checked;
    i.setState(i.state);
  }

  handleSiteCaptchaDifficulty(i: SiteForm, event: any) {
    i.setState(s => ((s.siteForm.captcha_difficulty = event.target.value), s));
  }

  handleDiscussionLanguageChange(val: number[]) {
    this.setState(s => ((s.siteForm.discussion_languages = val), s));
  }

  handleDefaultPostListingTypeChange(val: ListingType) {
    this.setState(s => ((s.siteForm.default_post_listing_type = val), s));
  }

  handleBlockedUrlsUpdate(newBlockedUrls: string[]) {
    this.setState(prev => ({
      ...prev,
      siteForm: {
        ...prev.siteForm,
        blocked_urls: newBlockedUrls,
      },
    }));
  }

  handleSiteContentWarningChange(val: string) {
    this.setState(s => ((s.siteForm.content_warning = val), s));
  }
}
