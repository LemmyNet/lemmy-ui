import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CreateSite,
  EditSite,
  ListingType,
  Site,
  toUndefined,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import {
  auth,
  capitalizeFirstLetter,
  fetchThemeList,
  wsClient,
} from "../../utils";
import { Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";

interface SiteFormProps {
  site: Option<Site>; // If a site is given, that means this is an edit
  showLocal?: boolean;
  onCancel?(): void;
  onEdit?(): void;
}

interface SiteFormState {
  siteForm: EditSite;
  loading: boolean;
  themeList: Option<string[]>;
}

export class SiteForm extends Component<SiteFormProps, SiteFormState> {
  private emptyState: SiteFormState = {
    siteForm: new EditSite({
      enable_downvotes: Some(true),
      open_registration: Some(true),
      enable_nsfw: Some(true),
      name: None,
      icon: None,
      banner: None,
      require_email_verification: None,
      require_application: None,
      application_question: None,
      private_instance: None,
      default_theme: None,
      sidebar: None,
      default_post_listing_type: None,
      legal_information: None,
      description: None,
      community_creation_admin_only: None,
      auth: undefined,
      hide_modlog_mod_names: Some(true),
    }),
    loading: false,
    themeList: None,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
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

    if (this.props.site.isSome()) {
      let site = this.props.site.unwrap();
      this.state = {
        ...this.state,
        siteForm: new EditSite({
          name: Some(site.name),
          sidebar: site.sidebar,
          description: site.description,
          enable_downvotes: Some(site.enable_downvotes),
          open_registration: Some(site.open_registration),
          enable_nsfw: Some(site.enable_nsfw),
          community_creation_admin_only: Some(
            site.community_creation_admin_only
          ),
          icon: site.icon,
          banner: site.banner,
          require_email_verification: Some(site.require_email_verification),
          require_application: Some(site.require_application),
          application_question: site.application_question,
          private_instance: Some(site.private_instance),
          default_theme: Some(site.default_theme),
          default_post_listing_type: Some(site.default_post_listing_type),
          legal_information: site.legal_information,
          hide_modlog_mod_names: site.hide_modlog_mod_names,
          auth: undefined,
        }),
      };
    }
  }

  async componentDidMount() {
    this.setState({ themeList: Some(await fetchThemeList()) });
  }

  // Necessary to stop the loading
  componentWillReceiveProps() {
    this.setState({ loading: false });
  }

  componentDidUpdate() {
    if (
      !this.state.loading &&
      this.props.site.isNone() &&
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
            this.props.site.isNone() &&
            (this.state.siteForm.name ||
              this.state.siteForm.sidebar ||
              this.state.siteForm.application_question ||
              this.state.siteForm.description)
          }
          message={i18n.t("block_leaving")}
        />
        <form onSubmit={linkEvent(this, this.handleCreateSiteSubmit)}>
          <h5>{`${
            this.props.site.isSome()
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
                value={toUndefined(this.state.siteForm.name)}
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
                value={toUndefined(this.state.siteForm.description)}
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
                placeholder={None}
                buttonTitle={None}
                maxLength={None}
                onContentChange={this.handleSiteSidebarChange}
                hideNavigationWarnings
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
                placeholder={None}
                buttonTitle={None}
                maxLength={None}
                onContentChange={this.handleSiteLegalInfoChange}
                hideNavigationWarnings
              />
            </div>
          </div>
          {this.state.siteForm.require_application.unwrapOr(false) && (
            <div className="form-group row">
              <label className="col-12 col-form-label">
                {i18n.t("application_questionnaire")}
              </label>
              <div className="col-12">
                <MarkdownTextArea
                  initialContent={this.state.siteForm.application_question}
                  placeholder={None}
                  buttonTitle={None}
                  maxLength={None}
                  onContentChange={this.handleSiteApplicationQuestionChange}
                  hideNavigationWarnings
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
                  checked={toUndefined(this.state.siteForm.enable_downvotes)}
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
                  checked={toUndefined(this.state.siteForm.enable_nsfw)}
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
                  checked={toUndefined(this.state.siteForm.open_registration)}
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
                  checked={toUndefined(
                    this.state.siteForm.community_creation_admin_only
                  )}
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
                  checked={toUndefined(
                    this.state.siteForm.require_email_verification
                  )}
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
                  checked={toUndefined(this.state.siteForm.require_application)}
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
              <label
                className="form-check-label mr-2"
                htmlFor="create-site-default-theme"
              >
                {i18n.t("theme")}
              </label>
              <select
                id="create-site-default-theme"
                value={toUndefined(this.state.siteForm.default_theme)}
                onChange={linkEvent(this, this.handleSiteDefaultTheme)}
                className="custom-select w-auto"
              >
                <option value="browser">{i18n.t("browser_default")}</option>
                {this.state.themeList.unwrapOr([]).map(theme => (
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
                      this.state.siteForm.default_post_listing_type.unwrapOr(
                        "Local"
                      )
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
                  checked={toUndefined(this.state.siteForm.private_instance)}
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
                  checked={toUndefined(
                    this.state.siteForm.hide_modlog_mod_names
                  )}
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
            <div className="col-12">
              <button
                type="submit"
                className="btn btn-secondary mr-2"
                disabled={this.state.loading}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : this.props.site.isSome() ? (
                  capitalizeFirstLetter(i18n.t("save"))
                ) : (
                  capitalizeFirstLetter(i18n.t("create"))
                )}
              </button>
              {this.props.site.isSome() && (
                <button
                  type="button"
                  className="btn btn-secondary"
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
    i.setState({ loading: true });
    i.setState(s => ((s.siteForm.auth = auth().unwrap()), s));

    if (i.props.site.isSome()) {
      WebSocketService.Instance.send(wsClient.editSite(i.state.siteForm));
      i.props.onEdit();
    } else {
      let sForm = i.state.siteForm;
      let form = new CreateSite({
        name: sForm.name.unwrapOr("My site"),
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
        auth: auth().unwrap(),
        hide_modlog_mod_names: sForm.hide_modlog_mod_names,
      });
      WebSocketService.Instance.send(wsClient.createSite(form));
    }
    i.setState(i.state);
  }

  handleSiteNameChange(i: SiteForm, event: any) {
    i.state.siteForm.name = Some(event.target.value);
    i.setState(i.state);
  }

  handleSiteSidebarChange(val: string) {
    this.setState(s => ((s.siteForm.sidebar = Some(val)), s));
  }

  handleSiteLegalInfoChange(val: string) {
    this.setState(s => ((s.siteForm.legal_information = Some(val)), s));
  }

  handleSiteApplicationQuestionChange(val: string) {
    this.setState(s => ((s.siteForm.application_question = Some(val)), s));
  }

  handleSiteDescChange(i: SiteForm, event: any) {
    i.state.siteForm.description = Some(event.target.value);
    i.setState(i.state);
  }

  handleSiteEnableNsfwChange(i: SiteForm, event: any) {
    i.state.siteForm.enable_nsfw = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteOpenRegistrationChange(i: SiteForm, event: any) {
    i.state.siteForm.open_registration = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteCommunityCreationAdminOnly(i: SiteForm, event: any) {
    i.state.siteForm.community_creation_admin_only = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteEnableDownvotesChange(i: SiteForm, event: any) {
    i.state.siteForm.enable_downvotes = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteRequireApplication(i: SiteForm, event: any) {
    i.state.siteForm.require_application = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteRequireEmailVerification(i: SiteForm, event: any) {
    i.state.siteForm.require_email_verification = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSitePrivateInstance(i: SiteForm, event: any) {
    i.state.siteForm.private_instance = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteHideModlogModNames(i: SiteForm, event: any) {
    i.state.siteForm.hide_modlog_mod_names = Some(event.target.checked);
    i.setState(i.state);
  }

  handleSiteDefaultTheme(i: SiteForm, event: any) {
    i.state.siteForm.default_theme = Some(event.target.value);
    i.setState(i.state);
  }

  handleCancel(i: SiteForm) {
    i.props.onCancel();
  }

  handleIconUpload(url: string) {
    this.setState(s => ((s.siteForm.icon = Some(url)), s));
  }

  handleIconRemove() {
    this.setState(s => ((s.siteForm.icon = Some("")), s));
  }

  handleBannerUpload(url: string) {
    this.setState(s => ((s.siteForm.banner = Some(url)), s));
  }

  handleBannerRemove() {
    this.setState(s => ((s.siteForm.banner = Some("")), s));
  }

  handleDefaultPostListingTypeChange(val: ListingType) {
    this.setState(
      s => (
        (s.siteForm.default_post_listing_type = Some(
          ListingType[ListingType[val]]
        )),
        s
      )
    );
  }
}
