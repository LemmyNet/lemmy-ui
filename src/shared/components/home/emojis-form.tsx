import { capitalizeFirstLetter } from "@utils/helpers";
import { Component, linkEvent } from "inferno";
import { CustomEmojiView } from "lemmy-js-client";
import { emojiMartCategories, EmojiMartCategory } from "../../markdown";
import { HttpService, I18NextService } from "../../services";
import { pictrsDeleteToast, toast } from "../../toast";
import { EmojiMart } from "../common/emoji-mart";
import { Icon, Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { tippyMixin } from "../mixins/tippy-mixin";
import { isBrowser } from "@utils/browser";
import classNames from "classnames";
import { amAdmin } from "@utils/roles";
import { Prompt } from "inferno-router";

interface EditableEmoji {
  change?: "update" | "delete" | "create";
  emoji: CustomEmojiView;
  loading?: boolean;
}

function markForUpdate(editable: EditableEmoji) {
  if (editable.change !== "create") {
    editable.change = "update";
  }
}

interface EmojiFormState {
  emojis: EditableEmoji[]; // Emojis for the current page
  allEmojis: CustomEmojiView[]; // All emojis for emoji lookup across pages
  emojiMartCustom: EmojiMartCategory[];
  emojiMartKey: number;
  page: number;
  loading: boolean;
}

@tippyMixin
export class EmojiForm extends Component<Record<never, never>, EmojiFormState> {
  private itemsPerPage = 15;
  private needsRefetch = true;
  state: EmojiFormState = {
    emojis: [],
    allEmojis: [],
    emojiMartCustom: [],
    emojiMartKey: 1,
    loading: false,
    page: 1,
  };
  private scrollRef: any = {};
  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleEmojiClick = this.handleEmojiClick.bind(this);
  }

  async componentWillMount() {
    if (isBrowser()) {
      this.handlePageChange(1);
    }
  }

  hasPendingChanges() {
    return this.state.emojis.some(x => x.change);
  }

  render() {
    return (
      <div className="home-emojis-form col-12">
        <Prompt
          message={I18NextService.i18n.t("block_leaving")}
          when={this.hasPendingChanges()}
        />
        <h1 className="h4 mb-4">{I18NextService.i18n.t("custom_emojis")}</h1>
        {this.state.emojiMartCustom.length > 0 && (
          <div>
            <EmojiMart
              key={this.state.emojiMartKey}
              onEmojiClick={this.handleEmojiClick}
              pickerOptions={this.configurePicker()}
            ></EmojiMart>
          </div>
        )}
        <div className="table-responsive">
          <table
            id="emojis_table"
            className="table table-sm table-hover align-middle"
          >
            <thead className="pointer">
              <tr>
                <th>{I18NextService.i18n.t("column_emoji")}</th>
                <th
                  className="text-right"
                  // Upload button
                />
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
                <th></th>
                <th style="width:121px"></th>
              </tr>
            </thead>
            <tbody>
              {this.state.emojis.map((editable: EditableEmoji, index) => {
                const cv = editable.emoji.custom_emoji;
                return (
                  <tr key={index}>
                    <td style="text-align:center;">
                      {cv.image_url.length > 0 && (
                        <img
                          className="icon-emoji-admin"
                          src={cv.image_url}
                          alt={cv.alt_text}
                        />
                      )}
                    </td>
                    <td>
                      {
                        <label
                          // TODO: Fix this linting violation
                          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                          tabIndex={0}
                          className="btn btn-sm btn-secondary pointer"
                          htmlFor={`file-uploader-${index}`}
                          data-tippy-content={I18NextService.i18n.t(
                            "upload_image",
                          )}
                        >
                          {capitalizeFirstLetter(
                            I18NextService.i18n.t("upload"),
                          )}
                          <input
                            name={`file-uploader-${index}`}
                            id={`file-uploader-${index}`}
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={linkEvent(
                              { form: this, index: index },
                              this.handleImageUpload,
                            )}
                          />
                        </label>
                      }
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
                          this.handleEmojiShortCodeChange,
                        )}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        ref={e => (this.scrollRef[cv.shortcode] = e)}
                        type="text"
                        placeholder="Category"
                        className="form-control"
                        value={cv.category}
                        onInput={linkEvent(
                          { form: this, index: index },
                          this.handleEmojiCategoryChange,
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
                          this.handleEmojiImageUrlChange,
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
                          this.handleEmojiAltTextChange,
                        )}
                      />
                    </td>
                    <td className="text-right d-lg-table-cell">
                      <input
                        type="text"
                        placeholder="Keywords"
                        className="form-control"
                        value={editable.emoji.keywords
                          .map(k => k.keyword)
                          .join(" ")}
                        onInput={linkEvent(
                          { form: this, index: index },
                          this.handleEmojiKeywordChange,
                        )}
                      />
                    </td>
                    <td
                      className={classNames("", {
                        "border-info": editable.change === "update",
                        "border-danger": editable.change === "delete",
                        "border-warning": editable.change === "create",
                      })}
                    >
                      {editable.change === "update" && (
                        <span>
                          <Icon icon="transfer" />
                        </span>
                      )}
                      {editable.change === "delete" && (
                        <span>
                          <Icon icon="trash" />
                        </span>
                      )}
                      {editable.change === "create" && (
                        <span>
                          <Icon icon="add" />
                        </span>
                      )}
                    </td>
                    <td>
                      <div class="row flex-nowrap g-0">
                        <span class="col" title={this.getEditTooltip(editable)}>
                          <button
                            className={classNames("btn btn-link btn-animate", {
                              "text-success": this.canSave(editable),
                            })}
                            onClick={linkEvent(
                              { i: this, cv: editable },
                              this.handleSaveEmojiClick,
                            )}
                            data-tippy-content={I18NextService.i18n.t("save")}
                            aria-label={I18NextService.i18n.t("save")}
                            disabled={!this.canSave(editable)}
                          >
                            {editable.loading ? (
                              <Spinner />
                            ) : (
                              capitalizeFirstLetter(
                                I18NextService.i18n.t("save"),
                              )
                            )}
                          </button>
                        </span>
                        <button
                          className="col btn btn-link btn-animate text-muted"
                          onClick={linkEvent(
                            { i: this, index: index, cv: editable },
                            this.handleDeleteEmojiClick,
                          )}
                          data-tippy-content={I18NextService.i18n.t("delete")}
                          aria-label={I18NextService.i18n.t("delete")}
                          disabled={editable.loading}
                          title={I18NextService.i18n.t("delete")}
                        >
                          <Icon
                            icon="trash"
                            classes="icon-inline text-danger"
                          />
                        </button>
                        <button
                          className={classNames(
                            "col btn btn-link btn-animate",
                            {
                              "text-danger": !!editable.change,
                            },
                          )}
                          onClick={linkEvent(
                            { i: this, cv: editable },
                            this.handleCancelEmojiClick,
                          )}
                          data-tippy-content={I18NextService.i18n.t("cancel")}
                          aria-label={I18NextService.i18n.t("cancel")}
                          disabled={!editable.change}
                        >
                          {I18NextService.i18n.t("cancel")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <br />
          <button
            className="btn btn-sm btn-secondary me-2"
            onClick={linkEvent(this, this.handleAddEmojiClick)}
          >
            {I18NextService.i18n.t("add_custom_emoji")}
          </button>

          <Paginator
            page={this.state.page}
            onChange={this.handlePageChange}
            nextDisabled={false}
            disabled={this.hasPendingChanges()}
          />
        </div>
      </div>
    );
  }

  canSave(cv: EditableEmoji) {
    const requiredFields =
      cv.emoji.custom_emoji.image_url.length > 0 &&
      cv.emoji.custom_emoji.shortcode.length > 0;
    return requiredFields && !cv.loading;
  }

  getEditTooltip(cv: EditableEmoji) {
    if (this.canSave(cv)) return I18NextService.i18n.t("save");
    else return I18NextService.i18n.t("custom_emoji_save_validation");
  }

  async handlePageChange(page: number) {
    this.setState({ loading: true });
    let allEmojis: CustomEmojiView[] = this.state.allEmojis;
    let emojiMartCustom: EmojiMartCategory[] = this.state.emojiMartCustom;
    let emojiMartKey: number = this.state.emojiMartKey;
    if (this.needsRefetch) {
      const emojiRes = await HttpService.client.listCustomEmojis({
        ignore_page_limits: true,
      });
      if (emojiRes.state === "success") {
        this.needsRefetch = false;
        allEmojis = emojiRes.data.custom_emojis;
        allEmojis.sort((a, b) => {
          if (a.custom_emoji.category < b.custom_emoji.category) {
            return -1;
          }
          if (a.custom_emoji.category > b.custom_emoji.category) {
            return 1;
          }
          if (a.custom_emoji.shortcode < b.custom_emoji.shortcode) {
            return -1;
          }
          if (a.custom_emoji.shortcode > b.custom_emoji.shortcode) {
            return 1;
          }
          return 0;
        });
      }
      emojiMartCustom = emojiMartCategories(allEmojis);
      emojiMartKey++;
    }
    if (allEmojis) {
      const startIndex = (page - 1) * this.itemsPerPage;
      const emojis = allEmojis
        .slice(startIndex, startIndex + this.itemsPerPage)
        .map(x => ({ emoji: structuredClone(x) })); // clone for restore after cancel
      this.setState({
        loading: false,
        allEmojis,
        emojiMartCustom,
        emojiMartKey,
        emojis,
        page,
      });
    } else {
      this.setState({ loading: false, page });
    }
  }

  async handleEmojiClick(e: any) {
    const emojiIndex = this.state.allEmojis.findIndex(
      x => x.custom_emoji.shortcode === e.id,
    );
    if (emojiIndex >= 0) {
      const { shortcode } = this.state.allEmojis[emojiIndex].custom_emoji;
      const page = Math.floor(emojiIndex / this.itemsPerPage) + 1;
      if (page !== this.state.page) {
        if (
          this.hasPendingChanges() &&
          !confirm(I18NextService.i18n.t("block_leaving"))
        ) {
          return;
        }
        await this.handlePageChange(page);
        await new Promise(r => setTimeout(r));
      }
      if (shortcode) {
        const categoryInput: HTMLInputElement | undefined =
          this.scrollRef[shortcode];
        categoryInput?.focus();
      }
    }
  }

  handleEmojiCategoryChange(
    props: { form: EmojiForm; index: number },
    event: any,
  ) {
    const editable: EditableEmoji = props.form.state.emojis[props.index];
    props.form.setState(() => {
      markForUpdate(editable);
      editable.emoji.custom_emoji.category = event.target.value;
    });
  }

  handleEmojiShortCodeChange(
    props: { form: EmojiForm; index: number },
    event: any,
  ) {
    const editable: EditableEmoji = props.form.state.emojis[props.index];
    props.form.setState(() => {
      markForUpdate(editable);
      editable.emoji.custom_emoji.shortcode = event.target.value;
    });
  }

  handleEmojiImageUrlChange(
    {
      form,
      index,
      overrideValue,
    }: { form: EmojiForm; index: number; overrideValue: string | null },
    event: any,
  ) {
    const editable: EditableEmoji = form.state.emojis[index];
    form.setState(() => {
      markForUpdate(editable);
      editable.emoji.custom_emoji.image_url =
        overrideValue ?? event.target.value;
    });
  }

  handleEmojiAltTextChange(
    props: { form: EmojiForm; index: number },
    event: any,
  ) {
    const editable: EditableEmoji = props.form.state.emojis[props.index];
    props.form.setState(() => {
      markForUpdate(editable);
      editable.emoji.custom_emoji.alt_text = event.target.value;
    });
  }

  handleEmojiKeywordChange(
    props: { form: EmojiForm; index: number },
    event: any,
  ) {
    const editable: EditableEmoji = props.form.state.emojis[props.index];
    props.form.setState(() => {
      markForUpdate(editable);
      editable.emoji.keywords = event.target.value
        .split(" ")
        .map((x: string) => ({ id: -1, keyword: x }));
    });
  }

  handleDeleteEmojiClick(d: {
    i: EmojiForm;
    index: number;
    cv: EditableEmoji;
  }) {
    if (d.cv.change === "create") {
      // This drops the entry immediately, other deletes have to be saved.
      d.i.setState(prev => ({
        emojis: prev.emojis.filter(x => x !== d.cv),
      }));
    } else {
      d.i.setState(() => {
        d.cv.change = "delete";
      });
    }
  }

  async handleSaveEmojiClick(d: { i: EmojiForm; cv: EditableEmoji }) {
    d.i.needsRefetch = true;
    const editable = d.cv;
    if (editable.change === "update") {
      const resp = await HttpService.client.editCustomEmoji({
        ...editable.emoji.custom_emoji,
        keywords: editable.emoji.keywords.map(x => x.keyword),
      });
      if (resp.state === "success") {
        d.i.setState(() => {
          editable.emoji = resp.data.custom_emoji;
          editable.change = undefined;
        });
      }
    } else if (editable.change === "delete") {
      const resp = await HttpService.client.deleteCustomEmoji(
        editable.emoji.custom_emoji,
      );
      if (resp.state === "success") {
        d.i.setState(prev => ({
          emojis: prev.emojis.filter(x => x !== editable),
        }));
      }
    } else if (editable.change === "create") {
      const resp = await HttpService.client.createCustomEmoji({
        ...editable.emoji.custom_emoji,
        keywords: editable.emoji.keywords.map(x => x.keyword),
      });
      if (resp.state === "success") {
        d.i.setState(() => {
          editable.emoji = resp.data.custom_emoji;
          editable.change = undefined;
        });
      }
    }
  }

  async handleCancelEmojiClick(d: { i: EmojiForm; cv: EditableEmoji }) {
    if (d.cv.change === "create") {
      d.i.setState(() => {
        return {
          emojis: d.i.state.emojis.filter(x => x !== d.cv),
        };
      });
    } else if (d.cv.change === "update" || d.cv.change === "delete") {
      const original = d.i.state.allEmojis.find(
        x => x.custom_emoji.id === d.cv.emoji.custom_emoji.id,
      );
      if (original) {
        d.i.setState(() => {
          d.cv.emoji = structuredClone(original);
          d.cv.change = undefined;
        });
      }
    }
  }

  async handleAddEmojiClick(form: EmojiForm, event: any) {
    event.preventDefault();
    form.setState(prev => {
      prev.emojis.push({
        emoji: {
          custom_emoji: {
            id: -1,
            published: "",
            category: "",
            shortcode: "",
            image_url: "",
            alt_text: "",
          },
          keywords: [],
        },
        change: "create",
      });
    });
  }

  handleImageUpload(
    { form, index }: { form: EmojiForm; index: number },
    event: any,
  ) {
    let file: any;
    if (event.target) {
      event.preventDefault();
      file = event.target.files[0];
    } else {
      file = event;
    }

    const editable = form.state.emojis[index];
    form.setState(() => {
      editable.loading = true;
    });

    HttpService.client.uploadImage({ image: file }).then(res => {
      form.setState(() => {
        editable.loading = false;
      });
      if (res.state === "success") {
        if (res.data.msg === "ok") {
          pictrsDeleteToast(file.name, res.data.delete_url as string);
          form.handleEmojiImageUrlChange(
            { form: form, index: index, overrideValue: res.data.url as string },
            event,
          );
        } else if (res.data.msg === "too_large") {
          toast(I18NextService.i18n.t("upload_too_large"), "danger");
        } else {
          toast(JSON.stringify(res), "danger");
        }
      } else if (res.state === "failed") {
        console.error(res.err.message);
        toast(res.err.message, "danger");
      }
    });
  }

  configurePicker(): any {
    const custom = this.state.emojiMartCustom;
    if (process.env["NODE_ENV"] === "development") {
      // Once an emoji-mart Picker is initialized with these options, other
      // instances also only show the custom emojis.
      console.assert(
        amAdmin(),
        "EmojiMart doesn't deal well with differently configured instances.",
      );
    }
    return {
      data: { categories: [], emojis: [], aliases: [] },
      maxFrequentRows: 0,
      dynamicWidth: true,
      custom,
    };
  }
}
