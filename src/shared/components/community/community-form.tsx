import { capitalizeFirstLetter, randomStr } from "@utils/helpers";
import { Component, FormEvent } from "inferno";
import { Prompt } from "inferno-router";
import {
  CommunityView,
  CommunityVisibility,
  CreateCommunity,
  EditCommunity,
  Language,
  MyUserInfo,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { tippyMixin } from "../mixins/tippy-mixin";
import { validActorRegexPattern } from "@utils/config";
import { userNotLoggedInOrBanned } from "@utils/app";

interface CommunityFormProps {
  community_view?: CommunityView; // If a community is given, that means this is an edit
  allLanguages?: Language[];
  siteLanguages?: number[];
  communityLanguages?: number[];
  onCreate?(form: CreateCommunity): void;
  onEdit?(form: EditCommunity): void;
  onDelete?(deleted: boolean): void;
  enableNsfw?: boolean;
  createOrEditLoading?: boolean;
  deleteLoading?: boolean;
  myUserInfo: MyUserInfo | undefined;
}

interface CommunityFormState {
  form: {
    name?: string;
    title?: string;
    sidebar?: string;
    description?: string;
    icon?: string;
    banner?: string;
    nsfw?: boolean;
    posting_restricted_to_mods?: boolean;
    discussion_languages?: number[];
    visibility?: CommunityVisibility;
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
    form: this.initCommunityForm(),
    submitted: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  initCommunityForm() {
    const cv = this.props.community_view;
    return cv
      ? {
          name: cv.community.name,
          title: cv.community.title,
          sidebar: cv.community.sidebar,
          description: cv.community.description,
          nsfw: cv.community.nsfw,
          icon: cv.community.icon,
          banner: cv.community.banner,
          posting_restricted_to_mods: cv.community.posting_restricted_to_mods,
          discussion_languages: this.props.communityLanguages,
          visibilty: cv.community.visibility,
        }
      : {};
  }

  render() {
    return (
      <form
        className="community-form"
        onSubmit={e => handleCommunitySubmit(this, e)}
      >
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !this.props.community_view &&
            (!this.props.createOrEditLoading || !this.props.deleteLoading) &&
            !!(this.state.form.name || this.state.form.title) &&
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
                onInput={e => handleCommunityNameChange(this, e)}
                required
                minLength={3}
                pattern={validActorRegexPattern}
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
              onInput={e => handleCommunityTitleChange(this, e)}
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
            {/* TODO What is going on here, why are there two upload forms with different keys? */}
            {this.props.community_view && (
              <ImageUploadForm
                uploadTitle={I18NextService.i18n.t("upload_icon")}
                imageSrc={this.state.form.icon}
                uploadKey="uploadCommunityIcon"
                removeKey="deleteCommunityIcon"
                communityId={this.props.community_view.community.id}
                onImageChange={src => handleIconChange(this, src)}
                rounded
                disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
              />
            )}
            {!this.props.community_view && (
              <ImageUploadForm
                uploadTitle={I18NextService.i18n.t("upload_icon")}
                imageSrc={this.state.form.icon}
                uploadKey="uploadImage"
                removeKey="deleteMedia"
                onImageChange={src => handleIconChange(this, src)}
                rounded
                disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
                noConfirmation
              />
            )}
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-sm-2 col-form-label">
            {I18NextService.i18n.t("banner")}
          </label>
          <div className="col-12 col-sm-10">
            {this.props.community_view && (
              <ImageUploadForm
                uploadTitle={I18NextService.i18n.t("upload_banner")}
                imageSrc={this.state.form.banner}
                uploadKey="uploadCommunityBanner"
                removeKey="deleteCommunityBanner"
                communityId={this.props.community_view.community.id}
                onImageChange={src => handleBannerChange(this, src)}
                disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
              />
            )}
            {!this.props.community_view && (
              <ImageUploadForm
                uploadTitle={I18NextService.i18n.t("upload_banner")}
                imageSrc={this.state.form.banner}
                uploadKey="uploadImage"
                removeKey="deleteMedia"
                onImageChange={src => handleBannerChange(this, src)}
                disabled={userNotLoggedInOrBanned(this.props.myUserInfo)}
                noConfirmation
              />
            )}
          </div>
        </div>
        <div className="mb-3 row">
          <label
            className="col-12 col-sm-2 col-form-label"
            htmlFor="community-description"
          >
            {I18NextService.i18n.t("description")}
          </label>
          <div className="col-12 col-sm-10">
            <input
              type="text"
              className="form-control"
              id="community-description"
              value={this.state.form.description}
              onInput={e => handleCommunityDescriptionChange(this, e)}
              maxLength={150}
            />
          </div>
        </div>
        <div className="mb-3 row">
          <label className="col-12 col-sm-2 col-form-label" htmlFor={this.id}>
            {I18NextService.i18n.t("sidebar")}
          </label>
          <div className="col-12 col-sm-10">
            <MarkdownTextArea
              initialContent={this.state.form.sidebar}
              placeholder={I18NextService.i18n.t("sidebar") ?? undefined}
              onContentChange={val => handleCommunitySidebarChange(this, val)}
              hideNavigationWarnings
              allLanguages={[]}
              siteLanguages={[]}
              myUserInfo={this.props.myUserInfo}
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
                  onChange={e => handleCommunityNsfwChange(this, e)}
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
              onChange={e => handleCommunityVisibilityChange(this, e)}
              value={this.state.form.visibility ?? "public"}
            >
              <option value="public">
                {I18NextService.i18n.t("community_visibility_public")}
              </option>
              <option value="unlisted">
                {I18NextService.i18n.t("community_visibility_unlisted")}
              </option>
              <option value="local_only_public">
                {I18NextService.i18n.t(
                  "community_visibility_local_only_public",
                )}
              </option>
              <option value="local_only_private">
                {I18NextService.i18n.t(
                  "community_visibility_local_only_private",
                )}
              </option>
              <option value="private">
                {I18NextService.i18n.t("community_visibility_private")}
              </option>
            </select>
          </div>
        </div>
        <div className="mb-3 row">
          <label
            className="col-form-label col-6 pt-0"
            htmlFor="community-only-mods-can-post"
          >
            {I18NextService.i18n.t("only_mods_can_post_in_community")}
          </label>
          <div className="col-6">
            <div className="form-check">
              <input
                className="form-check-input position-static"
                id="community-only-mods-can-post"
                type="checkbox"
                checked={this.state.form.posting_restricted_to_mods}
                onChange={e => handleCommunityPostingRestrictedToMods(this, e)}
              />
            </div>
          </div>
        </div>
        <LanguageSelect
          allLanguages={this.props.allLanguages}
          siteLanguages={this.props.siteLanguages}
          showSite
          selectedLanguageIds={this.state.form.discussion_languages}
          multiple
          onChange={val => handleDiscussionLanguageChange(this, val)}
          myUserInfo={this.props.myUserInfo}
        />
        <div className="mb-3 row">
          <div className="col-12">
            <button
              type="submit"
              className="btn btn-secondary me-2"
              disabled={this.props.createOrEditLoading}
            >
              {this.props.createOrEditLoading ? (
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
                className={`me-2 btn btn-${
                  !this.props.community_view.community.deleted
                    ? "danger"
                    : "success"
                }`}
                onClick={() =>
                  handleDelete(
                    this,
                    !this.props.community_view!.community.deleted,
                  )
                }
                data-tippy-content={
                  !this.props.community_view.community.deleted
                    ? I18NextService.i18n.t("delete")
                    : I18NextService.i18n.t("restore")
                }
                aria-label={
                  !this.props.community_view.community.deleted
                    ? I18NextService.i18n.t("delete")
                    : I18NextService.i18n.t("restore")
                }
              >
                {this.props.deleteLoading ? (
                  <Spinner />
                ) : (
                  I18NextService.i18n.t(
                    !this.props.community_view.community.deleted
                      ? "delete"
                      : "restore",
                  )
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }
}

function handleCommunitySubmit(
  i: CommunityForm,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  i.setState({ submitted: true });
  const cForm = i.state.form;

  const cv = i.props.community_view;

  // If the community is given, its an edit
  if (cv) {
    i.props.onEdit?.({
      community_id: cv.community.id,
      title: cForm.title,
      sidebar: cForm.sidebar,
      description: cForm.description,
      nsfw: cForm.nsfw,
      posting_restricted_to_mods: cForm.posting_restricted_to_mods,
      discussion_languages: cForm.discussion_languages,
      visibility: cForm.visibility,
    });
  } else {
    if (cForm.title && cForm.name) {
      i.props.onCreate?.({
        name: cForm.name,
        title: cForm.title,
        description: cForm.description,
        icon: cForm.icon,
        banner: cForm.banner,
        nsfw: cForm.nsfw,
        posting_restricted_to_mods: cForm.posting_restricted_to_mods,
        discussion_languages: cForm.discussion_languages,
        visibility: cForm.visibility,
      });
    }
  }
}

function handleDelete(i: CommunityForm, deleted: boolean) {
  i.props.onDelete?.(deleted);
}

function handleCommunityNameChange(
  i: CommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.name = event.target.value), s));
}

function handleCommunityTitleChange(
  i: CommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.title = event.target.value), s));
}

function handleCommunityDescriptionChange(
  i: CommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.description = event.target.value), s));
}

function handleCommunitySidebarChange(i: CommunityForm, val: string) {
  i.setState(s => ((s.form.sidebar = val), s));
}

function handleCommunityNsfwChange(
  i: CommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(s => ((s.form.nsfw = event.target.checked), s));
}

function handleCommunityPostingRestrictedToMods(
  i: CommunityForm,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState(
    s => ((s.form.posting_restricted_to_mods = event.target.checked), s),
  );
}

function handleCommunityVisibilityChange(
  i: CommunityForm,
  event: FormEvent<HTMLSelectElement>,
) {
  i.setState(
    s => ((s.form.visibility = event.target.value as CommunityVisibility), s),
  );
}

function handleIconChange(i: CommunityForm, url?: string) {
  i.setState(s => ((s.form.icon = url), s));
}

function handleBannerChange(i: CommunityForm, url?: string) {
  i.setState(s => ((s.form.banner = url), s));
}

function handleDiscussionLanguageChange(i: CommunityForm, val: number[]) {
  i.setState(s => ((s.form.discussion_languages = val), s));
}
