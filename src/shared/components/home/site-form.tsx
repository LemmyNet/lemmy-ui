import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import { CreateSite, EditSite, ListingType, Site } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  authField,
  capitalizeFirstLetter,
  fetchThemeList,
  wsClient,
} from "../../utils";
import { Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface SiteFormProps {
  site?: Site; // If a site is given, that means this is an edit
  showLocal: boolean;
  onCancel?(): any;
  onEdit?(): any;
}

interface SiteFormState {
  siteForm: EditSite;
  loading: boolean;
  themeList: string[];
}

export class SiteForm extends Component<SiteFormProps, SiteFormState> {
  private emptyState: SiteFormState = {
    siteForm: {
      enable_downvotes: true,
      open_registration: true,
      enable_nsfw: true,
      name: null,
      icon: null,
      banner: null,
      require_email_verification: null,
      require_application: null,
      application_question: null,
      private_instance: null,
      default_theme: null,
      default_post_listing_type: null,
      auth: authField(false),
    },
    loading: false,
    themeList: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSiteSidebarChange = this.handleSiteSidebarChange.bind(this);
    this.handleSiteApplicationQuestionChange =
      this.handleSiteApplicationQuestionChange.bind(this);

    this.handleIconUpload = this.handleIconUpload.bind(this);
    this.handleIconRemove = this.handleIconRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.handleDefaultPostListingTypeChange =
      this.handleDefaultPostListingTypeChange.bind(this);

    if (this.props.site) {
      let site = this.props.site;
      this.state.siteForm = {
        name: site.name,
        sidebar: site.sidebar,
        description: site.description,
        enable_downvotes: site.enable_downvotes,
        open_registration: site.open_registration,
        enable_nsfw: site.enable_nsfw,
        community_creation_admin_only: site.community_creation_admin_only,
        icon: site.icon,
        banner: site.banner,
        require_email_verification: site.require_email_verification,
        require_application: site.require_application,
        application_question: site.application_question,
        private_instance: site.private_instance,
        default_theme: site.default_theme,
        default_post_listing_type: site.default_post_listing_type,
        auth: authField(false),
      };
    }
  }

  async componentDidMount() {
    this.state.themeList = await fetchThemeList();
    this.setState(this.state);
  }

  // Necessary to stop the loading
  componentWillReceiveProps() {
    this.state.loading = false;
    this.setState(this.state);
  }

  componentDidUpdate() {
    if (
      !this.state.loading &&
      !this.props.site &&
      (this.state.siteForm.name ||
        this.state.siteForm.sidebar ||
        this.state.siteForm.application_question ||
        this.state.siteForm.description)
    ) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillUnmount() {
    window.onbeforeunload = null;
  }

  render() {
    return (
      <>
        <Prompt
          when={
            !this.state.loading &&
            !this.props.site &&
            (this.state.siteForm.name ||
              this.state.siteForm.sidebar ||
              this.state.siteForm.application_question ||
              this.state.siteForm.description)
          }
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handleCreateSiteSubmit)}>
          <h5>{`${
            this.props.site
              ? capitalizeFirstLetter(i18n.t("save"))
              : capitalizeFirstLetter(i18n.t("name"))
          } ${i18n.t("your_site")}`}</h5>
          <div class="form-group row">
            <label class="col-12 col-form-label" htmlFor="create-site-name">
              {i18n.t("name")}
            </label>
            <div class="col-12">
              <input
                type="text"
                id="create-site-name"
                class="form-control"
                value={this.state.siteForm.name}
                onInput={linkEvent(this, this.handleSiteNameChange)}
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          </div>
          <div class="form-group">
            <label>{i18n.t("icon")}</label>
            <ImageUploadForm
              uploadTitle={i18n.t("upload_icon")}
              imageSrc={this.state.siteForm.icon}
              onUpload={this.handleIconUpload}
              onRemove={this.handleIconRemove}
              rounded
            />
          </div>
          <div class="form-group">
            <label>{i18n.t("banner")}</label>
            <ImageUploadForm
              uploadTitle={i18n.t("upload_banner")}
              imageSrc={this.state.siteForm.banner}
              onUpload={this.handleBannerUpload}
              onRemove={this.handleBannerRemove}
            />
          </div>
          <div class="form-group row">
            <label class="col-12 col-form-label" htmlFor="site-desc">
              {i18n.t("description")}
            </label>
            <div class="col-12">
              <input
                type="text"
                class="form-control"
                id="site-desc"
                value={this.state.siteForm.description}
                onInput={linkEvent(this, this.handleSiteDescChange)}
                maxLength={150}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-12 col-form-label">{i18n.t("sidebar")}</label>
            <div class="col-12">
              <MarkdownTextArea
                initialContent={this.state.siteForm.sidebar}
                onContentChange={this.handleSiteSidebarChange}
                hideNavigationWarnings
              />
            </div>
          </div>
          {this.state.siteForm.require_application && (
            <div class="form-group row">
              <label class="col-12 col-form-label">
                {i18n.t("application_questionnaire")}
              </label>
              <div class="col-12">
                <MarkdownTextArea
                  initialContent={this.state.siteForm.application_question}
                  onContentChange={this.handleSiteApplicationQuestionChange}
                  hideNavigationWarnings
                />
              </div>
            </div>
          )}
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-downvotes"
                  type="checkbox"
                  checked={this.state.siteForm.enable_downvotes}
                  onChange={linkEvent(
                    this,
                    this.handleSiteEnableDownvotesChange
                  )}
                />
                <label class="form-check-label" htmlFor="create-site-downvotes">
                  {i18n.t("enable_downvotes")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-enable-nsfw"
                  type="checkbox"
                  checked={this.state.siteForm.enable_nsfw}
                  onChange={linkEvent(this, this.handleSiteEnableNsfwChange)}
                />
                <label
                  class="form-check-label"
                  htmlFor="create-site-enable-nsfw"
                >
                  {i18n.t("enable_nsfw")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-open-registration"
                  type="checkbox"
                  checked={this.state.siteForm.open_registration}
                  onChange={linkEvent(
                    this,
                    this.handleSiteOpenRegistrationChange
                  )}
                />
                <label
                  class="form-check-label"
                  htmlFor="create-site-open-registration"
                >
                  {i18n.t("open_registration")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-community-creation-admin-only"
                  type="checkbox"
                  checked={this.state.siteForm.community_creation_admin_only}
                  onChange={linkEvent(
                    this,
                    this.handleSiteCommunityCreationAdminOnly
                  )}
                />
                <label
                  class="form-check-label"
                  htmlFor="create-site-community-creation-admin-only"
                >
                  {i18n.t("community_creation_admin_only")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-require-email-verification"
                  type="checkbox"
                  checked={this.state.siteForm.require_email_verification}
                  onChange={linkEvent(
                    this,
                    this.handleSiteRequireEmailVerification
                  )}
                />
                <label
                  class="form-check-label"
                  htmlFor="create-site-require-email-verification"
                >
                  {i18n.t("require_email_verification")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-require-application"
                  type="checkbox"
                  checked={this.state.siteForm.require_application}
                  onChange={linkEvent(this, this.handleSiteRequireApplication)}
                />
                <label
                  class="form-check-label"
                  htmlFor="create-site-require-application"
                >
                  {i18n.t("require_registration_application")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <label
                class="form-check-label mr-2"
                htmlFor="create-site-default-theme"
              >
                {i18n.t("theme")}
              </label>
              <select
                id="create-site-default-theme"
                value={this.state.siteForm.default_theme}
                onChange={linkEvent(this, this.handleSiteDefaultTheme)}
                class="custom-select w-auto"
              >
                <option value="browser">{i18n.t("browser_default")}</option>
                {this.state.themeList.map(theme => (
                  <option value={theme}>{theme}</option>
                ))}
              </select>
            </div>
          </div>
          {this.props.showLocal && (
            <form className="form-group row">
              <label class="col-sm-3">{i18n.t("listing_type")}</label>
              <div class="col-sm-9">
                <ListingTypeSelect
                  type_={
                    ListingType[this.state.siteForm.default_post_listing_type]
                  }
                  showLocal
                  showSubscribed={false}
                  onChange={this.handleDefaultPostListingTypeChange}
                />
              </div>
            </form>
          )}
          <div class="form-group row">
            <div class="col-12">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="create-site-private-instance"
                  type="checkbox"
                  value={this.state.siteForm.default_theme}
                  onChange={linkEvent(this, this.handleSitePrivateInstance)}
                />
                <label
                  class="form-check-label"
                  htmlFor="create-site-private-instance"
                >
                  {i18n.t("private_instance")}
                </label>
              </div>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-12">
              <button
                type="submit"
                class="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : this.props.site ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("create"))
                )}
              </button>
              {this.props.site && (
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={linkEvent(this, this.handleCancel)}
                >
                  {i18n.t("cancel")}
                </button>
              )}
            </div>
          </div>
        </form>
      </>
    );
  }

  handleCreateSiteSubmit(i: SiteForm, event: any) {
    event.preventDefault();
    i.state.loading = true;
    if (i.props.site) {
      WebSocketService.Instance.send(wsClient.editSite(i.state.siteForm));
      i.props.onEdit();
    } else {
      let form: CreateSite = {
        name: i.state.siteForm.name || "My site",
        ...i.state.siteForm,
      };
      WebSocketService.Instance.send(wsClient.createSite(form));
    }
    i.setState(i.state);
  }

  handleSiteNameChange(i: SiteForm, event: any) {
    i.state.siteForm.name = event.target.value;
    i.setState(i.state);
  }

  handleSiteSidebarChange(val: string) {
    this.state.siteForm.sidebar = val;
    this.setState(this.state);
  }

  handleSiteApplicationQuestionChange(val: string) {
    this.state.siteForm.application_question = val;
    this.setState(this.state);
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

  handleSitePrivateInstance(i: SiteForm, event: any) {
    i.state.siteForm.private_instance = event.target.checked;
    i.setState(i.state);
  }

  handleSiteDefaultTheme(i: SiteForm, event: any) {
    i.state.siteForm.default_theme = event.target.value;
    i.setState(i.state);
  }

  handleCancel(i: SiteForm) {
    i.props.onCancel();
  }

  handleIconUpload(url: string) {
    this.state.siteForm.icon = url;
    this.setState(this.state);
  }

  handleIconRemove() {
    this.state.siteForm.icon = "";
    this.setState(this.state);
  }

  handleBannerUpload(url: string) {
    this.state.siteForm.banner = url;
    this.setState(this.state);
  }

  handleBannerRemove() {
    this.state.siteForm.banner = "";
    this.setState(this.state);
  }

  handleDefaultPostListingTypeChange(val: ListingType) {
    this.state.siteForm.default_post_listing_type =
      ListingType[ListingType[val]];
    this.setState(this.state);
  }
}
