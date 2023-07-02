import { myAuthRequired, setIsoData } from "@utils/app";
import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import {
  CreateCustomEmoji,
  DeleteCustomEmoji,
  EditCustomEmoji,
  GetSiteResponse,
} from "lemmy-js-client";
import { customEmojisLookup } from "../../markdown";
import { HttpService, I18NextService } from "../../services";
import { pictrsDeleteToast, toast } from "../../toast";
import { EmojiMart } from "../common/emoji-mart";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";

interface EmojiFormProps {
  onEdit(form: EditCustomEmoji): void;
  onCreate(form: CreateCustomEmoji): void;
  onDelete(form: DeleteCustomEmoji): void;
}

interface EmojiFormState {
  siteRes: GetSiteResponse;
  customEmojis: CustomEmojiViewForm[];
  page: number;
}

interface CustomEmojiViewForm {
  id: number;
  category: string;
  shortcode: string;
  image_url: string;
  alt_text: string;
  keywords: string;
  changed: boolean;
  page: number;
  loading: boolean;
}

export class EmojiForm extends Component<EmojiFormProps, EmojiFormState> {
  private isoData = setIsoData(this.context);
  private itemsPerPage = 15;
  private emptyState: EmojiFormState = {
    siteRes: this.isoData.site_res,
    customEmojis: this.isoData.site_res.custom_emojis.map((x, index) => ({
      id: x.custom_emoji.id,
      category: x.custom_emoji.category,
      shortcode: x.custom_emoji.shortcode,
      image_url: x.custom_emoji.image_url,
      alt_text: x.custom_emoji.alt_text,
      keywords: x.keywords.map(x => x.keyword).join(" "),
      changed: false,
      page: 1 + Math.floor(index / this.itemsPerPage),
      loading: false,
    })),
    page: 1,
  };
  state: EmojiFormState;
  private scrollRef: any = {};
  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleEmojiClick = this.handleEmojiClick.bind(this);
  }
  get documentTitle(): string {
    return I18NextService.i18n.t("custom_emojis");
  }

  render() {
    return (
      <div className="home-emojis-form col-12">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <h1 className="h4 mb-4">{I18NextService.i18n.t("custom_emojis")}</h1>
        {customEmojisLookup.size > 0 && (
          <div>
            <EmojiMart
              onEmojiClick={this.handleEmojiClick}
              pickerOptions={this.configurePicker()}
            ></EmojiMart>
          </div>
        )}
        <div className="table-responsive">
          <table id="emojis_table" className="table table-sm table-hover">
            <thead className="pointer">
              <tr>
                <th>{I18NextService.i18n.t("column_emoji")}</th>
                <th className="text-right">
                  {I18NextService.i18n.t("column_shortcode")}
                </th>
                <th className="text-right">
                  {I18NextService.i18n.t("column_category")}
                </th>
                <th className="text-right d-lg-table-cell d-none">
                  {I18NextService.i18n.t("column_imageurl")}
                </th>
                <th className="text-right">
                  {I18NextService.i18n.t("column_alttext")}
                </th>
                <th className="text-right d-lg-table-cell">
                  {I18NextService.i18n.t("column_keywords")}
                </th>
                <th style="width:121px"></th>
              </tr>
            </thead>
            <tbody>
              {this.state.customEmojis
                .slice(
                  Number((this.state.page - 1) * this.itemsPerPage),
                  Number(
                    (this.state.page - 1) * this.itemsPerPage +
                      this.itemsPerPage
                  )
                )
                .map((cv, index) => (
                  <tr key={index} ref={e => (this.scrollRef[cv.shortcode] = e)}>
                    <td style="text-align:center;">
                      {cv.image_url.length > 0 && (
                        <img
                          className="icon-emoji-admin"
                          src={cv.image_url}
                          alt={cv.alt_text}
                        />
                      )}
                      {cv.image_url.length === 0 && (
                        <form>
                          <label
                            className="btn btn-sm btn-secondary pointer"
                            htmlFor={`file-uploader-${index}`}
                            data-tippy-content={I18NextService.i18n.t(
                              "upload_image"
                            )}
                          >
                            {capitalizeFirstLetter(
                              I18NextService.i18n.t("upload")
                            )}
                            <input
                              name={`file-uploader-${index}`}
                              id={`file-uploader-${index}`}
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={linkEvent(
                                { form: this, index: index },
                                this.handleImageUpload
                              )}
                            />
                          </label>
                        </form>
                      )}
                    </td>
                    <td className="text-right">
                      <input
                        type="text"
                        placeholder="ShortCode"
                        className="form-control"
                        disabled={cv.id > 0}
                        value={cv.shortcode}
                        onInput={linkEvent(
                          { form: this, index: index },
                          this.handleEmojiShortCodeChange
                        )}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="text"
                        placeholder="Category"
                        className="form-control"
                        value={cv.category}
                        onInput={linkEvent(
                          { form: this, index: index },
                          this.handleEmojiCategoryChange
                        )}
                      />
                    </td>
                    <td className="text-right d-lg-table-cell d-none">
                      <input
                        type="text"
                        placeholder="Url"
                        className="form-control"
                        value={cv.image_url}
                        onInput={linkEvent(
                          { form: this, index: index, overrideValue: null },
                          this.handleEmojiImageUrlChange
                        )}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="text"
                        placeholder="Alt Text"
                        className="form-control"
                        value={cv.alt_text}
                        onInput={linkEvent(
                          { form: this, index: index },
                          this.handleEmojiAltTextChange
                        )}
                      />
                    </td>
                    <td className="text-right d-lg-table-cell">
                      <input
                        type="text"
                        placeholder="Keywords"
                        className="form-control"
                        value={cv.keywords}
                        onInput={linkEvent(
                          { form: this, index: index },
                          this.handleEmojiKeywordChange
                        )}
                      />
                    </td>
                    <td>
                      <div>
                        <span title={this.getEditTooltip(cv)}>
                          <button
                            className={
                              (this.canEdit(cv)
                                ? "text-success "
                                : "text-muted ") + "btn btn-link btn-animate"
                            }
                            onClick={linkEvent(
                              { i: this, cv: cv },
                              this.handleEditEmojiClick
                            )}
                            data-tippy-content={I18NextService.i18n.t("save")}
                            aria-label={I18NextService.i18n.t("save")}
                            disabled={!this.canEdit(cv)}
                          >
                            {cv.loading ? (
                              <Spinner />
                            ) : (
                              capitalizeFirstLetter(
                                I18NextService.i18n.t("save")
                              )
                            )}
                          </button>
                        </span>
                        <button
                          className="btn btn-link btn-animate text-muted"
                          onClick={linkEvent(
                            { i: this, index: index, cv: cv },
                            this.handleDeleteEmojiClick
                          )}
                          data-tippy-content={I18NextService.i18n.t("delete")}
                          aria-label={I18NextService.i18n.t("delete")}
                          disabled={cv.loading}
                          title={I18NextService.i18n.t("delete")}
                        >
                          <Icon
                            icon="trash"
                            classes="icon-inline text-danger"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <br />
          <button
            className="btn btn-sm btn-secondary me-2"
            onClick={linkEvent(this, this.handleAddEmojiClick)}
          >
            {I18NextService.i18n.t("add_custom_emoji")}
          </button>

          <Paginator page={this.state.page} onChange={this.handlePageChange} />
        </div>
      </div>
    );
  }

  canEdit(cv: CustomEmojiViewForm) {
    const noEmptyFields =
      cv.alt_text.length > 0 &&
      cv.category.length > 0 &&
      cv.image_url.length > 0 &&
      cv.shortcode.length > 0;
    const noDuplicateShortCodes =
      this.state.customEmojis.filter(
        x => x.shortcode == cv.shortcode && x.id != cv.id
      ).length == 0;
    return noEmptyFields && noDuplicateShortCodes && !cv.loading && cv.changed;
  }

  getEditTooltip(cv: CustomEmojiViewForm) {
    if (this.canEdit(cv)) return I18NextService.i18n.t("save");
    else return I18NextService.i18n.t("custom_emoji_save_validation");
  }

  handlePageChange(page: number) {
    this.setState({ page: page });
  }

  handleEmojiClick(e: any) {
    const view = customEmojisLookup.get(e.id);
    if (view) {
      const page = this.state.customEmojis.find(
        x => x.id == view.custom_emoji.id
      )?.page;
      if (page) {
        this.setState({ page: page });
        this.scrollRef[view.custom_emoji.shortcode].scrollIntoView();
      }
    }
  }

  handleEmojiCategoryChange(
    props: { form: EmojiForm; index: number },
    event: any
  ) {
    const custom_emojis = [...props.form.state.customEmojis];
    const pagedIndex =
      (props.form.state.page - 1) * props.form.itemsPerPage + props.index;
    const item = {
      ...props.form.state.customEmojis[pagedIndex],
      category: event.target.value,
      changed: true,
    };
    custom_emojis[Number(pagedIndex)] = item;
    props.form.setState({ customEmojis: custom_emojis });
  }

  handleEmojiShortCodeChange(
    props: { form: EmojiForm; index: number },
    event: any
  ) {
    const custom_emojis = [...props.form.state.customEmojis];
    const pagedIndex =
      (props.form.state.page - 1) * props.form.itemsPerPage + props.index;
    const item = {
      ...props.form.state.customEmojis[pagedIndex],
      shortcode: event.target.value,
      changed: true,
    };
    custom_emojis[Number(pagedIndex)] = item;
    props.form.setState({ customEmojis: custom_emojis });
  }

  handleEmojiImageUrlChange(
    {
      form,
      index,
      overrideValue,
    }: { form: EmojiForm; index: number; overrideValue: string | null },
    event: any
  ) {
    form.setState(prevState => {
      const custom_emojis = [...form.state.customEmojis];
      const pagedIndex = (form.state.page - 1) * form.itemsPerPage + index;
      const item = {
        ...form.state.customEmojis[pagedIndex],
        image_url: overrideValue ?? event.target.value,
        changed: true,
      };
      custom_emojis[Number(pagedIndex)] = item;
      return {
        ...prevState,
        customEmojis: prevState.customEmojis.map((ce, i) =>
          i === pagedIndex
            ? {
                ...ce,
                image_url: overrideValue ?? event.target.value,
                changed: true,
                loading: false,
              }
            : ce
        ),
      };
    });
  }

  handleEmojiAltTextChange(
    props: { form: EmojiForm; index: number },
    event: any
  ) {
    const custom_emojis = [...props.form.state.customEmojis];
    const pagedIndex =
      (props.form.state.page - 1) * props.form.itemsPerPage + props.index;
    const item = {
      ...props.form.state.customEmojis[pagedIndex],
      alt_text: event.target.value,
      changed: true,
    };
    custom_emojis[Number(pagedIndex)] = item;
    props.form.setState({ customEmojis: custom_emojis });
  }

  handleEmojiKeywordChange(
    props: { form: EmojiForm; index: number },
    event: any
  ) {
    const custom_emojis = [...props.form.state.customEmojis];
    const pagedIndex =
      (props.form.state.page - 1) * props.form.itemsPerPage + props.index;
    const item = {
      ...props.form.state.customEmojis[pagedIndex],
      keywords: event.target.value,
      changed: true,
    };
    custom_emojis[Number(pagedIndex)] = item;
    props.form.setState({ customEmojis: custom_emojis });
  }

  handleDeleteEmojiClick(d: {
    i: EmojiForm;
    index: number;
    cv: CustomEmojiViewForm;
  }) {
    const pagedIndex = (d.i.state.page - 1) * d.i.itemsPerPage + d.index;
    if (d.cv.id != 0) {
      d.i.props.onDelete({
        id: d.cv.id,
        auth: myAuthRequired(),
      });
    } else {
      const custom_emojis = [...d.i.state.customEmojis];
      custom_emojis.splice(Number(pagedIndex), 1);
      d.i.setState({ customEmojis: custom_emojis });
    }
  }

  handleEditEmojiClick(d: { i: EmojiForm; cv: CustomEmojiViewForm }) {
    const keywords = d.cv.keywords
      .split(" ")
      .filter(x => x.length > 0) as string[];
    const uniqueKeywords = Array.from(new Set(keywords));
    if (d.cv.id !== 0) {
      d.i.props.onEdit({
        id: d.cv.id,
        category: d.cv.category,
        image_url: d.cv.image_url,
        alt_text: d.cv.alt_text,
        keywords: uniqueKeywords,
        auth: myAuthRequired(),
      });
    } else {
      d.i.props.onCreate({
        category: d.cv.category,
        shortcode: d.cv.shortcode,
        image_url: d.cv.image_url,
        alt_text: d.cv.alt_text,
        keywords: uniqueKeywords,
        auth: myAuthRequired(),
      });
    }
  }

  handleAddEmojiClick(form: EmojiForm, event: any) {
    event.preventDefault();
    form.setState(prevState => {
      const page =
        1 + Math.floor(prevState.customEmojis.length / form.itemsPerPage);
      const item: CustomEmojiViewForm = {
        id: 0,
        shortcode: "",
        alt_text: "",
        category: "",
        image_url: "",
        keywords: "",
        changed: false,
        page: page,
        loading: false,
      };

      return {
        ...prevState,
        customEmojis: [...prevState.customEmojis, item],
        page,
      };
    });
  }

  handleImageUpload(
    { form, index }: { form: EmojiForm; index: number },
    event: any
  ) {
    let file: any;
    if (event.target) {
      event.preventDefault();
      file = event.target.files[0];
    } else {
      file = event;
    }

    form.setState(prevState => ({
      ...prevState,
      customEmojis: prevState.customEmojis.map((cv, i) =>
        i === index ? { ...cv, loading: true } : cv
      ),
    }));

    HttpService.client.uploadImage({ image: file }).then(res => {
      console.log("pictrs upload:");
      console.log(res);
      if (res.state === "success") {
        if (res.data.msg === "ok") {
          pictrsDeleteToast(file.name, res.data.delete_url as string);
          form.handleEmojiImageUrlChange(
            { form: form, index: index, overrideValue: res.data.url as string },
            event
          );
        } else if (res.data.msg === "too_large") {
          toast(I18NextService.i18n.t("upload_too_large"), "danger");
        } else {
          toast(JSON.stringify(res), "danger");
        }
      } else if (res.state === "failed") {
        console.error(res.msg);
        toast(res.msg, "danger");
      }
    });
  }

  configurePicker(): any {
    return {
      data: { categories: [], emojis: [], aliases: [] },
      maxFrequentRows: 0,
      dynamicWidth: true,
    };
  }
}
