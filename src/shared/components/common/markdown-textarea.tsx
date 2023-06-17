import autosize from "autosize";
import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { Language } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { HttpService, UserService } from "../../services";
import {
  concurrentImageUpload,
  customEmojisLookup,
  markdownFieldCharacterLimit,
  markdownHelpUrl,
  maxUploadImages,
  mdToHtml,
  numToSI,
  pictrsDeleteToast,
  randomStr,
  relTags,
  setupTippy,
  setupTribute,
  toast,
} from "../../utils";
import { isBrowser } from "../../utils/browser/is-browser";
import { EmojiPicker } from "./emoji-picker";
import { Icon, Spinner } from "./icon";
import { LanguageSelect } from "./language-select";
import NavigationPrompt from "./navigation-prompt";
import ProgressBar from "./progress-bar";

interface MarkdownTextAreaProps {
  initialContent?: string;
  initialLanguageId?: number;
  placeholder?: string;
  buttonTitle?: string;
  maxLength?: number;
  replyType?: boolean;
  focus?: boolean;
  disabled?: boolean;
  finished?: boolean;
  showLanguage?: boolean;
  hideNavigationWarnings?: boolean;
  onContentChange?(val: string): void;
  onReplyCancel?(): void;
  onSubmit?(content: string, formId: string, languageId?: number): void;
  allLanguages: Language[]; // TODO should probably be nullable
  siteLanguages: number[]; // TODO same
}

interface ImageUploadStatus {
  total: number;
  uploaded: number;
}

interface MarkdownTextAreaState {
  content?: string;
  languageId?: number;
  previewMode: boolean;
  imageUploadStatus?: ImageUploadStatus;
  loading: boolean;
  submitted: boolean;
}

export class MarkdownTextArea extends Component<
  MarkdownTextAreaProps,
  MarkdownTextAreaState
