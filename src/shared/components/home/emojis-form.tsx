import { capitalizeFirstLetter, randomStr } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import {
  CreateCustomEmoji,
  CustomEmojiId,
  CustomEmojiView,
  DbUrl,
  DeleteCustomEmoji,
  EditCustomEmoji,
} from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { pictrsDeleteToast, toast } from "@utils/app";
import { tippyMixin } from "../mixins/tippy-mixin";
import { Prompt } from "inferno-router";
import { Spinner } from "@components/common/icon";

type EmojiGenericForm = {
  id?: CustomEmojiId;
  category?: string;
  shortcode?: string;
  image_url?: DbUrl;
  alt_text?: string;
  keywords?: Array<string>;
};

interface EmojiFormProps {
  emoji?: CustomEmojiView; // If an emoji is given, this means its an edit.
  onCreate?(form: CreateCustomEmoji): void;
  onEdit?(form: EditCustomEmoji): void;
  onDelete?(form: DeleteCustomEmoji): void;
}

interface EmojiFormState {
  form: EmojiGenericForm;
  bypassNavWarning: boolean;
  loadingImage: boolean;
}

function isEditForm(form: EmojiGenericForm): form is EditCustomEmoji {
  return form.id !== undefined;
}

function isCreateForm(form: EmojiGenericForm): form is CreateCustomEmoji {
  return form.id === undefined;
}

@tippyMixin
export class EmojiForm extends Component<EmojiFormProps, EmojiFormState> {
  state: EmojiFormState = {
    form: this.createFormFromProps(),
    bypassNavWarning: true,
    loadingImage: false,
  };

  createFormFromProps(): EmojiGenericForm {
    if (this.props.emoji) {
      const { custom_emoji, keywords } = this.props.emoji;

      return {
        id: custom_emoji.id,
        category: custom_emoji.category,
        image_url: custom_emoji.image_url,
        alt_text: custom_emoji.alt_text,
        keywords: keywords.map(k => k.keyword),
      };
    } else {
      return {};
    }
  }

  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    const submitTitle = I18NextService.i18n.t(
      this.props.emoji ? "save" : "create",
    );

    const id = randomStr();

