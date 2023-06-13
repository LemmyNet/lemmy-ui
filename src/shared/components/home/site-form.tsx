import {
  Component,
  InfernoKeyboardEvent,
  InfernoMouseEvent,
  linkEvent,
} from "inferno";
import {
  CreateSite,
  EditSite,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  ListingType,
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
import NavigationPrompt from "../common/navigation-prompt";

interface SiteFormProps {
  siteRes: GetSiteResponse;
  instancesRes?: GetFederatedInstancesResponse;
  showLocal?: boolean;
}

interface SiteFormState {
  siteForm: EditSite;
  loading: boolean;
  themeList?: string[];
  instance_select: {
    allowed_instances: string;
    blocked_instances: string;
  };
}

type InstanceKey = "allowed_instances" | "blocked_instances";

export class SiteForm extends Component<SiteFormProps, SiteFormState> {
  state: SiteFormState = {
    siteForm: {
      auth: "TODO",
    },
    loading: false,
    instance_select: {
      allowed_instances: "",
      blocked_instances: "",
    },
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

    const site = this.props.siteRes.site_view.site;
    const ls = this.props.siteRes.site_view.local_site;
    this.state = {
      ...this.state,
      siteForm: {
        name: site.name,
        sidebar: site.sidebar,
        description: site.description,
        enable_downvotes: ls.enable_downvotes,
        registration_mode: ls.registration_mode,
        enable_nsfw: ls.enable_nsfw,
        community_creation_admin_only: ls.community_creation_admin_only,
        icon: site.icon,
        banner: site.banner,
        require_email_verification: ls.require_email_verification,
        application_question: ls.application_question,
        private_instance: ls.private_instance,
        default_theme: ls.default_theme,
        default_post_listing_type: ls.default_post_listing_type,
        legal_information: ls.legal_information,
        application_email_admins: ls.application_email_admins,
        reports_email_admins: ls.reports_email_admins,
        hide_modlog_mod_names: ls.hide_modlog_mod_names,
        discussion_languages: this.props.siteRes.discussion_languages,
        slur_filter_regex: ls.slur_filter_regex,
        actor_name_max_length: ls.actor_name_max_length,
        federation_enabled: ls.federation_enabled,
        federation_debug: ls.federation_debug,
        federation_worker_count: ls.federation_worker_count,
        captcha_enabled: ls.captcha_enabled,
        captcha_difficulty: ls.captcha_difficulty,
        allowed_instances:
          this.props.instancesRes?.federated_instances?.allowed.map(
            i => i.domain
          ),
        blocked_instances:
          this.props.instancesRes?.federated_instances?.blocked.map(
            i => i.domain
          ),
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
    const siteSetup = this.props.siteRes.site_view.local_site.site_setup;
    return (
      <>
        <NavigationPrompt
          when={
            !this.state.loading &&
            !siteSetup &&
            !!(
              this.state.siteForm.name ||
              this.state.siteForm.sidebar ||
              this.state.siteForm.application_question ||
              this.state.siteForm.description
            )
          }
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
              <label
                className="form-check-label mr-2"
                htmlFor="create-site-registration-mode"
              >
                {i18n.t("registration_mode")}
              </label>
              <select
                id="create-site-registration-mode"
                value={this.state.siteForm.registration_mode}
                onChange={linkEvent(
                  this,
                  this.handleSiteRegistrationModeChange
                )}
                className="custom-select w-auto"
              >
                <option value={"RequireApplication"}>
                  {i18n.t("require_registration_application")}
                </option>
                <option value={"Open"}>{i18n.t("open_registration")}</option>
                <option value={"Closed"}>{i18n.t("close_registration")}</option>
              </select>
            </div>
          </div>
          {this.state.siteForm.registration_mode == "RequireApplication" && (
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
                  {i18n.t("reports_email_admins")}
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
                    this.state.siteForm.default_post_listing_type ?? "Local"
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
                {this.federatedInstanceSelect("allowed_instances")}
                {this.federatedInstanceSelect("blocked_instances")}
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

  federatedInstanceSelect(key: InstanceKey) {
    const id = `create_site_${key}`;
    const value = this.state.instance_select[key];
    const selectedInstances = this.state.siteForm[key];
    return (
      <div className="col-12 col-md-6">
        <label className="col-form-label" htmlFor={id}>
          {i18n.t(key)}
        </label>
        <div className="d-flex justify-content-between align-items-center">
          <input
            type="text"
            placeholder="instance.tld"
            id={id}
            className="form-control"
            value={value}
            onInput={linkEvent(key, this.handleInstanceTextChange)}
            onKeyUp={linkEvent(key, this.handleInstanceEnterPress)}
          />
          <button
            type="button"
            className="btn btn-sm bg-success ml-2"
            onClick={linkEvent(key, this.handleAddInstance)}
            tabIndex={
              -1 /* Making this untabble because handling enter key in text input makes keyboard support for this button redundant */
            }
          >
            <Icon icon="add" classes="icon-inline text-light m-auto" />
          </button>
        </div>
        {selectedInstances && selectedInstances.length > 0 && (
          <ul className="mt-3 list-unstyled w-100 d-flex flex-column justify-content-around align-items-center">
            {selectedInstances.map(instance => (
              <li
                key={instance}
                className="my-1 w-100 w-md-75 d-flex align-items-center justify-content-between"
              >
                <label className="d-block m-0 w-100 " htmlFor={instance}>
                  <strong>{instance}</strong>
                </label>
                <button
                  id={instance}
                  type="button"
                  className="btn btn-sm bg-danger"
                  onClick={linkEvent(
                    { key, instance },
                    this.handleRemoveInstance
                  )}
                >
                  <Icon icon="x" classes="icon-inline text-light m-auto" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  handleInstanceTextChange(type: InstanceKey, event: any) {
    this.setState(s => ({
      ...s,
      instance_select: {
        ...s.instance_select,
        [type]: event.target.value,
      },
    }));
  }

  handleInstanceEnterPress(
    key: InstanceKey,
    event: InfernoKeyboardEvent<HTMLInputElement>
  ) {
    if (event.code.toLowerCase() === "enter") {
      event.preventDefault();

      this.handleAddInstance(key);
    }
  }

  handleCreateSiteSubmit(i: SiteForm, event: any) {
    event.preventDefault();
    i.setState({ loading: true });
    const auth = myAuth() ?? "TODO";
    i.setState(s => ((s.siteForm.auth = auth), s));
    if (i.props.siteRes.site_view.local_site.site_setup) {
      WebSocketService.Instance.send(wsClient.editSite(i.state.siteForm));
    } else {
      const sForm = i.state.siteForm;
      const form: CreateSite = {
        name: sForm.name ?? "My site",
        sidebar: sForm.sidebar,
        description: sForm.description,
        icon: sForm.icon,
        banner: sForm.banner,
        community_creation_admin_only: sForm.community_creation_admin_only,
        enable_nsfw: sForm.enable_nsfw,
        enable_downvotes: sForm.enable_downvotes,
        application_question: sForm.application_question,
        registration_mode: sForm.registration_mode,
        require_email_verification: sForm.require_email_verification,
        private_instance: sForm.private_instance,
        default_theme: sForm.default_theme,
        default_post_listing_type: sForm.default_post_listing_type,
        application_email_admins: sForm.application_email_admins,
        hide_modlog_mod_names: sForm.hide_modlog_mod_names,
        legal_information: sForm.legal_information,
        slur_filter_regex: sForm.slur_filter_regex,
        actor_name_max_length: sForm.actor_name_max_length,
        federation_enabled: sForm.federation_enabled,
        federation_debug: sForm.federation_debug,
        federation_worker_count: sForm.federation_worker_count,
        captcha_enabled: sForm.captcha_enabled,
        captcha_difficulty: sForm.captcha_difficulty,
        allowed_instances: sForm.allowed_instances,
        blocked_instances: sForm.blocked_instances,
        discussion_languages: sForm.discussion_languages,
        auth,
      };
      WebSocketService.Instance.send(wsClient.createSite(form));
    }
    i.setState(i.state);
  }

  handleAddInstance(key: InstanceKey) {
    const instance = this.state.instance_select[key].trim();
    if (!this.state.siteForm[key]?.includes(instance)) {
      this.setState(s => ({
        ...s,
        siteForm: {
          ...s.siteForm,
          [key]: [...(s.siteForm[key] ?? []), instance],
        },
        instance_select: {
          ...s.instance_select,
          [key]: "",
        },
      }));

      const oppositeKey: InstanceKey =
        key === "allowed_instances" ? "blocked_instances" : "allowed_instances";
      if (this.state.siteForm[oppositeKey]?.includes(instance)) {
        this.handleRemoveInstance({ key: oppositeKey, instance });
      }
    }
  }

  handleRemoveInstance({
    key,
    instance,
  }: {
    key: InstanceKey;
    instance: string;
  }) {
    this.setState(s => ({
      ...s,
      siteForm: {
        ...s.siteForm,
        [key]: s.siteForm[key]?.filter(i => i !== instance),
      },
    }));
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
    const taglines = i.state.siteForm.taglines;
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
    const taglines = i.state.siteForm.taglines;
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

  handleSiteRegistrationModeChange(i: SiteForm, event: any) {
    i.state.siteForm.registration_mode = event.target.value;
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
    this.setState(s => ((s.siteForm.default_post_listing_type = val), s));
  }
}
