import { capitalizeFirstLetter, randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CommunityView,
  CommunityVisibility,
  CreateCommunity,
  EditCommunity,
  Language,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { tippyMixin } from "../mixins/tippy-mixin";

interface CommunityFormProps {
  community_view?: CommunityView; // If a community is given, that means this is an edit
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  onCancel?(): any;
  onUpsertCommunity(form: CreateCommunity | EditCommunity): void;
  enableNsfw?: boolean;
  loading?: boolean;
}

interface CommunityFormState {
  form: {
    name?: string;
    title?: string;
    description?: string;
    icon?: string;
    banner?: string;
    nsfw?: boolean;
    posting_restricted_to_mods?: boolean;
    discussion_languages?: number[];
    visibilty?: CommunityVisibility;
  };
  submitted: boolean;
}

@tippyMixin
export class CommunityForm extends Component<
  CommunityFormProps,
  CommunityFormState
> {
  private id = `community-form-${randomStr()}`;

  state: CommunityFormState = {
    form: {},
    submitted: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleCommunityDescriptionChange =
      this.handleCommunityDescriptionChange.bind(this);

    this.handleIconUpload = this.handleIconUpload.bind(this);
    this.handleIconRemove = this.handleIconRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.handleDiscussionLanguageChange =
      this.handleDiscussionLanguageChange.bind(this);

    const cv = this.props.community_view;

    if (cv) {
      this.state = {
        ...this.state,
        form: {
          name: cv.community.name,
          title: cv.community.title,
          description: cv.community.description,
          nsfw: cv.community.nsfw,
          icon: cv.community.icon,
          banner: cv.community.banner,
          posting_restricted_to_mods: cv.community.posting_restricted_to_mods,
          discussion_languages: this.props.communityLanguages,
          visibilty: cv.community.visibility,
        },
      };
    }
  }

  render() {
    return (
      <form
        className="community-form"
        onSubmit={linkEvent(this, this.handleCreateCommunitySubmit)}
      >
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.props.loading &&
            !!(
              this.state.form.name ||
              this.state.form.title ||
              this.state.form.description
            ) &&
            !this.state.submitted
          }
        />
        {!this.props.community_view && (
          <div className="mb-3 row">
            <label
              className="col-12 col-sm-2 col-form-label"
              htmlFor="community-name"
            >
              {I18NextService.i18n.t("name")}
              <span
                className="position-absolute pointer unselectable ms-2 text-muted"
                data-tippy-content={I18NextService.i18n.t("name_explain")}
              >
                <Icon icon="help-circle" classes="icon-inline" />
              </span>
            </label>
            <div className="col-12 col-sm-10">
              <input
                type="text"
                id="community-name"
                className="form-control"
                value={this.state.form.name}
                onInput={linkEvent(this, this.handleCommunityNameChange)}
                required
                minLength={3}
                pattern="[a-z0-9_]+"
                title={I18NextService.i18n.t("community_reqs")}
              />
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <label
            className="col-12 col-sm-2 col-form-label"
            htmlFor="community-title"
          >
            {I18NextService.i18n.t("display_name")}
            <span
              className="position-absolute pointer unselectable ms-2 text-muted"
              data-tippy-content={I18NextService.i18n.t("display_name_explain")}
            >
              <Icon icon="help-circle" classes="icon-inline" />
            </span>
          </label>
          <div className="col-12 col-sm-10">
            <input
              type="text"
              id="community-title"
              value={this.state.form.title}
              onInput={linkEvent(this, this.handleCommunityTitleChange)}
              className="form-control"
              required
              minLength={3}
              maxLength={100}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-sm-2 col-form-label">
            {I18NextService.i18n.t("icon")}
          </label>
          <div className="col-12 col-sm-10">
            <ImageUploadForm
              uploadTitle={I18NextService.i18n.t("upload_icon")}
              imageSrc={this.state.form.icon}
              onUpload={this.handleIconUpload}
              onRemove={this.handleIconRemove}
              rounded
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-sm-2 col-form-label">
            {I18NextService.i18n.t("banner")}
          </label>
          <div className="col-12 col-sm-10">
            <ImageUploadForm
              uploadTitle={I18NextService.i18n.t("upload_banner")}
              imageSrc={this.state.form.banner}
              onUpload={this.handleBannerUpload}
              onRemove={this.handleBannerRemove}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-sm-2 col-form-label" htmlFor={this.id}>
            {I18NextService.i18n.t("sidebar")}
          </label>
          <div className="col-12 col-sm-10">
            <MarkdownTextArea
              initialContent={this.state.form.description}
              placeholder={I18NextService.i18n.t("description") ?? undefined}
              onContentChange={this.handleCommunityDescriptionChange}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
            />
          </div>
        </div>

        {this.props.enableNsfw && (
          <div className="mb-3 row">
            <legend className="col-form-label col-sm-2 pt-0">
              {I18NextService.i18n.t("nsfw")}
            </legend>
            <div className="col-10">
              <div className="form-check">
                <input
                  className="form-check-input position-static"
                  id="community-nsfw"
                  type="checkbox"
                  checked={this.state.form.nsfw}
                  onChange={linkEvent(this, this.handleCommunityNsfwChange)}
                />
              </div>
            </div>
          </div>
        )}
        <div className="mb-3 row">
          <legend className="col-form-label col-6 pt-0">
            {I18NextService.i18n.t("community_visibility")}
          </legend>
          <div className="col-6">
            <select
              className="form-select position-static"
              id="community-visibility"
              onChange={linkEvent(this, this.handleCommunityVisibilityChange)}
              value={this.state.form.visibilty ?? "Public"}
            >
              <option value="Public">{I18NextService.i18n.t("public")}</option>
              <option value="LocalOnly">
                {I18NextService.i18n.t("local_only")}
              </option>
            </select>
          </div>
        </div>
        <div className="mb-3 row">
          <legend className="col-form-label col-6 pt-0">
            {I18NextService.i18n.t("only_mods_can_post_in_community")}
          </legend>
          <div className="col-6">
            <div className="form-check">
              <input
                className="form-check-input position-static"
                id="community-only-mods-can-post"
                type="checkbox"
                checked={this.state.form.posting_restricted_to_mods}
                onChange={linkEvent(
                  this,
                  this.handleCommunityPostingRestrictedToMods,
                )}
              />
            </div>
          </div>
        </div>
        <LanguageSelect
          allLanguages={this.props.allLanguages}
          siteLanguages={this.props.siteLanguages}
          showSite
          selectedLanguageIds={this.state.form.discussion_languages}
          multiple={true}
          onChange={this.handleDiscussionLanguageChange}
        />
        <div className="mb-3 row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-secondary me-2"
              disabled={this.props.loading}
            >
              {this.props.loading ? (
                <Spinner />
              ) : this.props.community_view ? (
                capitalizeFirstLetter(I18NextService.i18n.t("save"))
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("create"))
              )}
            </button>
            {this.props.community_view && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={linkEvent(this, this.handleCancel)}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  handleCreateCommunitySubmit(i: CommunityForm, event: any) {
    event.preventDefault();
    i.setState({ submitted: true });
    const cForm = i.state.form;

    const cv = i.props.community_view;

    if (cv) {
      i.props.onUpsertCommunity({
        community_id: cv.community.id,
        title: cForm.title,
        description: cForm.description,
        icon: cForm.icon,
        banner: cForm.banner,
        nsfw: cForm.nsfw,
        posting_restricted_to_mods: cForm.posting_restricted_to_mods,
        discussion_languages: cForm.discussion_languages,
        visibility: cForm.visibilty,
      });
    } else {
      if (cForm.title && cForm.name) {
        i.props.onUpsertCommunity({
          name: cForm.name,
          title: cForm.title,
          description: cForm.description,
          icon: cForm.icon,
          banner: cForm.banner,
          nsfw: cForm.nsfw,
          posting_restricted_to_mods: cForm.posting_restricted_to_mods,
          discussion_languages: cForm.discussion_languages,
          visibility: cForm.visibilty,
        });
      }
    }
  }

  handleCommunityNameChange(i: CommunityForm, event: any) {
    i.setState(s => ((s.form.name = event.target.value), s));
  }

  handleCommunityTitleChange(i: CommunityForm, event: any) {
    i.setState(s => ((s.form.title = event.target.value), s));
  }

  handleCommunityDescriptionChange(val: string) {
    this.setState(s => ((s.form.description = val), s));
  }

  handleCommunityNsfwChange(i: CommunityForm, event: any) {
    i.setState(s => ((s.form.nsfw = event.target.checked), s));
  }

  handleCommunityPostingRestrictedToMods(i: CommunityForm, event: any) {
    i.setState(
      s => ((s.form.posting_restricted_to_mods = event.target.checked), s),
    );
  }

  handleCommunityVisibilityChange(i: CommunityForm, event: any) {
    i.setState(s => ((s.form.visibilty = event.target.value), s));
  }

  handleCancel(i: CommunityForm) {
    i.props.onCancel?.();
  }

  handleIconUpload(url: string) {
    this.setState(s => ((s.form.icon = url), s));
  }

  handleIconRemove() {
    this.setState(s => ((s.form.icon = ""), s));
  }

  handleBannerUpload(url: string) {
    this.setState(s => ((s.form.banner = url), s));
  }

  handleBannerRemove() {
    this.setState(s => ((s.form.banner = ""), s));
  }

  handleDiscussionLanguageChange(val: number[]) {
    this.setState(s => ((s.form.discussion_languages = val), s));
  }
}
