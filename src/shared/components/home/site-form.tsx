import { Component, InfernoMouseEvent, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CreateSite,
  EditSite,
  GetSiteResponse,
  ListingType,
  RegistrationMode,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  capitalizeFirstLetter,
  fetchThemeList,
  myAuth,
  wsClient,
} from "../../utils";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface SiteFormProps {
  siteRes: GetSiteResponse;
  showLocal?: boolean;
}

interface SiteFormState {
  siteForm: EditSite;
  loading: boolean;
  themeList?: string[];
}

export class SiteForm extends Component<SiteFormProps, SiteFormState> {
  state: SiteFormState = {
    siteForm: {
      auth: "TODO",
    },
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSiteSidebarChange = this.handleSiteSidebarChange.bind(this);
    this.handleSiteLegalInfoChange = this.handleSiteLegalInfoChange.bind(this);
    this.handleSiteApplicationQuestionChange =
      this.handleSiteApplicationQuestionChange.bind(this);

    this.handleIconUpload = this.handleIconUpload.bind(this);
    this.handleIconRemove = this.handleIconRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.handleDefaultPostListingTypeChange =
      this.handleDefaultPostListingTypeChange.bind(this);

    this.handleDiscussionLanguageChange =
      this.handleDiscussionLanguageChange.bind(this);

    let site = this.props.siteRes.site_view.site;
    let ls = this.props.siteRes.site_view.local_site;
    let lsrl = this.props.siteRes.site_view.local_site_rate_limit;
    this.state = {
      ...this.state,
      siteForm: {
        name: site.name,
        sidebar: site.sidebar,
        description: site.description,
        enable_downvotes: ls.enable_downvotes,
        open_registration: ls.registration_mode == RegistrationMode.Open,
        enable_nsfw: ls.enable_nsfw,
        community_creation_admin_only: ls.community_creation_admin_only,
        icon: site.icon,
        banner: site.banner,
        require_email_verification: ls.require_email_verification,
        require_application:
          ls.registration_mode == RegistrationMode.RequireApplication,
        application_question: ls.application_question,
        private_instance: ls.private_instance,
        default_theme: ls.default_theme,
        default_post_listing_type: ls.default_post_listing_type,
        legal_information: ls.legal_information,
        application_email_admins: ls.application_email_admins,
        hide_modlog_mod_names: ls.hide_modlog_mod_names,
        discussion_languages: this.props.siteRes.discussion_languages,
        slur_filter_regex: ls.slur_filter_regex,
        actor_name_max_length: ls.actor_name_max_length,
        rate_limit_message: lsrl.message,
        rate_limit_message_per_second: lsrl.message_per_second,
        rate_limit_comment: lsrl.comment,
        rate_limit_comment_per_second: lsrl.comment_per_second,
        rate_limit_image: lsrl.image,
        rate_limit_image_per_second: lsrl.image_per_second,
        rate_limit_post: lsrl.post,
        rate_limit_post_per_second: lsrl.post_per_second,
        rate_limit_register: lsrl.register,
        rate_limit_register_per_second: lsrl.register_per_second,
        rate_limit_search: lsrl.search,
        rate_limit_search_per_second: lsrl.search_per_second,
        federation_enabled: ls.federation_enabled,
        federation_debug: ls.federation_debug,
        federation_worker_count: ls.federation_worker_count,
        captcha_enabled: ls.captcha_enabled,
        captcha_difficulty: ls.captcha_difficulty,
        allowed_instances: this.props.siteRes.federated_instances?.allowed,
        blocked_instances: this.props.siteRes.federated_instances?.blocked,
        taglines: this.props.siteRes.taglines?.map(x => x.content),
        auth: "TODO",
      },
    };
  }

  async componentDidMount() {
    this.setState({ themeList: await fetchThemeList() });
  }

  // Necessary to stop the loading
  componentWillReceiveProps() {
    this.setState({ loading: false });
  }

  componentDidUpdate() {
    if (
      !this.state.loading &&
      !this.props.siteRes.site_view.local_site.site_setup &&
      (this.state.siteForm.name ||
        this.state.siteForm.sidebar ||
        this.state.siteForm.application_question ||
        this.state.siteForm.description)
    ) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
  }

  componentWillUnmount() {
    window.onbeforeunload = null;
  }