    return (
      <div className="home-emojis-form col-12">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={
            !!(
              this.state.form.image_url ||
              this.state.form.alt_text ||
              this.state.form.category ||
              this.state.form.keywords
            ) && !this.state.bypassNavWarning
          }
        />
        <form className="row row-cols-md-auto g-3 mb-3 align-items-center">
          {this.state.form && (
            <div className="col-12">
              <img
                className="icon-emoji-admin"
                src={this.state.form.image_url}
                alt={this.state.form.alt_text}
                aria-label={I18NextService.i18n.t("column_emoji")}
              />
            </div>
          )}
          <div className="col-12">
            <label
              className="btn btn-secondary pointer"
              htmlFor={`file-uploader-${id}`}
              data-tippy-content={I18NextService.i18n.t("upload_image")}
            >
              {this.state.loadingImage ? (
                <Spinner className="me-1" />
              ) : (
                capitalizeFirstLetter(I18NextService.i18n.t("upload"))
              )}
              <input
                name={`file-uploader-${id}`}
                id={`file-uploader-${id}`}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={linkEvent(this, this.handleImageUpload)}
              />
            </label>
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`shortcode-${id}`}>
              {I18NextService.i18n.t("column_shortcode")}
            </label>
            <input
              id={`shortcode-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("column_shortcode")}
              className="form-control"
              value={this.state.form.shortcode}
              onInput={linkEvent(this, this.handleShortCodeChange)}
            />
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`category-${id}`}>
              {I18NextService.i18n.t("column_category")}
            </label>{" "}
            <input
              id={`category-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("column_category")}
              className="form-control"
              value={this.state.form.category}
              onInput={linkEvent(this, this.handleCategoryChange)}
            />
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`image-url-${id}`}>
              {I18NextService.i18n.t("column_imageurl")}
            </label>
            <input
              id={`image-url-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("column_imageurl")}
              className="form-control"
              value={this.state.form.image_url}
              onInput={linkEvent(this, this.handleImageUrlChange)}
            />
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`alt-text-${id}`}>
              {I18NextService.i18n.t("column_alttext")}
            </label>
            <input
              id={`alt-text-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("column_alttext")}
              className="form-control"
              value={this.state.form.alt_text}
              onInput={linkEvent(this, this.handleAltTextChange)}
            />
          </div>
          <div className="col-12">
            <label className="visually-hidden" htmlFor={`keywords-${id}`}>
              {I18NextService.i18n.t("column_keywords")}
            </label>
            <input
              id={`keywords-${id}`}
              type="text"
              placeholder={I18NextService.i18n.t("column_keywords")}
              className="form-control"
              value={this.state.form.keywords?.join(" ")}
              onInput={linkEvent(this, this.handleKeywordsChange)}
            />
          </div>
          <div className="col-12">
            {this.props.emoji && (
              <button
                className="btn btn-danger me-2"
                type="submit"
                onClick={linkEvent(this, this.handleDeleteEmoji)}
              >
                {I18NextService.i18n.t("delete")}
              </button>
            )}
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={!this.enableForm}
              onClick={linkEvent(this, this.handleSubmitEmoji)}
            >
              {submitTitle}
            </button>
          </div>
        </form>
      </div>
    );
  }

  get enableForm() {
    return (
      (this.state.form.category?.length ?? 0) > 0 &&
      (this.state.form.shortcode?.length ?? 0) > 0 &&
      (this.state.form.image_url?.length ?? 0) > 0 &&
      (this.state.form.alt_text?.length ?? 0) > 0 &&
      (this.state.form.keywords?.length ?? 0) > 0
    );
  }

  handleShortCodeChange(i: EmojiForm, event: any) {
    i.setState({
      form: { ...i.state.form, shortcode: event.target.value },
      bypassNavWarning: false,
    });
  }

  handleCategoryChange(i: EmojiForm, event: any) {
    i.setState({
      form: { ...i.state.form, category: event.target.value },
      bypassNavWarning: false,
    });
  }

  handleImageUrlChange(i: EmojiForm, event: any) {
    i.setState({
      form: { ...i.state.form, image_url: event.target.value },
      bypassNavWarning: false,
    });
  }

  handleAltTextChange(i: EmojiForm, event: any) {
    i.setState({
      form: { ...i.state.form, alt_text: event.target.value },
      bypassNavWarning: false,
    });
  }

  handleKeywordsChange(i: EmojiForm, event: any) {
    const keywords: string[] = event.target.value.split(" ");

    i.setState({
      form: { ...i.state.form, keywords },
      bypassNavWarning: false,
    });
  }

  handleDeleteEmoji(i: EmojiForm, event: any) {
    event.preventDefault();
    const id = i.props.emoji?.custom_emoji.id;
    if (id) {
      i.setState({ bypassNavWarning: true });
      i.props.onDelete?.({ id });
    }
  }

  handleSubmitEmoji(i: EmojiForm, event: any) {
    event.preventDefault();

    i.setState({ bypassNavWarning: true });

    const form = i.state.form;
    if (isEditForm(form)) {
      i.props.onEdit?.(form);
    } else if (isCreateForm(form)) {
      i.props.onCreate?.(form);
    }
  }

  handleImageUpload(i: EmojiForm, event: any) {
    let file: File;
    if (event.target) {
      event.preventDefault();
      file = event.target.files[0];
    } else {
      file = event;
    }

    i.setState({ loadingImage: true });

    HttpService.client.uploadImage({ image: file }).then(res => {
      if (res.state === "success") {
        pictrsDeleteToast(res.data.filename);
        i.setState({
          form: { ...i.state.form, image_url: res.data.image_url },
        });
      } else if (res.state === "failed") {
        toast(res.err.name, "danger");
      }
      i.setState({ loadingImage: false });
    });
  }
}