> {
  private id = `markdown-textarea-${randomStr()}`;
  private formId = `markdown-form-${randomStr()}`;

  private tribute: any;

  state: MarkdownTextAreaState = {
    content: this.props.initialContent,
    languageId: this.props.initialLanguageId,
    previewMode: false,
    loading: false,
    submitted: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleLanguageChange = this.handleLanguageChange.bind(this);

    if (isBrowser()) {
      this.tribute = setupTribute();
    }
  }

  componentDidMount() {
    const textarea: any = document.getElementById(this.id);
    if (textarea) {
      autosize(textarea);
      this.tribute.attach(textarea);
      textarea.addEventListener("tribute-replaced", () => {
        this.setState({ content: textarea.value });
        autosize.update(textarea);
      });

      this.quoteInsert();

      if (this.props.focus) {
        textarea.focus();
      }

      // TODO this is slow for some reason
      setupTippy();
    }
  }

  componentWillReceiveProps(nextProps: MarkdownTextAreaProps) {
    if (nextProps.finished) {
      this.setState({
        previewMode: false,
        imageUploadStatus: undefined,
        loading: false,
        content: undefined,
      });
      if (this.props.replyType) {
        this.props.onReplyCancel?.();
      }

      const textarea: any = document.getElementById(this.id);
      const form: any = document.getElementById(this.formId);
      form.reset();
      setTimeout(() => autosize.update(textarea), 10);
    }
  }

  render() {
    const languageId = this.state.languageId;

    // TODO add these prompts back in at some point
    // <Prompt
    //   when={!this.props.hideNavigationWarnings && this.state.content}
    //   message={i18n.t("block_leaving")}
    // />
    return (
      <form id={this.formId} onSubmit={linkEvent(this, this.handleSubmit)}>
        <NavigationPrompt
          when={
            !this.props.hideNavigationWarnings &&
            !!this.state.content &&
            !this.state.submitted
          }
        />
        <div className="form-group row">
          <div className="col-12">
            <div className="rounded bg-light border border-light">
              <div className="d-flex flex-wrap border-bottom border-light">
                {this.getFormatButton("bold", this.handleInsertBold)}
                {this.getFormatButton("italic", this.handleInsertItalic)}
                {this.getFormatButton("link", this.handleInsertLink)}
                <EmojiPicker
                  onEmojiClick={e => this.handleEmoji(this, e)}
                  disabled={this.isDisabled}
                ></EmojiPicker>
                <form className="btn btn-sm text-muted font-weight-bold">
                  <label
                    htmlFor={`file-upload-${this.id}`}
                    className={`mb-0 ${
                      UserService.Instance.myUserInfo && "pointer"
                    }`}
                    data-tippy-content={i18n.t("upload_image")}
                  >
                    {this.state.imageUploadStatus ? (
                      <Spinner />
                    ) : (
                      <Icon icon="image" classes="icon-inline" />
                    )}
                  </label>
                  <input
                    id={`file-upload-${this.id}`}
                    type="file"
                    accept="image/*,video/*"
                    name="file"
                    className="d-none"
                    multiple
                    disabled={
                      !UserService.Instance.myUserInfo || this.isDisabled
                    }
                    onChange={linkEvent(this, this.handleImageUpload)}
                  />
                </form>
                {this.getFormatButton("header", this.handleInsertHeader)}
                {this.getFormatButton(
                  "strikethrough",
                  this.handleInsertStrikethrough
                )}
                {this.getFormatButton("quote", this.handleInsertQuote)}
                {this.getFormatButton("list", this.handleInsertList)}
                {this.getFormatButton("code", this.handleInsertCode)}
                {this.getFormatButton("subscript", this.handleInsertSubscript)}
                {this.getFormatButton(
                  "superscript",
                  this.handleInsertSuperscript
                )}
                {this.getFormatButton("spoiler", this.handleInsertSpoiler)}
                <a
                  href={markdownHelpUrl}
                  className="btn btn-sm text-muted font-weight-bold"
                  title={i18n.t("formatting_help")}
                  rel={relTags}
                >
                  <Icon icon="help-circle" classes="icon-inline" />
                </a>
              </div>

              <div>
                <textarea
                  id={this.id}
                  className={classNames(
                    "form-control border-0 rounded-top-0 rounded-bottom",
                    {
                      "d-none": this.state.previewMode,
                    }
                  )}
                  value={this.state.content}
                  onInput={linkEvent(this, this.handleContentChange)}
                  onPaste={linkEvent(this, this.handleImageUploadPaste)}
                  onKeyDown={linkEvent(this, this.handleKeyBinds)}
                  required
                  disabled={this.isDisabled}
                  rows={2}
                  maxLength={
                    this.props.maxLength ?? markdownFieldCharacterLimit
                  }
                  placeholder={this.props.placeholder}
                />
                {this.state.previewMode && this.state.content && (
                  <div
                    className="card border-secondary card-body md-div"
                    dangerouslySetInnerHTML={mdToHtml(this.state.content)}
                  />
                )}
                {this.state.imageUploadStatus &&
                  this.state.imageUploadStatus.total > 1 && (
                    <ProgressBar
                      className="mt-2"
                      striped
                      animated
                      value={this.state.imageUploadStatus.uploaded}
                      max={this.state.imageUploadStatus.total}
                      text={i18n.t("pictures_uploded_progess", {
                        uploaded: this.state.imageUploadStatus.uploaded,
                        total: this.state.imageUploadStatus.total,
                      })}
                    />
                  )}
              </div>
              <label className="sr-only" htmlFor={this.id}>
                {i18n.t("body")}
              </label>
            </div>
          </div>

          <div className="col-12 d-flex align-items-center flex-wrap mt-2">
            {this.props.showLanguage && (
              <LanguageSelect
                iconVersion
                allLanguages={this.props.allLanguages}
                selectedLanguageIds={
                  languageId ? Array.of(languageId) : undefined
                }
                siteLanguages={this.props.siteLanguages}
                onChange={this.handleLanguageChange}
                disabled={this.isDisabled}
              />
            )}

            {/* A flex expander */}
            <div className="flex-grow-1"></div>

            {this.props.buttonTitle && (
              <button
                type="submit"
                className="btn btn-sm btn-secondary ml-2"
                disabled={this.isDisabled}
              >
                {this.state.loading ? (
                  <Spinner />
                ) : (
                  <span>{this.props.buttonTitle}</span>
                )}
              </button>
            )}
            {this.props.replyType && (
              <button
                type="button"
                className="btn btn-sm btn-secondary ml-2"
                onClick={linkEvent(this, this.handleReplyCancel)}
              >
                {i18n.t("cancel")}
              </button>
            )}
            {this.state.content && (
              <button
                className={`btn btn-sm btn-secondary ml-2 ${
                  this.state.previewMode && "active"
                }`}
                onClick={linkEvent(this, this.handlePreviewToggle)}
              >
                {this.state.previewMode ? i18n.t("edit") : i18n.t("preview")}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  getFormatButton(
    type: NoOptionI18nKeys,
    handleClick: (i: MarkdownTextArea, event: any) => void
  ) {
    let iconType: string;

    switch (type) {
      case "spoiler": {
        iconType = "alert-triangle";
        break;
      }
      case "quote": {
        iconType = "format_quote";
        break;
      }
      default: {
        iconType = type;
      }
    }

    return (
      <button
        className="btn btn-sm text-muted"
        data-tippy-content={i18n.t(type)}
        aria-label={i18n.t(type)}
        onClick={linkEvent(this, handleClick)}
        disabled={this.isDisabled}
      >
        <Icon icon={iconType} classes="icon-inline" />
      </button>
    );
  }

  handleEmoji(i: MarkdownTextArea, e: any) {
    let value = e.native;
    if (value == null) {
      const emoji = customEmojisLookup.get(e.id)?.custom_emoji;
      if (emoji) {
        value = `![${emoji.alt_text}](${emoji.image_url} "${emoji.shortcode}")`;
      }
    }
    i.setState({
      content: `${i.state.content ?? ""} ${value} `,
    });
    i.contentChange();
    const textarea: any = document.getElementById(i.id);
    autosize.update(textarea);
  }

  handleImageUploadPaste(i: MarkdownTextArea, event: any) {
    const image = event.clipboardData.files[0];
    if (image) {
      i.handleImageUpload(i, image);
    }
  }

  handleImageUpload(i: MarkdownTextArea, event: any) {
    const files: File[] = [];
    if (event.target) {
      event.preventDefault();
      files.push(...event.target.files);
    } else {
      files.push(event);
    }

    if (files.length > maxUploadImages) {
      toast(
        i18n.t("too_many_images_upload", {
          count: Number(maxUploadImages),
          formattedCount: numToSI(maxUploadImages),
        }),
        "danger"
      );
    } else {
      i.setState({
        imageUploadStatus: { total: files.length, uploaded: 0 },
      });

      i.uploadImages(i, files).then(() => {
        i.setState({ imageUploadStatus: undefined });
      });
    }
  }

  async uploadImages(i: MarkdownTextArea, files: File[]) {
    let errorOccurred = false;
    const filesCopy = [...files];
    while (filesCopy.length > 0 && !errorOccurred) {
      try {
        await Promise.all(
          filesCopy.splice(0, concurrentImageUpload).map(async file => {
            await i.uploadSingleImage(i, file);

            this.setState(({ imageUploadStatus }) => ({
              imageUploadStatus: {
                ...(imageUploadStatus as Required<ImageUploadStatus>),
                uploaded: (imageUploadStatus?.uploaded ?? 0) + 1,
              },
            }));
          })
        );
      } catch (e) {
        errorOccurred = true;
      }
    }
  }

  async uploadSingleImage(i: MarkdownTextArea, image: File) {
    const res = await HttpService.client.uploadImage({ image });
    console.log("pictrs upload:");
    console.log(res);
    if (res.state === "success") {
      if (res.data.msg === "ok") {
        const imageMarkdown = `![](${res.data.url})`;
        i.setState(({ content }) => ({
          content: content ? `${content}\n${imageMarkdown}` : imageMarkdown,
        }));
        i.contentChange();
        const textarea: any = document.getElementById(i.id);
        autosize.update(textarea);
        pictrsDeleteToast(image.name, res.data.delete_url as string);
      } else {
        throw JSON.stringify(res.data);
      }
    } else if (res.state === "failed") {
      i.setState({ imageUploadStatus: undefined });
      console.error(res.msg);
      toast(res.msg, "danger");

      throw res.msg;
    }
  }

  contentChange() {
    // Coerces the undefineds to empty strings, for replacing in the DB
    const content = this.state.content ?? "";
    this.props.onContentChange?.(content);
  }

  handleContentChange(i: MarkdownTextArea, event: any) {
    i.setState({ content: event.target.value });
    i.contentChange();
  }

  // Keybind handler
  // Keybinds inspired by github comment area
  handleKeyBinds(i: MarkdownTextArea, event: KeyboardEvent) {
    if (event.ctrlKey) {
      switch (event.key) {
        case "k": {
          i.handleInsertLink(i, event);
          break;
        }
        case "Enter": {
          if (!this.isDisabled) {
            i.handleSubmit(i, event);
          }

          break;
        }
        case "b": {
          i.handleInsertBold(i, event);
          break;
        }
        case "i": {
          i.handleInsertItalic(i, event);
          break;
        }
        case "e": {
          i.handleInsertCode(i, event);
          break;
        }
        case "8": {
          i.handleInsertList(i, event);
          break;
        }
        case "s": {
          i.handleInsertSpoiler(i, event);
          break;
        }
        case "p": {
          if (i.state.content) i.handlePreviewToggle(i, event);
          break;
        }
        case ".": {
          i.handleInsertQuote(i, event);
          break;
        }
      }
    }
  }

  handlePreviewToggle(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.setState({ previewMode: !i.state.previewMode });
  }

  handleLanguageChange(val: number[]) {
    this.setState({ languageId: val[0] });
  }

  handleSubmit(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    if (i.state.content) {
      i.setState({ loading: true, submitted: true });
      i.props.onSubmit?.(i.state.content, i.formId, i.state.languageId);
    }
  }

  handleReplyCancel(i: MarkdownTextArea) {
    i.props.onReplyCancel?.();
  }

  handleInsertLink(i: MarkdownTextArea, event: any) {
    event.preventDefault();

    const textarea: any = document.getElementById(i.id);
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;

    const content = i.state.content ?? "";

    if (!i.state.content) {
      i.setState({ content: "" });
    }

    if (start !== end) {
      const selectedText = content?.substring(start, end);
      i.setState({
        content: `${content?.substring(
          0,
          start
        )}[${selectedText}]()${content?.substring(end)}`,
      });
      textarea.focus();
      setTimeout(() => (textarea.selectionEnd = end + 3), 10);
    } else {
      i.setState({ content: `${content} []()` });
      textarea.focus();
      setTimeout(() => (textarea.selectionEnd -= 1), 10);
    }
    i.contentChange();
  }

  simpleSurround(chars: string) {
    this.simpleSurroundBeforeAfter(chars, chars);
  }

  simpleBeginningofLine(chars: string) {
    this.simpleSurroundBeforeAfter(`${chars}`, "", "");
  }

  simpleSurroundBeforeAfter(
    beforeChars: string,
    afterChars: string,
    emptyChars = "___"
  ) {
    const content = this.state.content ?? "";
    if (!this.state.content) {
      this.setState({ content: "" });
    }
    const textarea: any = document.getElementById(this.id);
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;

    if (start !== end) {
      const selectedText = content?.substring(start, end);
      this.setState({
        content: `${content?.substring(
          0,
          start
        )}${beforeChars}${selectedText}${afterChars}${content?.substring(end)}`,
      });
    } else {
      this.setState({
        content: `${content}${beforeChars}${emptyChars}${afterChars}`,
      });
    }
    this.contentChange();

    textarea.focus();

    if (start !== end) {
      textarea.setSelectionRange(
        start + beforeChars.length,
        end + afterChars.length
      );
    } else {
      textarea.setSelectionRange(
        start + beforeChars.length,
        end + emptyChars.length + afterChars.length
      );
    }

    setTimeout(() => {
      autosize.update(textarea);
    }, 10);
  }

  handleInsertBold(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("**");
  }

  handleInsertItalic(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("*");
  }

  handleInsertCode(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    if (i.getSelectedText().split(/\r*\n/).length > 1) {
      i.simpleSurroundBeforeAfter("```\n", "\n```");
    } else {
      i.simpleSurround("`");
    }
  }

  handleInsertStrikethrough(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("~~");
  }

  handleInsertList(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleBeginningofLine(`-${i.getSelectedText() ? " " : ""}`);
  }

  handleInsertQuote(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleBeginningofLine(">");
  }

  handleInsertHeader(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleBeginningofLine("#");
  }

  handleInsertSubscript(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("~");
  }

  handleInsertSuperscript(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    i.simpleSurround("^");
  }

  simpleInsert(chars: string) {
    const content = this.state.content;
    if (!content) {
      this.setState({ content: `${chars} ` });
    } else {
      this.setState({
        content: `${content}\n${chars} `,
      });
    }

    const textarea: any = document.getElementById(this.id);
    textarea.focus();
    setTimeout(() => {
      autosize.update(textarea);
    }, 10);
    this.contentChange();
  }

  handleInsertSpoiler(i: MarkdownTextArea, event: any) {
    event.preventDefault();
    const beforeChars = `\n::: spoiler ${i18n.t("spoiler")}\n`;
    const afterChars = "\n:::\n";
    i.simpleSurroundBeforeAfter(beforeChars, afterChars);
  }

  quoteInsert() {
    const textarea: any = document.getElementById(this.id);
    const selectedText = window.getSelection()?.toString();
    const { content } = this.state;
    if (selectedText) {
      const quotedText =
        selectedText
          .split("\n")
          .map(t => `> ${t}`)
          .join("\n") + "\n\n";
      if (!content) {
        this.setState({ content: "" });
      } else {
        this.setState({ content: `${content}\n` });
      }
      this.setState({
        content: `${content}${quotedText}`,
      });
      this.contentChange();
      // Not sure why this needs a delay
      setTimeout(() => autosize.update(textarea), 10);
    }
  }

  getSelectedText(): string {
    const { selectionStart: start, selectionEnd: end } =
      document.getElementById(this.id) as any;
    return start !== end ? this.state.content?.substring(start, end) ?? "" : "";
  }

  get isDisabled() {
    return (
      this.state.loading ||
      this.props.disabled ||
      !!this.state.imageUploadStatus
    );
  }
}