  render() {
    let siteSetup = this.props.siteRes.site_view.local_site.site_setup;
    return (
      <>
        <Prompt
          when={
            !this.state.loading &&
            !siteSetup &&
            (this.state.siteForm.name ||
              this.state.siteForm.sidebar ||
              this.state.siteForm.application_question ||
              this.state.siteForm.description)
          }
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handleCreateSiteSubmit)}>
          <h5>{`${
            siteSetup
              ? capitalizeFirstLetter(i18n.t("save"))
              : capitalizeFirstLetter(i18n.t("name"))
          } ${i18n.t("your_site")}`}</h5>
          <div className="form-group row">
            <label className="col-12 col-form-label" htmlFor="create-site-name">
              {i18n.t("name")}
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
          <div className="form-group">
            <label>{i18n.t("icon")}</label>
            <ImageUploadForm
              uploadTitle={i18n.t("upload_icon")}
              imageSrc={this.state.siteForm.icon}
              onUpload={this.handleIconUpload}
              onRemove={this.handleIconRemove}
              rounded
            />
          </div>
          <div className="form-group">
            <label>{i18n.t("banner")}</label>
            <ImageUploadForm
              uploadTitle={i18n.t("upload_banner")}
              imageSrc={this.state.siteForm.banner}
              onUpload={this.handleBannerUpload}
              onRemove={this.handleBannerRemove}
            />
          </div>
          <div className="form-group row">
            <label className="col-12 col-form-label" htmlFor="site-desc">
              {i18n.t("description")}
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
          <div className="form-group row">
            <label className="col-12 col-form-label">{i18n.t("sidebar")}</label>
            <div className="col-12">
              <MarkdownTextArea
                initialContent={this.state.siteForm.sidebar}
                onContentChange={this.handleSiteSidebarChange}
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-12 col-form-label">
              {i18n.t("legal_information")}
            </label>
            <div className="col-12">
              <MarkdownTextArea
                initialContent={this.state.siteForm.legal_information}
                onContentChange={this.handleSiteLegalInfoChange}
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
              />
            </div>
          </div>
          {this.state.siteForm.require_application && (
            <div className="form-group row">
              <label className="col-12 col-form-label">
                {i18n.t("application_questionnaire")}
              </label>
              <div className="col-12">
                <MarkdownTextArea
                  initialContent={this.state.siteForm.application_question}
                  onContentChange={this.handleSiteApplicationQuestionChange}
                  hideNavigationWarnings
                  allLanguages={[]}
                  siteLanguages={[]}
                />
              </div>
            </div>
          )}
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-downvotes"
                  type="checkbox"
                  checked={this.state.siteForm.enable_downvotes}
                  onChange={linkEvent(
                    this,
                    this.handleSiteEnableDownvotesChange
                  )}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-downvotes"
                >
                  {i18n.t("enable_downvotes")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-enable-nsfw"
                  type="checkbox"
                  checked={this.state.siteForm.enable_nsfw}
                  onChange={linkEvent(this, this.handleSiteEnableNsfwChange)}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-enable-nsfw"
                >
                  {i18n.t("enable_nsfw")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-open-registration"
                  type="checkbox"
                  checked={this.state.siteForm.open_registration}
                  onChange={linkEvent(
                    this,
                    this.handleSiteOpenRegistrationChange
                  )}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-open-registration"
                >
                  {i18n.t("open_registration")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-community-creation-admin-only"
                  type="checkbox"
                  checked={this.state.siteForm.community_creation_admin_only}
                  onChange={linkEvent(
                    this,
                    this.handleSiteCommunityCreationAdminOnly
                  )}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-community-creation-admin-only"
                >
                  {i18n.t("community_creation_admin_only")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-require-email-verification"
                  type="checkbox"
                  checked={this.state.siteForm.require_email_verification}
                  onChange={linkEvent(
                    this,
                    this.handleSiteRequireEmailVerification
                  )}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-require-email-verification"
                >
                  {i18n.t("require_email_verification")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-require-application"
                  type="checkbox"
                  checked={this.state.siteForm.require_application}
                  onChange={linkEvent(this, this.handleSiteRequireApplication)}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-require-application"
                >
                  {i18n.t("require_registration_application")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-application-email-admins"
                  type="checkbox"
                  checked={this.state.siteForm.application_email_admins}
                  onChange={linkEvent(
                    this,
                    this.handleSiteApplicationEmailAdmins
                  )}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-email-admins"
                >
                  {i18n.t("application_email_admins")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <label
                className="form-check-label mr-2"
                htmlFor="create-site-default-theme"
              >
                {i18n.t("theme")}
              </label>
              <select
                id="create-site-default-theme"
                value={this.state.siteForm.default_theme}
                onChange={linkEvent(this, this.handleSiteDefaultTheme)}
                className="custom-select w-auto"
              >
                <option value="browser">{i18n.t("browser_default")}</option>
                {this.state.themeList?.map(theme => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {this.props.showLocal && (
            <form className="form-group row">
              <label className="col-sm-3">{i18n.t("listing_type")}</label>
              <div className="col-sm-9">
                <ListingTypeSelect
                  type_={
                    ListingType[
                      this.state.siteForm.default_post_listing_type ?? "Local"
                    ]
                  }
                  showLocal
                  showSubscribed={false}
                  onChange={this.handleDefaultPostListingTypeChange}
                />
              </div>
            </form>
          )}
          <div className="form-group row">
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
                  {i18n.t("private_instance")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="create-site-hide-modlog-mod-names"
                  type="checkbox"
                  checked={this.state.siteForm.hide_modlog_mod_names}
                  onChange={linkEvent(this, this.handleSiteHideModlogModNames)}
                />
                <label
                  className="form-check-label"
                  htmlFor="create-site-hide-modlog-mod-names"
                >
                  {i18n.t("hide_modlog_mod_names")}
                </label>
              </div>
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-slur-filter-regex"
            >
              {i18n.t("slur_filter_regex")}
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
            allLanguages={this.props.siteRes.all_languages}
            siteLanguages={this.props.siteRes.discussion_languages}
            selectedLanguageIds={this.state.siteForm.discussion_languages}
            multiple={true}
            onChange={this.handleDiscussionLanguageChange}
            showAll
          />
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-actor-name"
            >
              {i18n.t("actor_name_max_length")}
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
          <div className="form-group row">
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
                  {i18n.t("federation_enabled")}
                </label>
              </div>
            </div>
          </div>
          {this.state.siteForm.federation_enabled && (
            <>
              <div className="form-group row">
                <label
                  className="col-12 col-form-label"
                  htmlFor="create-site-allowed-instances"
                >
                  {i18n.t("allowed_instances")}
                </label>
                <div className="col-12">
                  <input
                    type="text"
                    placeholder="instance1.tld,instance2.tld"
                    id="create-site-allowed-instances"
                    className="form-control"
                    value={this.instancesToString(
                      this.state.siteForm.allowed_instances
                    )}
                    onInput={linkEvent(this, this.handleSiteAllowedInstances)}
                  />
                </div>
              </div>
              <div className="form-group row">
                <label
                  className="col-12 col-form-label"
                  htmlFor="create-site-blocked-instances"
                >
                  {i18n.t("blocked_instances")}
                </label>
                <div className="col-12">
                  <input
                    type="text"
                    placeholder="instance1.tld,instance2.tld"
                    id="create-site-blocked-instances"
                    className="form-control"
                    value={this.instancesToString(
                      this.state.siteForm.blocked_instances
                    )}
                    onInput={linkEvent(this, this.handleSiteBlockedInstances)}
                  />
                </div>
              </div>
              <div className="form-group row">
                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      id="create-site-federation-debug"
                      type="checkbox"
                      checked={this.state.siteForm.federation_debug}
                      onChange={linkEvent(this, this.handleSiteFederationDebug)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="create-site-federation-debug"
                    >
                      {i18n.t("federation_debug")}
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-group row">
                <label
                  className="col-12 col-form-label"
                  htmlFor="create-site-federation-worker-count"
                >
                  {i18n.t("federation_worker_count")}
                </label>
                <div className="col-12">
                  <input
                    type="number"
                    id="create-site-federation-worker-count"
                    className="form-control"
                    min={0}
                    value={this.state.siteForm.federation_worker_count}
                    onInput={linkEvent(
                      this,
                      this.handleSiteFederationWorkerCount
                    )}
                  />
                </div>
              </div>
            </>
          )}
          <div className="form-group row">
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
                  {i18n.t("captcha_enabled")}
                </label>
              </div>
            </div>
          </div>
          {this.state.siteForm.captcha_enabled && (
            <div className="form-group row">
              <div className="col-12">
                <label
                  className="form-check-label mr-2"
                  htmlFor="create-site-captcha-difficulty"
                >
                  {i18n.t("captcha_difficulty")}
                </label>
                <select
                  id="create-site-captcha-difficulty"
                  value={this.state.siteForm.captcha_difficulty}
                  onChange={linkEvent(this, this.handleSiteCaptchaDifficulty)}
                  className="custom-select w-auto"
                >
                  <option value="easy">{i18n.t("easy")}</option>
                  <option value="medium">{i18n.t("medium")}</option>
                  <option value="hard">{i18n.t("hard")}</option>
                </select>
              </div>
            </div>
          )}
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-message"
            >
              {i18n.t("rate_limit_message")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-message"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_message}
                onInput={linkEvent(this, this.handleSiteRateLimitMessage)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-message-per-second"
            >
              {i18n.t("per_second")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-message-per-second"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_message_per_second}
                onInput={linkEvent(
                  this,
                  this.handleSiteRateLimitMessagePerSecond
                )}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-post"
            >
              {i18n.t("rate_limit_post")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-post"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_post}
                onInput={linkEvent(this, this.handleSiteRateLimitPost)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-post-per-second"
            >
              {i18n.t("per_second")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-post-per-second"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_post_per_second}
                onInput={linkEvent(this, this.handleSiteRateLimitPostPerSecond)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-register"
            >
              {i18n.t("rate_limit_register")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-register"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_register}
                onInput={linkEvent(this, this.handleSiteRateLimitRegister)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-register-per-second"
            >
              {i18n.t("per_second")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-register-per-second"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_register_per_second}
                onInput={linkEvent(
                  this,
                  this.handleSiteRateLimitRegisterPerSecond
                )}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-image"
            >
              {i18n.t("rate_limit_image")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-image"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_image}
                onInput={linkEvent(this, this.handleSiteRateLimitImage)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-image-per-second"
            >
              {i18n.t("per_second")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-image-per-second"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_image_per_second}
                onInput={linkEvent(
                  this,
                  this.handleSiteRateLimitImagePerSecond
                )}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-comment"
            >
              {i18n.t("rate_limit_comment")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-comment"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_comment}
                onInput={linkEvent(this, this.handleSiteRateLimitComment)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-comment-per-second"
            >
              {i18n.t("per_second")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-comment-per-second"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_comment_per_second}
                onInput={linkEvent(
                  this,
                  this.handleSiteRateLimitCommentPerSecond
                )}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-search"
            >
              {i18n.t("rate_limit_search")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-search"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_search}
                onInput={linkEvent(this, this.handleSiteRateLimitSearch)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-12 col-form-label"
              htmlFor="create-site-rate-limit-search-per-second"
            >
              {i18n.t("per_second")}
            </label>
            <div className="col-12">
              <input
                type="number"
                id="create-site-rate-limit-search-per-second"
                className="form-control"
                min={0}
                value={this.state.siteForm.rate_limit_search_per_second}
                onInput={linkEvent(
                  this,
                  this.handleSiteRateLimitSearchPerSecond
                )}
              />
            </div>
          </div>
          <div className="form-group row">
            <h5 className="col-12">{i18n.t("taglines")}</h5>
            <div className="table-responsive col-12">
              <table id="taglines_table" className="table table-sm table-hover">
                <thead className="pointer"></thead>
                <tbody>
                  {this.state.siteForm.taglines?.map((cv, index) => (
                    <tr key={index}>
                      <td>
                        <MarkdownTextArea
                          initialContent={cv}
                          onContentChange={s =>
                            this.handleTaglineChange(this, index, s)
                          }
                          hideNavigationWarnings
                          allLanguages={this.props.siteRes.all_languages}
                          siteLanguages={
                            this.props.siteRes.discussion_languages
                          }
                        />
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-link btn-animate text-muted"
                          onClick={e =>
                            this.handleDeleteTaglineClick(this, index, e)
                          }
                          data-tippy-content={i18n.t("delete")}
                          aria-label={i18n.t("delete")}
                        >
                          <Icon
                            icon="trash"
                            classes={`icon-inline text-danger`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="btn btn-sm btn-secondary mr-2"
                onClick={e => this.handleAddTaglineClick(this, e)}
              >
                {i18n.t("add_tagline")}
              </button>
            </div>
          </div>
          <div className="form-group row">
            <div className="col-12">
              <button
                type="submit"
                className="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : siteSetup ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("create"))
                )}
              </button>
            </div>
          </div>
        </form>
      </>
    );
  }

  handleCreateSiteSubmit(i: SiteForm, event: any) {
    event.preventDefault();
    i.setState({ loading: true });
    let auth = myAuth() ?? "TODO";
    i.setState(s => ((s.siteForm.auth = auth), s));
    if (i.props.siteRes.site_view.local_site.site_setup) {
      WebSocketService.Instance.send(wsClient.editSite(i.state.siteForm));
    } else {
      let sForm = i.state.siteForm;
      let form: CreateSite = {
        name: sForm.name ?? "My site",
        sidebar: sForm.sidebar,
        description: sForm.description,
        icon: sForm.icon,
        banner: sForm.banner,
        community_creation_admin_only: sForm.community_creation_admin_only,
        enable_nsfw: sForm.enable_nsfw,
        enable_downvotes: sForm.enable_downvotes,
        require_application: sForm.require_application,
        application_question: sForm.application_question,
        open_registration: sForm.open_registration,
        require_email_verification: sForm.require_email_verification,
        private_instance: sForm.private_instance,
        default_theme: sForm.default_theme,
        default_post_listing_type: sForm.default_post_listing_type,
        application_email_admins: sForm.application_email_admins,
        hide_modlog_mod_names: sForm.hide_modlog_mod_names,
        legal_information: sForm.legal_information,
        slur_filter_regex: sForm.slur_filter_regex,
        actor_name_max_length: sForm.actor_name_max_length,
        rate_limit_message: sForm.rate_limit_message,
        rate_limit_message_per_second: sForm.rate_limit_message_per_second,
        rate_limit_comment: sForm.rate_limit_comment,
        rate_limit_comment_per_second: sForm.rate_limit_comment_per_second,
        rate_limit_image: sForm.rate_limit_image,
        rate_limit_image_per_second: sForm.rate_limit_image_per_second,
        rate_limit_post: sForm.rate_limit_post,
        rate_limit_post_per_second: sForm.rate_limit_post_per_second,
        rate_limit_register: sForm.rate_limit_register,
        rate_limit_register_per_second: sForm.rate_limit_register_per_second,
        rate_limit_search: sForm.rate_limit_search,
        rate_limit_search_per_second: sForm.rate_limit_search_per_second,
        federation_enabled: sForm.federation_enabled,
        federation_debug: sForm.federation_debug,
        federation_worker_count: sForm.federation_worker_count,
        captcha_enabled: sForm.captcha_enabled,
        captcha_difficulty: sForm.captcha_difficulty,
        allowed_instances: sForm.allowed_instances,
        blocked_instances: sForm.blocked_instances,
        discussion_languages: sForm.discussion_languages,
        taglines: sForm.taglines,
        auth,
      };
      WebSocketService.Instance.send(wsClient.createSite(form));
    }
    i.setState(i.state);
  }

  instancesToString(opt?: string[]): string {
    return opt ? opt.join(",") : "";
  }

  handleSiteAllowedInstances(i: SiteForm, event: any) {
    let list = splitToList(event.target.value);
    i.setState(s => ((s.siteForm.allowed_instances = list), s));
  }

  handleSiteBlockedInstances(i: SiteForm, event: any) {
    let list = splitToList(event.target.value);
    i.setState(s => ((s.siteForm.blocked_instances = list), s));
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

  handleTaglineChange(i: SiteForm, index: number, val: string) {
    let taglines = i.state.siteForm.taglines;
    if (taglines) {
      taglines[index] = val;
      i.setState(i.state);
    }
  }

  handleDeleteTaglineClick(
    i: SiteForm,
    index: number,
    event: InfernoMouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    let taglines = i.state.siteForm.taglines;
    if (taglines) {
      taglines.splice(index, 1);
      i.state.siteForm.taglines = undefined;
      i.setState(i.state);
      i.state.siteForm.taglines = taglines;
      i.setState(i.state);
    }
  }

  handleAddTaglineClick(
    i: SiteForm,
    event: InfernoMouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    if (!i.state.siteForm.taglines) {
      i.state.siteForm.taglines = [];
    }
    i.state.siteForm.taglines.push("");
    i.setState(i.state);
  }

  handleSiteApplicationQuestionChange(val: string) {
    this.setState(s => ((s.siteForm.application_question = val), s));
  }

  handleSiteDescChange(i: SiteForm, event: any) {
    i.state.siteForm.description = event.target.value;
    i.setState(i.state);
  }

  handleSiteEnableNsfwChange(i: SiteForm, event: any) {
    i.state.siteForm.enable_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleSiteOpenRegistrationChange(i: SiteForm, event: any) {
    i.state.siteForm.open_registration = event.target.checked;
    i.setState(i.state);
  }

  handleSiteCommunityCreationAdminOnly(i: SiteForm, event: any) {
    i.state.siteForm.community_creation_admin_only = event.target.checked;
    i.setState(i.state);
  }

  handleSiteEnableDownvotesChange(i: SiteForm, event: any) {
    i.state.siteForm.enable_downvotes = event.target.checked;
    i.setState(i.state);
  }

  handleSiteRequireApplication(i: SiteForm, event: any) {
    i.state.siteForm.require_application = event.target.checked;
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

  handleSitePrivateInstance(i: SiteForm, event: any) {
    i.state.siteForm.private_instance = event.target.checked;
    i.setState(i.state);
  }

  handleSiteHideModlogModNames(i: SiteForm, event: any) {
    i.state.siteForm.hide_modlog_mod_names = event.target.checked;
    i.setState(i.state);
  }

  handleSiteDefaultTheme(i: SiteForm, event: any) {
    i.state.siteForm.default_theme = event.target.value;
    i.setState(i.state);
  }

  handleIconUpload(url: string) {
    this.setState(s => ((s.siteForm.icon = url), s));
  }

  handleIconRemove() {
    this.setState(s => ((s.siteForm.icon = ""), s));
  }

  handleBannerUpload(url: string) {
    this.setState(s => ((s.siteForm.banner = url), s));
  }

  handleBannerRemove() {
    this.setState(s => ((s.siteForm.banner = ""), s));
  }

  handleSiteSlurFilterRegex(i: SiteForm, event: any) {
    i.setState(s => ((s.siteForm.slur_filter_regex = event.target.value), s));
  }

  handleSiteActorNameMaxLength(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.actor_name_max_length = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitMessage(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.rate_limit_message = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitMessagePerSecond(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.rate_limit_message_per_second = Number(event.target.value)),
        s
      )
    );
  }

  handleSiteRateLimitPost(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.rate_limit_post = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitPostPerSecond(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.rate_limit_post_per_second = Number(event.target.value)), s
      )
    );
  }

  handleSiteRateLimitImage(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.rate_limit_image = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitImagePerSecond(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.rate_limit_image_per_second = Number(event.target.value)), s
      )
    );
  }

  handleSiteRateLimitComment(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.rate_limit_comment = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitCommentPerSecond(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.rate_limit_comment_per_second = Number(event.target.value)),
        s
      )
    );
  }

  handleSiteRateLimitSearch(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.rate_limit_search = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitSearchPerSecond(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.rate_limit_search_per_second = Number(event.target.value)),
        s
      )
    );
  }

  handleSiteRateLimitRegister(i: SiteForm, event: any) {
    i.setState(
      s => ((s.siteForm.rate_limit_register = Number(event.target.value)), s)
    );
  }

  handleSiteRateLimitRegisterPerSecond(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.rate_limit_register_per_second = Number(
          event.target.value
        )),
        s
      )
    );
  }

  handleSiteFederationEnabled(i: SiteForm, event: any) {
    i.state.siteForm.federation_enabled = event.target.checked;
    i.setState(i.state);
  }

  handleSiteFederationDebug(i: SiteForm, event: any) {
    i.state.siteForm.federation_debug = event.target.checked;
    i.setState(i.state);
  }

  handleSiteFederationWorkerCount(i: SiteForm, event: any) {
    i.setState(
      s => (
        (s.siteForm.federation_worker_count = Number(event.target.value)), s
      )
    );
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
    this.setState(
      s => (
        (s.siteForm.default_post_listing_type = ListingType[ListingType[val]]),
        s
      )
    );
  }
}

function splitToList(commaList: string): string[] {
  if (commaList !== "") {
    let list = commaList.trim().split(",");
    return list;
  } else {
    return [];
  }
}
