import { Component, linkEvent } from "inferno";
import {
  CreateCustomEmoji,
  DeleteCustomEmoji,
  EditCustomEmoji,
  GetSiteResponse,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { HttpService } from "../../services/HttpService";
import {
  customEmojisLookup,
  myAuthRequired,
  pictrsDeleteToast,
  setIsoData,
  toast,
} from "../../utils";
import { EmojiMart } from "../common/emoji-mart";
import { HtmlTags } from "../common/html-tags";
import { Icon } from "../common/icon";
import { Paginator } from "../common/paginator";

interface EmojiFormProps {
  onEdit(form: EditCustomEmoji): void;
  onCreate(form: CreateCustomEmoji): void;
  onDelete(form: DeleteCustomEmoji): void;
  loading: boolean;
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
    return i18n.t("custom_emojis");
  }

  render() {
    return (
      <div className="col-12">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <h5 className="col-12">{i18n.t("custom_emojis")}</h5>
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
                <th>{i18n.t("column_emoji")}</th>
                <th className="text-right">{i18n.t("column_shortcode")}</th>
                <th className="text-right">{i18n.t("column_category")}</th>
                <th className="text-right d-lg-table-cell d-none">
                  {i18n.t("column_imageurl")}
                </th>
                <th className="text-right">{i18n.t("column_alttext")}</th>
                <th className="text-right d-lg-table-cell">
                  {i18n.t("column_keywords")}
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
                      <label
                        htmlFor={index.toString()}
                        className="pointer text-muted small font-weight-bold"
                      >
                        {cv.image_url.length > 0 && (
                          <img
                            className="icon-emoji-admin"
                            src={cv.image_url}
                          />
                        )}
                        {cv.image_url.length == 0 && (
                          <span className="btn btn-sm btn-secondary">
                            Upload
                          </span>
                        )}
                      </label>
                      <input
                        name={index.toString()}
                        id={index.toString()}
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={linkEvent(
                          { form: this, index: index },
                          this.handleImageUpload
                        )}
                      />
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
                              (cv.changed ? "text-success " : "text-muted ") +
                              "btn btn-link btn-animate"
                            }
                            onClick={linkEvent(
                              { i: this, cv: cv },
                              this.handleEditEmojiClick
                            )}
                            data-tippy-content={i18n.t("save")}
                            aria-label={i18n.t("save")}
                            disabled={
                              this.props.loading ||
                              !this.canEdit(cv) ||
                              !cv.changed
                            }
                          >
                            {/* <Icon
                                                            icon="edit"
                                                            classes={`icon-inline`}
                                                        /> */}
                            Save
                          </button>
                        </span>
                        <button
                          className="btn btn-link btn-animate text-muted"
                          onClick={linkEvent(
                            { i: this, index: index, cv: cv },
                            this.handleDeleteEmojiClick
                          )}
                          data-tippy-content={i18n.t("delete")}
                          aria-label={i18n.t("delete")}
                          disabled={this.props.loading}
                          title={i18n.t("delete")}
                        >
                          <Icon
                            icon="trash"
                            classes={`icon-inline text-danger`}
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
            className="btn btn-sm btn-secondary mr-2"
            onClick={linkEvent(this, this.handleAddEmojiClick)}
          >
            {i18n.t("add_custom_emoji")}
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
    return noEmptyFields && noDuplicateShortCodes;
  }

  getEditTooltip(cv: CustomEmojiViewForm) {
    if (this.canEdit(cv)) return i18n.t("save");
    else return i18n.t("custom_emoji_save_validation");
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
    props: { form: EmojiForm; index: number; overrideValue: string | null },
    event: any
  ) {
    const custom_emojis = [...props.form.state.customEmojis];
    const pagedIndex =
      (props.form.state.page - 1) * props.form.itemsPerPage + props.index;
    const item = {
      ...props.form.state.customEmojis[pagedIndex],
      image_url: props.overrideValue ?? event.target.value,
      changed: true,
    };
    custom_emojis[Number(pagedIndex)] = item;
    props.form.setState({ customEmojis: custom_emojis });
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
    if (d.cv.id != 0) {
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
    const custom_emojis = [...form.state.customEmojis];
    const page =
      1 + Math.floor(form.state.customEmojis.length / form.itemsPerPage);
    const item: CustomEmojiViewForm = {
      id: 0,
      shortcode: "",
      alt_text: "",
      category: "",
      image_url: "",
      keywords: "",
      changed: true,
      page: page,
    };
    custom_emojis.push(item);
    form.setState({ customEmojis: custom_emojis, page: page });
  }

  handleImageUpload(props: { form: EmojiForm; index: number }, event: any) {
    let file: any;
    if (event.target) {
      event.preventDefault();
      file = event.target.files[0];
    } else {
      file = event;
    }

    HttpService.client.uploadImage({ image: file }).then(res => {
      console.log("pictrs upload:");
      console.log(res);
      if (res.state === "success") {
        if (res.data.msg === "ok") {
          pictrsDeleteToast(file.name, res.data.delete_url as string);
        } else {
          toast(JSON.stringify(res), "danger");
          const hash = res.data.files?.at(0)?.file;
          const url = `${res.data.url}/${hash}`;
          props.form.handleEmojiImageUrlChange(
            { form: props.form, index: props.index, overrideValue: url },
            event
          );
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
